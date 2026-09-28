import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MailMessageDetail, MailThreadDetail } from "@/lib/mail/read/types";

import { ConversationHistory, ConversationMessage, historyLabels } from "../ConversationHistory";
import {
  conversationHistoryReducer,
  historyWindow,
  initialConversationHistoryState,
} from "../conversation-history";

function message(id: string, timestamp: string, overrides: Partial<MailMessageDetail> = {}): MailMessageDetail {
  return {
    id,
    direction: "inbound",
    senderAddress: `${id}@example.com`,
    senderName: `Sender ${id}`,
    toAddresses: ["support@anyhvac.net"],
    ccAddresses: [],
    subject: "Conversation history",
    displayTextBody: `Body ${id}`,
    quotedTextHidden: false,
    hasHiddenHtmlBody: false,
    timestamp,
    isRead: true,
    attachments: [],
    ...overrides,
  };
}

function thread(messages: MailMessageDetail[]): MailThreadDetail {
  return { id: "thread-1", mailbox: "support@anyhvac.net", subject: "Conversation history", messages };
}

describe("conversation history presentation", () => {
  const messages = [
    message("newest", "2026-09-28T16:00:00.000Z"),
    message("previous-1", "2026-09-28T15:00:00.000Z"),
    message("previous-2", "2026-09-27T14:00:00.000Z"),
    message("previous-3", "2026-09-26T13:00:00.000Z"),
    message("previous-4", "2026-09-25T12:00:00.000Z"),
    message("previous-5", "2026-09-24T11:00:00.000Z"),
    message("oldest", "2026-09-23T10:00:00.000Z"),
  ];

  it("keeps the newest message as the permanent base and does not vertically render history", () => {
    const markup = renderToStaticMarkup(<ConversationHistory thread={thread(messages)} referenceTime="2026-09-28T17:00:00.000Z" />);

    expect(markup).toContain('data-message-id="newest"');
    expect(markup).toContain('data-primary="true"');
    expect(markup).toContain("Body newest");
    expect(markup).not.toContain("Body previous-1");
    expect(markup).not.toContain('data-historical="true"');
    expect(markup).toContain('data-history-message-id="previous-1"');
    expect(markup).toContain('data-history-message-id="previous-4"');
    expect(markup).not.toContain('data-history-message-id="previous-5"');
    expect(markup).toContain("+2");
  });

  it("orders individual history items from immediate previous on the left to oldest on the right", () => {
    const history = messages.slice(1);
    expect(historyWindow(history, 0, 4).visible.map(({ id }) => id)).toEqual([
      "previous-1",
      "previous-2",
      "previous-3",
      "previous-4",
    ]);
    expect(new Set(history.map(({ id }) => id)).size).toBe(history.length);
  });

  it("opens one paper, replaces it, and returns to the permanent newest message", () => {
    const opened = conversationHistoryReducer(initialConversationHistoryState, { type: "open", messageId: "previous-1" });
    const replaced = conversationHistoryReducer(opened, { type: "open", messageId: "previous-2" });
    const closed = conversationHistoryReducer(replaced, { type: "close" });

    expect(opened.selectedMessageId).toBe("previous-1");
    expect(replaced.selectedMessageId).toBe("previous-2");
    expect(closed.selectedMessageId).toBeNull();
  });

  it("slides exactly one item toward older history and reverses toward newer history", () => {
    const opened = conversationHistoryReducer(initialConversationHistoryState, { type: "open", messageId: "previous-1" });
    const older = conversationHistoryReducer(opened, { type: "older", currentStart: 0, historyCount: 6, windowSize: 4 });
    const olderWindow = historyWindow(messages.slice(1), older.windowStart, 4);
    const newer = conversationHistoryReducer(older, { type: "newer", currentStart: olderWindow.start });

    expect(older.windowStart).toBe(1);
    expect(olderWindow.visible.map(({ id }) => id)).toEqual(["previous-2", "previous-3", "previous-4", "previous-5"]);
    expect(olderWindow.hiddenOlder).toBe(1);
    expect(older.selectedMessageId).toBe("previous-1");
    expect(newer.windowStart).toBe(0);
    expect(newer.selectedMessageId).toBe("previous-1");
  });

  it("uses useful, distinguishable date labels", () => {
    const labels = historyLabels([
      message("same-day-1", "2026-09-28T15:00:00.000Z"),
      message("same-day-2", "2026-09-28T13:00:00.000Z"),
      message("yesterday", "2026-09-27T14:00:00.000Z"),
      message("older", "2026-09-25T12:00:00.000Z"),
    ], "2026-09-28T17:00:00.000Z");

    expect(labels[0]).not.toBe(labels[1]);
    expect(labels[2]).toBe("Yesterday");
    expect(labels[3]).toBe("Sep 25");
  });

  it("renders only cleaned historical content and keeps that message's secure attachment available", () => {
    const historical = message("historical", "2026-09-25T12:00:00.000Z", {
      displayTextBody: "Fresh individual reply",
      quotedTextHidden: true,
      attachments: [{ id: "attachment-1", messageId: "historical", filename: "service-photo.jpg", contentType: "image/jpeg", sizeBytes: 2048 }],
    });
    const markup = renderToStaticMarkup(<ConversationMessage historical message={historical} thread={thread([historical])} />);

    expect(markup).toContain("Fresh individual reply");
    expect(markup).toContain("Quoted history hidden");
    expect(markup).toContain("service-photo.jpg");
    expect(markup).toContain("/api/admin/email/attachments/attachment-1?");
    expect(markup).toContain("message=historical");
  });

  it("uses native buttons, accessible state, and meaningful control labels", () => {
    const markup = renderToStaticMarkup(<ConversationHistory thread={thread(messages)} referenceTime="2026-09-28T17:00:00.000Z" />);

    expect(markup).toMatch(/<button[^>]+aria-label="Open previous message from Sender previous-1/);
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Show older messages"');
    expect(markup).toContain('aria-label="2 older messages not shown"');
  });

  it("covers paper, directional sliding, responsive offsets, and reduced motion in CSS", () => {
    const css = readFileSync(resolve(process.cwd(), "components/admin/ConversationHistory.module.css"), "utf8");

    expect(css).toContain("paperSettle 260ms");
    expect(css).toContain("slideOlder 170ms");
    expect(css).toContain("slideNewer 170ms");
    expect(css).toContain("@media(max-width:1050px)");
    expect(css).toContain("@media(max-width:650px)");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toMatch(/prefers-reduced-motion:reduce[^}]+animation:none/);
  });
});
