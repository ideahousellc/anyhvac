"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { handleAdminUnauthorized } from "@/components/admin/session-expiration";
import { MAIL_LIMITS } from "@/lib/admin/mail";
import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";
import styles from "./MailActions.module.css";

type SendResult = { delivered?: boolean; persisted?: boolean; threadId?: string; error?: string };

function useSendRequest() {
  const router = useRouter();
  const requestId = useRef("");
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function edited() { if (!sending.current) requestId.current = ""; setError(""); }
  async function send(payload: object) {
    if (sending.current) return null;
    sending.current = true; setPending(true); setError(""); requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/admin/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, requestId: requestId.current }) });
      if (handleAdminUnauthorized(response.status, () => { router.replace("/admin"); router.refresh(); })) return null;
      const body = await response.json().catch(() => null) as SendResult | null;
      if (response.ok && body?.delivered && body.persisted) { requestId.current = ""; return body; }
      setError(body?.error || "Email could not be sent. Please try again.");
      return null;
    } catch { setError("Email could not be sent. Please try again."); return null; }
    finally { sending.current = false; setPending(false); }
  }
  return { send, edited, pending, error };
}

export function ComposeAction({ defaultMailbox }: { defaultMailbox: Mailbox }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const request = useSendRequest();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await request.send({ mode: "compose", mailbox: form.get("mailbox"), to: form.get("to"), subject: form.get("subject"), message: form.get("message") });
    if (result?.threadId) { setOpen(false); router.push(`/admin/email?mailbox=${String(form.get("mailbox")).split("@")[0]}&thread=${result.threadId}`); router.refresh(); }
  }
  return <>
    <button className={styles.actionButton} type="button" onClick={() => setOpen(true)}>Compose</button>
    {open ? <div className={styles.backdrop}><section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="compose-title">
      <div className={styles.panelHeading}><h2 id="compose-title">New email</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close compose">×</button></div>
      <form onSubmit={submit} onChange={request.edited}>
        <label><span>From</span><select name="mailbox" defaultValue={defaultMailbox}>{SUPPORTED_MAILBOXES.map((mailbox) => <option key={mailbox}>{mailbox}</option>)}</select></label>
        <label><span>To</span><input name="to" type="email" maxLength={MAIL_LIMITS.recipient} required /></label>
        <label><span>Subject</span><input name="subject" maxLength={MAIL_LIMITS.subject} required /></label>
        <label><span>Message</span><textarea name="message" rows={9} maxLength={MAIL_LIMITS.message} required /></label>
        {request.error ? <p className={styles.error} role="alert">{request.error}</p> : null}
        <div className={styles.formActions}><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className={styles.primary} type="submit" disabled={request.pending}>{request.pending ? "Sending…" : "Send"}</button></div>
      </form>
    </section></div> : null}
  </>;
}

export function ThreadActions({ threadId, mailbox, unread }: { threadId: string; mailbox: Mailbox; unread: boolean }) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [readPending, setReadPending] = useState(false);
  const suppressAutoRead = useRef(false);
  const request = useSendRequest();
  async function setRead(isRead: boolean) {
    if (readPending) return;
    setReadPending(true);
    if (!isRead) suppressAutoRead.current = true;
    try {
      const response = await fetch("/api/admin/email/read-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, mailbox, isRead }) });
      if (handleAdminUnauthorized(response.status, () => { router.replace("/admin"); router.refresh(); })) return;
      if (response.ok) router.refresh();
      else if (!isRead) suppressAutoRead.current = false;
    } finally { setReadPending(false); }
  }
  useEffect(() => {
    if (!unread) return;
    if (suppressAutoRead.current) { suppressAutoRead.current = false; return; }
    const controller = new AbortController();
    void fetch("/api/admin/email/read-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, mailbox, isRead: true }),
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) router.refresh();
      else handleAdminUnauthorized(response.status, () => { router.replace("/admin"); router.refresh(); });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [mailbox, router, threadId, unread]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await request.send({ mode: "reply", threadId, mailbox, message: form.get("message") });
    if (result) { setReplying(false); router.refresh(); }
  }
  return <div className={styles.threadActions}>
    <button type="button" disabled={readPending} onClick={() => void setRead(unread)}>{unread ? "Mark read" : "Mark unread"}</button>
    <button className={styles.actionButton} type="button" onClick={() => setReplying(true)}>Reply</button>
    {replying ? <div className={styles.backdrop}><section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="reply-title">
      <div className={styles.panelHeading}><div><h2 id="reply-title">Reply</h2><p>From {mailbox}</p></div><button type="button" onClick={() => setReplying(false)} aria-label="Close reply">×</button></div>
      <form onSubmit={submit} onChange={request.edited}><label><span>Message</span><textarea name="message" rows={10} maxLength={MAIL_LIMITS.message} required autoFocus /></label>
        {request.error ? <p className={styles.error} role="alert">{request.error}</p> : null}
        <div className={styles.formActions}><button type="button" onClick={() => setReplying(false)}>Cancel</button><button className={styles.primary} type="submit" disabled={request.pending}>{request.pending ? "Sending…" : "Send reply"}</button></div>
      </form>
    </section></div> : null}
  </div>;
}
