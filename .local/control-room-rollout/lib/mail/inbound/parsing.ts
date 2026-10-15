import { SUPPORTED_MAILBOXES, type Mailbox } from "./types";

const MAILBOX_SET = new Set<string>(SUPPORTED_MAILBOXES);
const MESSAGE_ID_PATTERN = /<[^<>\r\n]+>/g;
const REPLY_PREFIX_PATTERN = /^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i;

export interface ParsedAddress {
  address: string;
  name: string | null;
}

export function parseAddress(value: string): ParsedAddress | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bracketed = trimmed.match(/^(.*?)<([^<>]+)>\s*$/);
  const rawAddress = (bracketed?.[2] ?? trimmed).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(rawAddress)) return null;

  const rawName = bracketed?.[1]?.trim().replace(/^(["'])(.*)\1$/, "$2") ?? "";
  return { address: rawAddress, name: rawName || null };
}

export function normalizeAddresses(values: string[] | null | undefined): string[] {
  return [...new Set((values ?? []).map(parseAddress).filter(Boolean).map((entry) => entry!.address))];
}

export function findSupportedMailbox(...addressGroups: Array<string[] | null | undefined>): Mailbox | null {
  for (const group of addressGroups) {
    for (const address of normalizeAddresses(group)) {
      if (MAILBOX_SET.has(address)) return address as Mailbox;
    }
  }
  return null;
}

export function getHeader(headers: Record<string, string> | null, name: string): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key]?.trim() || null : null;
}

export function parseMessageIds(value: string | null): string[] {
  if (!value) return [];
  const bracketed = value.match(MESSAGE_ID_PATTERN);
  if (bracketed?.length) return [...new Set(bracketed.map((item) => item.trim()))];
  const candidate = value.trim();
  return candidate && !/[\r\n]/.test(candidate) ? [candidate] : [];
}

export function normalizeSubject(subject: string): string | null {
  const normalized = subject.replace(REPLY_PREFIX_PATTERN, "").replace(/\s+/g, " ").trim().toLowerCase();
  return normalized || null;
}

export function isSubjectFallbackAppropriate(subject: string, inReplyTo: string | null, references: string[]): boolean {
  return REPLY_PREFIX_PATTERN.test(subject) || Boolean(inReplyTo) || references.length > 0;
}
