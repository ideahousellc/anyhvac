"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./Admin.module.css";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin");
      router.refresh();
    }
  }

  return (
    <button
      className={styles.logoutButton}
      type="button"
      onClick={logout}
      disabled={pending}
    >
      {pending ? "Logging out…" : "Logout"}
    </button>
  );
}
