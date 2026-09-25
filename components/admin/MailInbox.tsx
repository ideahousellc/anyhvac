import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { MAILBOXES, mailboxAddress } from "@/lib/mail/read/config";
import type { MailboxFilter, MailThreadDetail, MailThreadSummary } from "@/lib/mail/read/types";

import styles from "./MailInbox.module.css";

function formatDate(value: string, compact = false) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", compact
    ? { month: "short", day: "numeric" }
    : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatBytes(value: number | null) {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function sender(name: string | null, address: string) { return name?.trim() || address; }

function mailHref(filter: MailboxFilter, threadId?: string) {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("mailbox", filter);
  if (threadId) query.set("thread", threadId);
  const suffix = query.toString();
  return suffix ? `/admin/email?${suffix}` : "/admin/email";
}

export function MailInbox({ filter, threads, selectedThread, threadRequested, failed = false }: {
  filter: MailboxFilter;
  threads: MailThreadSummary[];
  selectedThread: MailThreadDetail | null;
  threadRequested: boolean;
  failed?: boolean;
}) {
  const activeMailbox = MAILBOXES.find((mailbox) => mailbox.id === filter) ?? MAILBOXES[0];
  const address = mailboxAddress(filter);
  return (
    <div className={styles.inbox}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>AnyHVAC Admin</p><h1>Email</h1><p className={styles.subtitle}>Read-only Control Room inbox</p></div>
        <div className={styles.headerActions}><Link className={styles.controlRoomLink} href="/admin">Control Room</Link><AdminLogoutButton /></div>
      </header>
      <div className={styles.workspace}>
        <nav className={styles.mailboxes} aria-label="Mailboxes">
          <p className={styles.navTitle}>Mailboxes</p>
          {MAILBOXES.map((mailbox) => (
            <Link className={styles.mailboxLink} data-active={mailbox.id === filter} href={mailHref(mailbox.id)} key={mailbox.id} aria-current={mailbox.id === filter ? "page" : undefined}>
              <span>{mailbox.label}</span>{mailbox.address ? <small>{mailbox.address}</small> : null}
            </Link>
          ))}
        </nav>
        <section className={styles.threadColumn} aria-labelledby="thread-list-heading">
          <div className={styles.columnHeading}><div><p>{activeMailbox.label}</p><h2 id="thread-list-heading">Threads</h2></div><span>{threads.length}</span></div>
          {address ? <p className={styles.mailboxAddress}>{address}</p> : null}
          {failed ? <div className={styles.state} role="alert"><strong>Inbox unavailable</strong><p>Mail could not be loaded. Please try again shortly.</p></div>
            : threads.length === 0 ? <div className={styles.state}><strong>No mail here</strong><p>This mailbox does not have any stored threads yet.</p></div>
              : <div className={styles.threadList}>{threads.map((thread) => (
                <Link className={styles.thread} data-selected={selectedThread?.id === thread.id} data-unread={thread.unread} href={mailHref(filter, thread.id)} key={thread.id}>
                  <span className={styles.srOnly}>{thread.unread ? "Unread" : "Read"}</span>
                  <div className={styles.threadTopline}><strong>{sender(thread.senderName, thread.senderAddress)}</strong><time dateTime={thread.latestMessageAt}>{formatDate(thread.latestMessageAt, true)}</time></div>
                  <p className={styles.threadSubject}>{thread.subject}</p><p className={styles.preview}>{thread.preview}</p>
                  <div className={styles.threadMeta}>{filter === "all" ? <span>{thread.mailbox}</span> : null}{thread.hasAttachments ? <span aria-label="Has attachments">Attachment</span> : null}{thread.messageCount > 1 ? <span>{thread.messageCount} messages</span> : null}</div>
                </Link>
              ))}</div>}
        </section>
        <section className={styles.conversation} aria-label="Conversation">
          {failed ? <div className={styles.conversationState}><strong>Conversation unavailable</strong><p>No database or provider details were exposed.</p></div>
            : selectedThread ? <><div className={styles.conversationHeading}><p>{selectedThread.mailbox}</p><h2>{selectedThread.subject}</h2><span>{selectedThread.messages.length} {selectedThread.messages.length === 1 ? "message" : "messages"}</span></div>
              <div className={styles.messages}>{selectedThread.messages.map((message) => (
                <article className={styles.message} key={message.id}>
                  <header className={styles.messageHeader}><div><strong>{sender(message.senderName, message.senderAddress)}</strong>{message.senderName ? <span>{message.senderAddress}</span> : null}</div><time dateTime={message.timestamp}>{formatDate(message.timestamp)}</time></header>
                  <dl className={styles.recipients}><div><dt>To</dt><dd>{message.toAddresses.join(", ") || "Not recorded"}</dd></div>{message.ccAddresses.length ? <div><dt>Cc</dt><dd>{message.ccAddresses.join(", ")}</dd></div> : null}</dl>
                  {message.textBody ? <div className={styles.body}>{message.textBody}</div> : message.hasHiddenHtmlBody ? <p className={styles.htmlNotice}>HTML-only content is hidden for safety.</p> : <p className={styles.htmlNotice}>This message has no text body.</p>}
                  {message.attachments.length ? <div className={styles.attachments}><p>Attachments</p>{message.attachments.map((attachment, index) => {
                    const size = formatBytes(attachment.sizeBytes);
                    return <div className={styles.attachment} key={`${attachment.filename}-${index}`}><strong>{attachment.filename}</strong><span>{attachment.contentType || "Unknown MIME type"}{size ? ` · ${size}` : ""}</span></div>;
                  })}</div> : null}
                </article>
              ))}</div></>
              : threadRequested ? <div className={styles.conversationState}><strong>Thread not found</strong><p>It may not exist in the selected mailbox.</p></div>
                : <div className={styles.conversationState}><strong>Select a thread</strong><p>Choose a conversation from the thread list to read it.</p></div>}
        </section>
      </div>
    </div>
  );
}
