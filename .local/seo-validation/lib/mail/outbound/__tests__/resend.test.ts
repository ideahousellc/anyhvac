import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendOutboundMailDelivery } from "../resend";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("Resend outbound delivery", () => {
  it("sends mailbox identity and RFC threading headers, then retrieves Message-ID", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message_id: "<sent@example.com>" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await new ResendOutboundMailDelivery().send({
      mailbox: "support@anyhvac.net", to: "customer@example.com", subject: "Re: Help", message: "Reply",
      inReplyTo: "<incoming@example.com>", references: ["<first@example.com>", "<incoming@example.com>"],
    }, "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toMatchObject({
      from: "Cesar Pepper | AnyHVAC <support@anyhvac.net>", reply_to: "support@anyhvac.net",
      headers: { "In-Reply-To": "<incoming@example.com>", References: "<first@example.com> <incoming@example.com>" },
    });
    expect(new Headers(options.headers).get("Idempotency-Key")).toBe("control-room-email/48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62");
    expect(result).toEqual({ providerMessageId: "email_123", internetMessageId: "<sent@example.com>" });
  });
});
