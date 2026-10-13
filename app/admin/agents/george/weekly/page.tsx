import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, getAdminSessionMetadata } from "@/lib/admin/session";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { WeeklyReview } from "@/components/admin/WeeklyReview";
import { enabled } from "@/lib/weekly/storage";
export default async function Page() {
  const session = getAdminSessionMetadata((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) redirect("/admin");
  return <AdminSessionGuard expiresAt={session.expiresAt} serverNow={session.serverNow}>{enabled() ? <WeeklyReview /> : <p>Weekly Content review is disabled.</p>}</AdminSessionGuard>;
}
