import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, getAdminSessionMetadata } from "@/lib/admin/session";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { WeeklyReview } from "@/components/admin/WeeklyReview";
import { enabled } from "@/lib/weekly/storage";
import { selectedBatch, HISTORICAL_BATCH_ID } from "@/lib/weekly/selection";
export default async function Page({ searchParams }: { searchParams: Promise<{ batch?: string | string[] }> }) {
  const session = getAdminSessionMetadata((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) redirect("/admin");
  let batch; try { const value = (await searchParams).batch; if (Array.isArray(value)) throw Error("Invalid selection"); batch = selectedBatch(value); } catch { redirect("/admin/agents/george/weekly"); }
  return <AdminSessionGuard expiresAt={session.expiresAt} serverNow={session.serverNow}>{enabled() ? <WeeklyReview key={batch} batch={batch} importEnabled={batch === HISTORICAL_BATCH_ID && process.env.WEEKLY_CONTENT_IMPORT_ENABLED === "true" && process.env.WEEKLY_CONTENT_STORAGE === "supabase"} approvedImportEnabled={batch !== HISTORICAL_BATCH_ID && process.env.WEEKLY_CONTENT_APPROVED_IMPORT_ENABLED === "true" && process.env.WEEKLY_CONTENT_STORAGE === "supabase"} /> : <p>Weekly Content review is disabled.</p>}</AdminSessionGuard>;
}
