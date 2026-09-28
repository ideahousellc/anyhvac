import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MailInbox } from "../MailInbox";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

describe("Control Room mail inbox", () => {
  it("renders the empty mailbox and unselected-thread states", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="mailtest" threads={[]} selectedThread={null} threadRequested={false} />);
    expect(markup).toContain("No mail here");
    expect(markup).toContain("Select a thread");
    expect(markup).toContain("mailtest@anyhvac.net");
    expect(markup).toContain("Trash");
  });

  it("renders attachment metadata but no attachment action", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="contact" threads={[]} threadRequested selectedThread={{
      id: "thread", mailbox: "contact@anyhvac.net", subject: "Service request", messages: [{
        id: "message", direction: "inbound", senderAddress: "customer@example.com", senderName: "Customer", toAddresses: ["contact@anyhvac.net"], ccAddresses: [], subject: "Service request", displayTextBody: "Please see the file.", quotedTextHidden: false, hasHiddenHtmlBody: false, timestamp: "2026-09-25T12:00:00.000Z", isRead: false, attachments: [{ id: "attachment", messageId: "message", filename: "unit-photo.jpg", contentType: "image/jpeg", sizeBytes: 2048 }],
      }],
    }} />);
    expect(markup).toContain("unit-photo.jpg");
    expect(markup).toContain("image/jpeg · 2.0 KB");
    expect(markup).toContain("Reply");
    expect(markup).toContain("Mark read");
    expect(markup).toContain("/api/admin/email/attachments/attachment?");
  });

  it("never renders stored HTML for an HTML-only message", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="all" threads={[]} threadRequested selectedThread={{
      id: "thread", mailbox: "support@anyhvac.net", subject: "HTML message", messages: [{
        id: "message", direction: "inbound", senderAddress: "sender@example.com", senderName: null, toAddresses: ["support@anyhvac.net"], ccAddresses: [], subject: "HTML message", displayTextBody: null, quotedTextHidden: false, hasHiddenHtmlBody: true, timestamp: "2026-09-25T12:00:00.000Z", isRead: false, attachments: [],
      }],
    }} />);
    expect(markup).toContain("HTML-only content is hidden for safety.");
    expect(markup).not.toContain("dangerouslySetInnerHTML");
    expect(markup).not.toContain("script");
  });

  it("renders a mailbox-safe not-found state for an unknown thread", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="support" threads={[]} selectedThread={null} threadRequested />);
    expect(markup).toContain("Thread not found");
    expect(markup).toContain("selected mailbox");
  });

  it("identifies the selected thread without conflating selection and keyboard focus", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="contact" selectedThread={{
      id: "selected-thread", mailbox: "contact@anyhvac.net", subject: "Selected", messages: [],
    }} threadRequested threads={[{
      id: "selected-thread", mailbox: "contact@anyhvac.net", subject: "Selected", latestMessageAt: "2026-09-25T12:00:00.000Z", senderAddress: "sender@example.com", senderName: null, preview: "Selected preview", unread: true, hasAttachments: false, messageCount: 1,
    }, {
      id: "other-thread", mailbox: "contact@anyhvac.net", subject: "Other", latestMessageAt: "2026-09-24T12:00:00.000Z", senderAddress: "other@example.com", senderName: null, preview: "Other preview", unread: false, hasAttachments: false, messageCount: 1,
    }]} />);

    expect(markup).toMatch(/data-selected="true"[^>]*aria-current="true"/);
    expect(markup).toContain("Unread");
    expect(markup).toMatch(/data-selected="false"/);
  });

  it("shows the Sent mailbox identity and a quoted-history notice without rendering hidden history", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="sent" threads={[{
      id: "sent-thread", mailbox: "social@anyhvac.net", subject: "Update", latestMessageAt: "2026-09-25T12:00:00.000Z", senderAddress: "social@anyhvac.net", senderName: "AnyHVAC", preview: "Sent update", unread: false, hasAttachments: false, messageCount: 2,
    }]} threadRequested selectedThread={{
      id: "sent-thread", mailbox: "social@anyhvac.net", subject: "Update", messages: [{
        id: "message", direction: "inbound", senderAddress: "customer@example.com", senderName: null, toAddresses: ["social@anyhvac.net"], ccAddresses: [], subject: "Update", displayTextBody: "Fresh reply", quotedTextHidden: true, hasHiddenHtmlBody: false, timestamp: "2026-09-25T12:00:00.000Z", isRead: true, attachments: [],
      }],
    }} />);
    expect(markup).toContain("Sent");
    expect(markup).toContain("social@anyhvac.net");
    expect(markup).toContain("Quoted history hidden");
    expect(markup).not.toContain("Old quoted content");
  });

  it("shows Restore instead of reply and delete actions for a Trash conversation", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="trash" threads={[]} threadRequested selectedThread={{
      id: "trash-thread", mailbox: "support@anyhvac.net", subject: "Trashed", messages: [],
    }} />);
    expect(markup).toContain("Restore");
    expect(markup).not.toContain(">Reply<");
    expect(markup).not.toMatch(/<button[^>]*>Trash<\/button>/);
  });

  it("keeps reply thread-derived while presenting older messages as history controls", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="support" threads={[]} threadRequested selectedThread={{
      id: "reply-thread", mailbox: "support@anyhvac.net", subject: "Reply thread", messages: [{
        id: "newest", direction: "inbound", senderAddress: "customer@example.com", senderName: "Customer", toAddresses: ["support@anyhvac.net"], ccAddresses: [], subject: "Reply thread", displayTextBody: "Newest response", quotedTextHidden: false, hasHiddenHtmlBody: false, timestamp: "2026-09-28T16:00:00.000Z", isRead: true, attachments: [],
      }, {
        id: "older", direction: "outbound", senderAddress: "support@anyhvac.net", senderName: "AnyHVAC", toAddresses: ["customer@example.com"], ccAddresses: [], subject: "Reply thread", displayTextBody: "Earlier response", quotedTextHidden: false, hasHiddenHtmlBody: false, timestamp: "2026-09-28T15:00:00.000Z", isRead: true, attachments: [],
      }],
    }} />);

    expect(markup).toContain("Newest response");
    expect(markup).not.toContain("Earlier response");
    expect(markup).toContain('data-history-message-id="older"');
    expect(markup).toContain("Reply");
    const source = readFileSync(resolve(process.cwd(), "components/admin/MailInbox.tsx"), "utf8");
    expect(source).toContain("threadId={selectedThread.id}");
    expect(source).toContain("<ConversationHistory thread={selectedThread}");
  });
});
