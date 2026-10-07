import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { AgentInbox } from "@/components/admin/AgentInbox";
import { ADMIN_SESSION_COOKIE, getAdminSessionMetadata } from "@/lib/admin/session";
import { inboxEnabled } from "@/lib/agents/storage";
export default async function AgentsPage() {
  const session = getAdminSessionMetadata((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) redirect("/admin");
  return <AdminSessionGuard expiresAt={session.expiresAt} serverNow={session.serverNow}>
    {inboxEnabled() ? <AgentInbox /> : <section><h1>Agent Inbox</h1><p>The inbox is not enabled.</p><Link href="/admin">Control Room</Link></section>}
  </AdminSessionGuard>;
}
