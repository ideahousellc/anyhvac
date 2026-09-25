import { describe, expect, it, vi } from "vitest";
import type { OutboundMailDelivery, OutboundMailRepository, ReplyContext } from "../types";
import { OutboundConsistencyError, ReplyThreadNotFoundError, sendOutboundMail } from "../service";

vi.mock("server-only", () => ({}));
const requestId = "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";
const context: ReplyContext = { threadId: requestId, mailbox: "contact@anyhvac.net", recipient: "customer@example.com", subject: "Re: Service", inReplyTo: "<inbound@example.com>", references: ["<first@example.com>", "<inbound@example.com>"] };

function dependencies() {
  const delivery: OutboundMailDelivery = { send: vi.fn().mockResolvedValue({ providerMessageId: "provider-1", internetMessageId: "<outbound@example.com>" }) };
  const repository: OutboundMailRepository = {
    findByProviderMessageId: vi.fn().mockResolvedValue(null), getReplyContext: vi.fn().mockResolvedValue(context),
    persistCompose: vi.fn().mockResolvedValue({ threadId: "new-thread", messageId: "message-1" }),
    persistReply: vi.fn().mockResolvedValue({ threadId: requestId, messageId: "message-1" }),
  };
  return { delivery, repository };
}

describe("outbound mail service", () => {
  it("derives reply addressing and threading entirely from repository context", async () => {
    const { delivery, repository } = dependencies();
    await sendOutboundMail({ mode: "reply", requestId, mailbox: "contact@anyhvac.net", threadId: requestId, message: "Thanks" }, delivery, repository);
    expect(delivery.send).toHaveBeenCalledWith(expect.objectContaining({ to: "customer@example.com", subject: "Re: Service", inReplyTo: "<inbound@example.com>", references: context.references }), requestId);
    expect(repository.persistReply).toHaveBeenCalled();
  });

  it("does not deliver when the exact mailbox thread cannot be resolved", async () => {
    const { delivery, repository } = dependencies();
    vi.mocked(repository.getReplyContext).mockResolvedValue(null);
    await expect(sendOutboundMail({ mode: "reply", requestId, mailbox: "support@anyhvac.net", threadId: requestId, message: "Thanks" }, delivery, repository)).rejects.toBeInstanceOf(ReplyThreadNotFoundError);
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it("returns an existing record after an idempotent provider retry", async () => {
    const { delivery, repository } = dependencies();
    vi.mocked(repository.findByProviderMessageId).mockResolvedValue({ threadId: "existing", messageId: "stored" });
    const result = await sendOutboundMail({ mode: "compose", requestId, mailbox: "social@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" }, delivery, repository);
    expect(result.threadId).toBe("existing");
    expect(repository.persistCompose).not.toHaveBeenCalled();
  });

  it("persists a newly accepted compose after provider success", async () => {
    const { delivery, repository } = dependencies();
    const result = await sendOutboundMail({ mode: "compose", requestId, mailbox: "social@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" }, delivery, repository, () => "2026-09-25T12:00:00.000Z");
    expect(result.threadId).toBe("new-thread");
    expect(repository.persistCompose).toHaveBeenCalledWith(expect.objectContaining({ mailbox: "social@anyhvac.net", to: "customer@example.com" }), expect.objectContaining({ providerMessageId: "provider-1" }), "2026-09-25T12:00:00.000Z");
  });

  it("does not persist when the provider rejects delivery", async () => {
    const { delivery, repository } = dependencies();
    vi.mocked(delivery.send).mockRejectedValue(new Error("provider rejected"));
    await expect(sendOutboundMail({ mode: "compose", requestId, mailbox: "social@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" }, delivery, repository)).rejects.toThrow("provider rejected");
    expect(repository.persistCompose).not.toHaveBeenCalled();
    expect(repository.persistReply).not.toHaveBeenCalled();
  });

  it("reports the explicit delivered-but-not-stored state", async () => {
    const { delivery, repository } = dependencies();
    vi.mocked(repository.persistCompose).mockRejectedValue(new Error("database unavailable"));
    await expect(sendOutboundMail({ mode: "compose", requestId, mailbox: "social@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" }, delivery, repository)).rejects.toBeInstanceOf(OutboundConsistencyError);
  });
});
