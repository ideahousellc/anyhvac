import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { LoginForm } from "@/components/admin/LoginForm";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

import styles from "./page.module.css";

export default async function AdminLoginPage() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (verifyAdminSession(session)) redirect("/admin/mail");

  return (
    <section className={`${styles.card} ${styles.loginCard}`}>
      <AdminBrand />
      <LoginForm />
    </section>
  );
}
