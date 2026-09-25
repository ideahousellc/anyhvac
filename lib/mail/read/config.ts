import type { Mailbox } from "@/lib/mail/inbound/types";

import type { MailboxFilter } from "./types";

export const MAILBOXES: ReadonlyArray<{
  id: MailboxFilter;
  label: string;
  address: Mailbox | null;
}> = [
  { id: "all", label: "All Mail", address: null },
  { id: "contact", label: "Contact", address: "contact@anyhvac.net" },
  { id: "support", label: "Support", address: "support@anyhvac.net" },
  { id: "social", label: "Social", address: "social@anyhvac.net" },
  { id: "mailtest", label: "Mail Test", address: "mailtest@anyhvac.net" },
];

const ADDRESS_BY_FILTER = new Map(
  MAILBOXES.flatMap((mailbox) => mailbox.address ? [[mailbox.id, mailbox.address] as const] : []),
);

export function parseMailboxFilter(value: string | string[] | undefined): MailboxFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return MAILBOXES.some((mailbox) => mailbox.id === candidate)
    ? candidate as MailboxFilter
    : "all";
}

export function mailboxAddress(filter: MailboxFilter): Mailbox | null {
  return ADDRESS_BY_FILTER.get(filter) ?? null;
}
