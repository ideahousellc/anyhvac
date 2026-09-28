"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

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

  if (isAdminPath(pathname)) return children;

  return (
    <>
      {isStandalonePath(pathname) ? children : <ModalProvider>
        {children}
        <Footer />
      </ModalProvider>}
      <Script
        id="cloudflare-web-analytics"
        type="module"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "4a02b1c1a4c44c62a82304f2a96c7da2"}'
        strategy="afterInteractive"
      />
    </>
  );
}
