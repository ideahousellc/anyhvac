import type { Metadata } from "next";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "AnyHVAC Admin",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className={`admin-shell ${styles.shell}`}>{children}</main>;
}
