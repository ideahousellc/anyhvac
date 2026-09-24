import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createResendWebhookHandler } from "@/lib/mail/inbound/webhook";
import { InboundMailFailure } from "@/lib/mail/inbound/diagnostics";
import type { InboundEmail, InboundMailRepository } from "@/lib/mail/inbound/types";

const inboundEmail: InboundEmail = {
  providerMessageId: "email-1",
  providerEventId: "event-1",
  mailbox: "mailtest@anyhvac.net",
  internetMessageId: "<message@example.com>",
  inReplyTo: null,
  referenceMessageIds: [],
  fromAddress: "sender@example.com",
  fromName: null,
  toAddresses: ["mailtest@anyhvac.net"],
  ccAddresses: [],
  replyToAddresses: [],
  subject: "Hello",
  textBody: null,
  htmlBody: null,
  receivedAt: "2026-09-23T12:00:00.000Z",
  attachments: [],
};

function request(body = "raw-body") {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: { "svix-id": "event-1", "svix-timestamp": "123", "svix-signature": "signature" },
    body,
  });
}

describe("POST /api/webhooks/resend", () => {
  const verify = vi.fn();
  const retrieve = vi.fn();
  const findDuplicate = vi.fn();
  const createThread = vi.fn();
  const insertMessage = vi.fn();
  const logFailure = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    verify.mockReturnValue({ type: "email.received", created_at: inboundEmail.receivedAt, data: { email_id: "email-1" } });
    retrieve.mockResolvedValue(inboundEmail);
    findDuplicate.mockResolvedValue(null);
    createThread.mockResolvedValue("thread-1");
    insertMessage.mockResolvedValue({ id: "message-1", threadId: "thread-1" });
  });

  function handler(environment: Record<string, string | undefined> = {
    RESEND_WEBHOOK_SECRET: "webhook-secret",
    RESEND_ADMIN_API_KEY: "api-key",
  }) {
    const repository = {
      findDuplicate,
      findThreadByInternetIds: vi.fn().mockResolvedValue(null),
      findThreadReferencingInternetId: vi.fn().mockResolvedValue(null),
      findThreadBySubjectAndParticipants: vi.fn().mockResolvedValue(null),
      createThread,
      deleteThreadIfEmpty: vi.fn(),
      insertMessage,
      insertAttachment: vi.fn(),
      updateThreadLatestMessage: vi.fn(),
    } as unknown as InboundMailRepository;
    return createResendWebhookHandler({
      environment,
      verifier: { verify },
      createReceivingClient: () => ({ retrieve }),
      createRepository: () => repository,
      logFailure,
    });
  }

  it("verifies the untouched raw body before retrieving and ingesting a received email", async () => {
    const response = await handler()(request("{ \"spacing\": true }"));
    expect(response.status).toBe(200);
    expect(verify).toHaveBeenCalledWith("{ \"spacing\": true }", {
      id: "event-1", timestamp: "123", signature: "signature",
    }, "webhook-secret");
    expect(retrieve).toHaveBeenCalled();
    expect(insertMessage).toHaveBeenCalled();
    expect(verify.mock.invocationCallOrder[0]).toBeLessThan(retrieve.mock.invocationCallOrder[0]);
  });

  it("rejects an invalid signature without touching external services", async () => {
    verify.mockImplementation(() => { throw new Error("invalid secret details"); });
    const response = await handler()(request());
    expect(response.status).toBe(400);
    expect(retrieve).not.toHaveBeenCalled();
    expect(logFailure).toHaveBeenCalledWith({
      component: "inbound_mail",
      outcome: "failure",
      stage: "webhook.verify",
      error_name: "SignatureVerificationError",
      error_code: "invalid_signature",
      message: "Webhook signature verification failed.",
    });
  });

  it("fails safely when the runtime webhook secret is missing", async () => {
    const response = await handler({ RESEND_ADMIN_API_KEY: "api-key" })(request());
    expect(response.status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
  });

  it("ignores a verified unsupported event without API or database work", async () => {
    verify.mockReturnValue({ type: "email.delivered", created_at: inboundEmail.receivedAt, data: {} });
    const response = await handler()(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, ignored: true });
    expect(retrieve).not.toHaveBeenCalled();
    expect(findDuplicate).not.toHaveBeenCalled();
  });

  it("ignores mail for an unsupported mailbox", async () => {
    retrieve.mockResolvedValue(null);
    const response = await handler()(request());
    expect(response.status).toBe(200);
    expect(findDuplicate).not.toHaveBeenCalled();
  });

  it("returns 502 for a Resend retrieval failure without exposing details", async () => {
    retrieve.mockRejectedValue(new Error("secret provider details sender@example.com email-1"));
    const response = await handler()(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret provider details");
    expect(logFailure).toHaveBeenCalledWith({
      component: "inbound_mail",
      outcome: "failure",
      stage: "resend.retrieve",
      error_name: "Error",
      message: "Received email retrieval failed.",
    });
  });

  it("returns 500 for a database failure without exposing details", async () => {
    findDuplicate.mockRejectedValue(new InboundMailFailure(
      "supabase.find_duplicate_message",
      "Inbound mail database operation failed.",
      "PostgrestError",
      "42501",
    ));
    const response = await handler()(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret database details");
    expect(logFailure).toHaveBeenCalledWith({
      component: "inbound_mail",
      outcome: "failure",
      stage: "supabase.find_duplicate_message",
      error_name: "PostgrestError",
      error_code: "42501",
      message: "Inbound mail database operation failed.",
    });
  });

  it("logs Supabase initialization failures without logging sensitive inputs", async () => {
    const sensitiveValues = [
      "webhook-secret",
      "api-key",
      "raw-body",
      inboundEmail.providerMessageId,
      inboundEmail.providerEventId,
      inboundEmail.fromAddress,
      inboundEmail.subject,
    ];
    const failingHandler = createResendWebhookHandler({
      environment: {
        RESEND_WEBHOOK_SECRET: sensitiveValues[0],
        RESEND_ADMIN_API_KEY: sensitiveValues[1],
      },
      verifier: { verify },
      createReceivingClient: () => ({ retrieve }),
      createRepository: () => {
        throw new Error(sensitiveValues.join(" "));
      },
      logFailure,
    });

    const response = await failingHandler(request(sensitiveValues[2]));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Email ingestion failed." });
    expect(logFailure).toHaveBeenCalledWith({
      component: "inbound_mail",
      outcome: "failure",
      stage: "supabase.initialize",
      error_name: "Error",
      message: "Inbound mail database initialization failed.",
    });

    const serializedLogs = JSON.stringify(logFailure.mock.calls);
    for (const sensitiveValue of sensitiveValues) {
      expect(serializedLogs).not.toContain(sensitiveValue);
    }
  });
});
