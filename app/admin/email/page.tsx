import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { MailInbox } from "@/components/admin/MailInbox";
import { ADMIN_SESSION_COOKIE, getAdminSessionMetadata } from "@/lib/admin/session";
import { parseMailboxFilter } from "@/lib/mail/read/config";
import { MailReadError, SupabaseMailReadRepository } from "@/lib/mail/read/repository";
import type { MailThreadDetail, MailThreadSummary } from "@/lib/mail/read/types";

type MailSearchParams = Promise<{ mailbox?: string | string[]; thread?: string | string[] }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminEmailPage({ searchParams = Promise.resolve({}) }: {
  searchParams?: MailSearchParams;
} = {}) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const sessionMetadata = getAdminSessionMetadata(session);
  if (sessionMetadata === null) redirect("/admin");

  const query = await searchParams;
  const filter = parseMailboxFilter(query.mailbox);
  const rawThread = Array.isArray(query.thread) ? query.thread[0] : query.thread;
  const threadId = rawThread && UUID.test(rawThread) ? rawThread : null;
  const threadRequested = typeof rawThread === "string" && rawThread.length > 0;
  let threads: MailThreadSummary[] = [];
  let selectedThread: MailThreadDetail | null = null;
  let failed = false;

  try {
    const repository = new SupabaseMailReadRepository();
    [threads, selectedThread] = await Promise.all([
      repository.listThreads(filter),
      threadId ? repository.getThread(threadId, filter) : Promise.resolve(null),
    ]);
  } catch (error) {
    failed = true;
    console.error("Control Room mail read failed", error instanceof MailReadError ? error.name : "UnknownError");
  }

  return (
    <AdminSessionGuard {...sessionMetadata}>
      <MailInbox filter={filter} threads={threads} selectedThread={selectedThread} threadRequested={threadRequested} failed={failed} />
    </AdminSessionGuard>
  );
}
