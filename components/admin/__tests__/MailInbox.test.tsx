import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MailInbox } from "../MailInbox";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

describe("Control Room mail inbox", () => {
  it("renders the empty mailbox and unselected-thread states", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="mailtest" threads={[]} selectedThread={null} threadRequested={false} />);
    expect(markup).toContain("No mail here");
    expect(markup).toContain("Select a thread");
    expect(markup).toContain("mailtest@anyhvac.net");
  });

  it("renders attachment metadata but no attachment action", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="contact" threads={[]} threadRequested selectedThread={{
      id: "thread", mailbox: "contact@anyhvac.net", subject: "Service request", messages: [{
        id: "message", direction: "inbound", senderAddress: "customer@example.com", senderName: "Customer", toAddresses: ["contact@anyhvac.net"], ccAddresses: [], subject: "Service request", textBody: "Please see the file.", hasHiddenHtmlBody: false, timestamp: "2026-09-25T12:00:00.000Z", isRead: false, attachments: [{ filename: "unit-photo.jpg", contentType: "image/jpeg", sizeBytes: 2048 }],
      }],
    }} />);
    expect(markup).toContain("unit-photo.jpg");
    expect(markup).toContain("image/jpeg · 2.0 KB");
    expect(markup).not.toContain("download");
  });

  it("never renders stored HTML for an HTML-only message", () => {
    const markup = renderToStaticMarkup(<MailInbox filter="all" threads={[]} threadRequested selectedThread={{
      id: "thread", mailbox: "support@anyhvac.net", subject: "HTML message", messages: [{
        id: "message", direction: "inbound", senderAddress: "sender@example.com", senderName: null, toAddresses: ["support@anyhvac.net"], ccAddresses: [], subject: "HTML message", textBody: null, hasHiddenHtmlBody: true, timestamp: "2026-09-25T12:00:00.000Z", isRead: false, attachments: [],
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
});
