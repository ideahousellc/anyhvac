import type { EmailReceivedEvent } from "resend";

import {
  InboundMailFailure,
  inboundMailFailureFromUnknown,
  inboundMailFailureRecord,
  logInboundMailFailure,
  type InboundMailFailureLogger,
} from "./diagnostics";
import { ingestInboundEmail } from "./ingest";
import type {
  InboundMailRepository,
  ReceivingClient,
  WebhookVerifier,
} from "./types";

type Environment = Readonly<Record<string, string | undefined>>;

export interface HandlerDependencies {
  environment: Environment;
  verifier: WebhookVerifier;
  createReceivingClient(apiKey: string): ReceivingClient;
  createRepository(): InboundMailRepository;
  logFailure?: InboundMailFailureLogger;
}

const jsonHeaders = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: jsonHeaders });
}

export function createResendWebhookHandler(dependencies: HandlerDependencies) {
  const reportFailure = (failure: InboundMailFailure) => {
    try {
      (dependencies.logFailure ?? logInboundMailFailure)(inboundMailFailureRecord(failure));
    } catch {
      // Diagnostic logging must never change webhook response behavior.
    }
  };

  return async function handleResendWebhook(request: Request): Promise<Response> {
    const secret = dependencies.environment.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) {
      reportFailure(new InboundMailFailure(
        "webhook.verify",
        "Webhook verification is unavailable.",
        "ConfigurationError",
        "missing_webhook_secret",
      ));
      return json({ error: "Webhook service unavailable." }, 503);
    }

    const id = request.headers.get("svix-id")?.trim();
    const timestamp = request.headers.get("svix-timestamp")?.trim();
    const signature = request.headers.get("svix-signature")?.trim();
    if (!id || !timestamp || !signature) {
      reportFailure(new InboundMailFailure(
        "webhook.verify",
        "Webhook signature headers are incomplete.",
        "ValidationError",
        "missing_signature_headers",
      ));
      return json({ error: "Invalid webhook." }, 400);
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch (error) {
      reportFailure(inboundMailFailureFromUnknown(
        "webhook.verify",
        "Webhook request body could not be read.",
        error,
      ));
      return json({ error: "Invalid webhook." }, 400);
    }

    let event;
    try {
      event = dependencies.verifier.verify(rawBody, { id, timestamp, signature }, secret);
    } catch (error) {
      reportFailure(new InboundMailFailure(
        "webhook.verify",
        "Webhook signature verification failed.",
        error instanceof Error && error.name === "TypeError" ? "TypeError" : "SignatureVerificationError",
        "invalid_signature",
      ));
      return json({ error: "Invalid webhook." }, 400);
    }

    if (event.type !== "email.received") {
      return json({ received: true, ignored: true }, 200);
    }

    const apiKey = dependencies.environment.RESEND_ADMIN_API_KEY?.trim();
    if (!apiKey) {
      reportFailure(new InboundMailFailure(
        "resend.retrieve",
        "Received email retrieval is unavailable.",
        "ConfigurationError",
        "missing_resend_admin_key",
      ));
      return json({ error: "Webhook service unavailable." }, 503);
    }

    let email;
    try {
      email = await dependencies
        .createReceivingClient(apiKey)
        .retrieve(event as EmailReceivedEvent, id);
    } catch (error) {
      reportFailure(inboundMailFailureFromUnknown(
        "resend.retrieve",
        "Received email retrieval failed.",
        error,
      ));
      return json({ error: "Upstream email retrieval failed." }, 502);
    }

    if (!email) return json({ received: true, ignored: true }, 200);

    let repository: InboundMailRepository;
    try {
      repository = dependencies.createRepository();
    } catch (error) {
      reportFailure(inboundMailFailureFromUnknown(
        "supabase.initialize",
        "Inbound mail database initialization failed.",
        error,
      ));
      return json({ error: "Email ingestion failed." }, 500);
    }

    try {
      const result = await ingestInboundEmail(repository, email);
      return json({ received: true, duplicate: result.status === "duplicate" }, 200);
    } catch (error) {
      reportFailure(inboundMailFailureFromUnknown(
        "supabase.resolve_thread",
        "Inbound mail database operation failed.",
        error,
      ));
      return json({ error: "Email ingestion failed." }, 500);
    }
  };
}
