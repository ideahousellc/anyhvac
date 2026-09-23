import type { EmailReceivedEvent } from "resend";

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
}

const jsonHeaders = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: jsonHeaders });
}

export function createResendWebhookHandler(dependencies: HandlerDependencies) {
  return async function handleResendWebhook(request: Request): Promise<Response> {
    const secret = dependencies.environment.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) return json({ error: "Webhook service unavailable." }, 503);

    const id = request.headers.get("svix-id")?.trim();
    const timestamp = request.headers.get("svix-timestamp")?.trim();
    const signature = request.headers.get("svix-signature")?.trim();
    if (!id || !timestamp || !signature) return json({ error: "Invalid webhook." }, 400);

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return json({ error: "Invalid webhook." }, 400);
    }

    let event;
    try {
      event = dependencies.verifier.verify(rawBody, { id, timestamp, signature }, secret);
    } catch {
      return json({ error: "Invalid webhook." }, 400);
    }

    if (event.type !== "email.received") {
      return json({ received: true, ignored: true }, 200);
    }

    const apiKey = dependencies.environment.RESEND_ADMIN_API_KEY?.trim();
    if (!apiKey) return json({ error: "Webhook service unavailable." }, 503);

    let email;
    try {
      email = await dependencies
        .createReceivingClient(apiKey)
        .retrieve(event as EmailReceivedEvent, id);
    } catch {
      return json({ error: "Upstream email retrieval failed." }, 502);
    }

    if (!email) return json({ received: true, ignored: true }, 200);

    try {
      const result = await ingestInboundEmail(dependencies.createRepository(), email);
      return json({ received: true, duplicate: result.status === "duplicate" }, 200);
    } catch {
      return json({ error: "Email ingestion failed." }, 500);
    }
  };
}
