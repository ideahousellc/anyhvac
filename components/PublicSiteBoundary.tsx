"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Footer } from "@/components/Footer";
import { ModalProvider } from "@/components/ModalProvider";

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isStandalonePath(pathname: string) {
  return pathname === "/dev/social";
}

export function PublicSiteBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isAdminPath(pathname) || isStandalonePath(pathname)) return children;

  return (
    <ModalProvider>
      {children}
      <Footer />
    </ModalProvider>
  );
}
