import { isValidEmailAddress, MAIL_LIMITS } from "@/lib/admin/mail";
import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAILBOX_SET = new Set<string>(SUPPORTED_MAILBOXES);

export type ComposeRequest = { mode: "compose"; requestId: string; mailbox: Mailbox; to: string; subject: string; message: string };
export type ReplyRequest = { mode: "reply"; requestId: string; mailbox: Mailbox; threadId: string; message: string };
export type OutboundRequest = ComposeRequest | ReplyRequest;

export function replySubject(subject: string) {
  const base = subject.replace(/^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i, "").trim() || "(No subject)";
  return `Re: ${base}`;
}

export function validateOutboundRequest(value: unknown): { valid: true; request: OutboundRequest } | { valid: false; error: string } {
  if (!value || typeof value !== "object") return { valid: false, error: "Invalid email request." };
  const body = value as Record<string, unknown>;
  const common = ["mode", "requestId", "mailbox", "message"];
  const allowed = body.mode === "compose" ? [...common, "to", "subject"] : [...common, "threadId"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return { valid: false, error: "Invalid email request." };
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const mailbox = typeof body.mailbox === "string" ? body.mailbox.toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!UUID.test(requestId) || !MAILBOX_SET.has(mailbox) || !message || message.length > MAIL_LIMITS.message) {
    return { valid: false, error: "Please check the email fields." };
  }
  if (body.mode === "reply") {
    const threadId = typeof body.threadId === "string" ? body.threadId : "";
    return UUID.test(threadId)
      ? { valid: true, request: { mode: "reply", requestId, mailbox: mailbox as Mailbox, threadId, message } }
      : { valid: false, error: "Invalid email request." };
  }
  if (body.mode !== "compose") return { valid: false, error: "Invalid email request." };
  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!isValidEmailAddress(to) || !subject || subject.length > MAIL_LIMITS.subject || /[\r\n]/.test(subject)) {
    return { valid: false, error: "Please check the email fields." };
  }
  return { valid: true, request: { mode: "compose", requestId, mailbox: mailbox as Mailbox, to, subject, message } };
}
