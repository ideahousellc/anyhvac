"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import type { MailMessageDetail, MailThreadDetail } from "@/lib/mail/read/types";

import {
  DEFAULT_HISTORY_WINDOW_SIZE,
  conversationHistoryReducer,
  historyWindow,
  initialConversationHistoryState,
} from "./conversation-history";
import styles from "./ConversationHistory.module.css";

function sender(message: MailMessageDetail) {
  return message.senderName?.trim() || message.senderAddress;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function historyLabels(messages: MailMessageDetail[], referenceTime: string) {
  const now = new Date(referenceTime);
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);
  const counts = new Map<string, number>();
  for (const message of messages) {
    const date = new Date(message.timestamp);
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return messages.map((message) => {
    const date = new Date(message.timestamp);
    if (Number.isNaN(date.valueOf())) return "Unknown";
    const key = dayKey(date);
    if (key === today) return timeLabel(date);
    if (key === yesterday) return counts.get(key)! > 1 ? `Yesterday, ${timeLabel(date)}` : "Yesterday";
    const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
    return counts.get(key)! > 1 ? `${day}, ${timeLabel(date)}` : day;
  });
}

function formatBytes(value: number | null) {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export function ConversationMessage({ message, thread, historical = false }: {
  message: MailMessageDetail;
  thread: Pick<MailThreadDetail, "id" | "mailbox">;
  historical?: boolean;
}) {
  return (
    <article className={styles.message} data-message-id={message.id} data-primary={!historical || undefined} data-historical={historical || undefined}>
      {historical ? <p className={styles.paperLabel}>Previous message · {formatDate(message.timestamp)}</p> : null}
      <header className={styles.messageHeader}><div><strong>{sender(message)}</strong>{message.senderName ? <span>{message.senderAddress}</span> : null}</div><time dateTime={message.timestamp}>{formatDate(message.timestamp)}</time></header>
      <dl className={styles.recipients}><div><dt>To</dt><dd>{message.toAddresses.join(", ") || "Not recorded"}</dd></div>{message.ccAddresses.length ? <div><dt>Cc</dt><dd>{message.ccAddresses.join(", ")}</dd></div> : null}</dl>
      {message.displayTextBody ? <div className={styles.body}>{message.displayTextBody}</div> : message.quotedTextHidden ? null : message.hasHiddenHtmlBody ? <p className={styles.htmlNotice}>HTML-only content is hidden for safety.</p> : <p className={styles.htmlNotice}>This message has no text body.</p>}
      {message.quotedTextHidden ? <p className={styles.quotedNotice}>Quoted history hidden</p> : null}
      {message.attachments.length ? <div className={styles.attachments}><p>Attachments</p>{message.attachments.map((attachment) => {
        const size = formatBytes(attachment.sizeBytes);
        const query = new URLSearchParams({ thread: thread.id, mailbox: thread.mailbox, message: attachment.messageId });
        return <a className={styles.attachment} href={`/api/admin/email/attachments/${encodeURIComponent(attachment.id)}?${query}`} key={attachment.id} target="_blank" rel="noreferrer"><strong>{attachment.filename}</strong><span>{attachment.contentType || "Unknown MIME type"}{size ? ` · ${size}` : ""}</span></a>;
      })}</div> : null}
    </article>
  );
}

function responsiveWindowSize() {
  if (typeof window === "undefined") return DEFAULT_HISTORY_WINDOW_SIZE;
  if (window.matchMedia("(max-width: 650px)").matches) return 2;
  if (window.matchMedia("(max-width: 1050px)").matches) return 3;
  return DEFAULT_HISTORY_WINDOW_SIZE;
}

export function ConversationHistory({ thread, referenceTime }: {
  thread: MailThreadDetail;
  referenceTime: string;
}) {
  const [state, dispatch] = useReducer(conversationHistoryReducer, initialConversationHistoryState);
  const [windowSize, setWindowSize] = useState(DEFAULT_HISTORY_WINDOW_SIZE);
  const primary = thread.messages[0] ?? null;
  const history = useMemo(() => thread.messages.slice(1), [thread.messages]);
  const labels = useMemo(() => historyLabels(history, referenceTime), [history, referenceTime]);
  const currentWindow = historyWindow(history, state.windowStart, windowSize);
  const selected = history.find((message) => message.id === state.selectedMessageId) ?? null;

  useEffect(() => {
    const update = () => setWindowSize(responsiveWindowSize());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!primary) return <div className={styles.empty}>This conversation has no stored messages.</div>;

  return (
    <div className={styles.conversation}>
      <div className={styles.stage} data-history-open={Boolean(selected)}>
        <div className={styles.base}><ConversationMessage message={primary} thread={thread} /></div>
        {selected ? <div className={styles.paper} key={selected.id}><ConversationMessage historical message={selected} thread={thread} /></div> : null}
        {selected ? <button className={styles.returnNewest} type="button" onClick={() => dispatch({ type: "close" })} aria-label="Close previous message and return to newest email">Newest message</button> : null}
      </div>
      {history.length ? <nav className={styles.history} aria-label="Conversation history">
        <p className={styles.historyLabel}>Previous messages</p>
        <div className={styles.historyControls}>
          {currentWindow.start > 0 ? <button className={styles.arrow} type="button" onClick={() => dispatch({ type: "newer", currentStart: currentWindow.start })} aria-label="Show newer messages">‹</button> : null}
          <div className={styles.window} data-direction={state.direction} key={`${currentWindow.start}-${windowSize}-${state.motionKey}`}>
            {currentWindow.visible.map((message) => {
              const index = history.findIndex((candidate) => candidate.id === message.id);
              const selectedMessage = message.id === state.selectedMessageId;
              return <button
                aria-label={`Open previous message from ${sender(message)}, ${formatDate(message.timestamp)}`}
                aria-pressed={selectedMessage}
                className={styles.historyButton}
                data-history-message-id={message.id}
                data-selected={selectedMessage}
                key={message.id}
                onClick={() => dispatch({ type: "open", messageId: message.id })}
                type="button"
              >{labels[index]}</button>;
            })}
          </div>
          {currentWindow.hiddenOlder > 0 ? <div className={styles.olderStatus}><span className={styles.hiddenCount} aria-label={`${currentWindow.hiddenOlder} older messages not shown`}>+{currentWindow.hiddenOlder}</span><button className={styles.arrow} type="button" onClick={() => dispatch({ type: "older", currentStart: currentWindow.start, historyCount: history.length, windowSize })} aria-label="Show older messages">›</button></div> : null}
        </div>
      </nav> : null}
    </div>
  );
}
