import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { MailComposer } from "@/components/admin/MailComposer";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

import styles from "../page.module.css";

export default async function AdminMailPage() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) redirect("/admin");

  return (
    <section className={styles.card}>
      <AdminBrand />
      <MailComposer />
    </section>
  );
}
