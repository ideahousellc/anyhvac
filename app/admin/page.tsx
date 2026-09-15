import { cookies } from "next/headers";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { ControlRoomDashboard } from "@/components/admin/ControlRoomDashboard";
import { LoginForm } from "@/components/admin/LoginForm";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionMetadata,
} from "@/lib/admin/session";
import { loadControlRoomIntegrations } from "@/lib/admin/integrations/load";

import styles from "./page.module.css";

export default async function AdminLoginPage() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const sessionMetadata = getAdminSessionMetadata(session);

  if (sessionMetadata) {
    const integrations = await loadControlRoomIntegrations();
    return (
      <AdminSessionGuard
        expiresAt={sessionMetadata.expiresAt}
        serverNow={sessionMetadata.serverNow}
      >
        <ControlRoomDashboard integrations={integrations} />
      </AdminSessionGuard>
    );
  }

  return (
    <section className={`${styles.card} ${styles.loginCard}`}>
      <AdminBrand />
      <LoginForm />
    </section>
  );
}
