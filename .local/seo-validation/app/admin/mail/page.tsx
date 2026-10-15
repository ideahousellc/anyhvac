import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { MailComposer } from "@/components/admin/MailComposer";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionMetadata,
} from "@/lib/admin/session";

import styles from "../page.module.css";

export default async function AdminMailPage() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const sessionMetadata = getAdminSessionMetadata(session);
  if (sessionMetadata === null) redirect("/admin");

  return (
    <AdminSessionGuard
      expiresAt={sessionMetadata.expiresAt}
      serverNow={sessionMetadata.serverNow}
    >
      <section className={styles.card}>
        <AdminBrand />
        <MailComposer />
      </section>
    </AdminSessionGuard>
  );
}
