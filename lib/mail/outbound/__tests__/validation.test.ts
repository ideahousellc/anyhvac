import { describe, expect, it } from "vitest";
import { replySubject, validateOutboundRequest } from "../validation";

const requestId = "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";

describe("outbound mail validation", () => {
  it("accepts an allowlisted compose request", () => {
    expect(validateOutboundRequest({ mode: "compose", requestId, mailbox: "support@anyhvac.net", to: "Customer@Example.com", subject: "Help", message: "Hello" })).toMatchObject({
      valid: true, request: { to: "customer@example.com", mailbox: "support@anyhvac.net" },
    });
  });

  it.each([
    { mode: "compose", requestId, mailbox: "attacker@example.com", to: "customer@example.com", subject: "Help", message: "Hello" },
    { mode: "compose", requestId, mailbox: "contact@anyhvac.net", to: "first@example.com,second@example.com", subject: "Help", message: "Hello" },
    { mode: "reply", requestId, mailbox: "contact@anyhvac.net", threadId: "not-a-uuid", message: "Hello" },
    { mode: "reply", requestId, mailbox: "contact@anyhvac.net", threadId: requestId, message: "Hello", to: "attacker@example.com" },
  ])("rejects an unsafe request", (value) => expect(validateOutboundRequest(value).valid).toBe(false));

  it("creates one stable reply prefix", () => {
    expect(replySubject("Fwd: Re: Service request")).toBe("Re: Service request");
  });
});
