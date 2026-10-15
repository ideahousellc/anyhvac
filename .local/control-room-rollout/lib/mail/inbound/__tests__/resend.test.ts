import type { EmailReceivedEvent } from "resend";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ResendReceivingClient } from "../resend";

const event = {
  type: "email.received",
  created_at: "2026-09-24T12:00:00.000Z",
  data: {
    email_id: "expected-email-id",
    received_for: ["mailtest@anyhvac.net"],
    to: ["receiving@resend.dev"],
  },
} as EmailReceivedEvent;

function receivedEmail(overrides: Record<string, unknown> = {}) {
  return {
    object: "email",
    id: "expected-email-id",
    to: ["receiving@resend.dev"],
    from: "sender@example.com",
    created_at: "2026-09-24T12:00:00.000Z",
    subject: "Sensitive subject",
    bcc: [],
    cc: [],
    reply_to: [],
    received_for: ["mailtest@anyhvac.net"],
    html: "<p>Sensitive body</p>",
    text: "Sensitive body",
    headers: null,
    message_id: "<sensitive-message-id@example.com>",
    attachments: [],
    ...overrides,
  };
}

function mockResponse(body: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Resend receiving diagnostics", () => {
  it("classifies an unexpected provider response as validation without retaining identifiers", async () => {
    mockResponse(receivedEmail({ id: "unexpected-sensitive-email-id" }));

    const error = await new ResendReceivingClient("fake-api-key")
      .retrieve(event, "sensitive-provider-event-id")
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({
      stage: "resend.validate",
      errorName: "ResendResponseError",
      message: "Resend returned an unexpected received email.",
    });
    expect(JSON.stringify(error)).not.toContain("unexpected-sensitive-email-id");
    expect(JSON.stringify(error)).not.toContain("fake-api-key");
  });

  it("classifies malformed received-email data as parsing without retaining content", async () => {
    mockResponse(receivedEmail({ attachments: null }));

    const error = await new ResendReceivingClient("fake-api-key")
      .retrieve(event, "sensitive-provider-event-id")
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({
      stage: "resend.parse",
      errorName: "TypeError",
      message: "Received email parsing failed.",
    });
    const serializedError = JSON.stringify(error);
    expect(serializedError).not.toContain("Sensitive subject");
    expect(serializedError).not.toContain("Sensitive body");
    expect(serializedError).not.toContain("sender@example.com");
    expect(serializedError).not.toContain("sensitive-provider-event-id");
  });
});
