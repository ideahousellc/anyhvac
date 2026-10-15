"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  getClientExpirationDeadline,
  startAdminSessionExpirationMonitor,
} from "@/components/admin/session-expiration";

export function AdminSessionGuard({
  children,
  expiresAt,
  serverNow,
}: {
  children: ReactNode;
  expiresAt: number;
  serverNow: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const deadline = getClientExpirationDeadline(expiresAt, serverNow);
    return startAdminSessionExpirationMonitor({
      deadline,
      onExpire: () => {
        router.replace("/admin");
        router.refresh();
      },
    });
  }, [expiresAt, router, serverNow]);

  return children;
}
