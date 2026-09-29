import type { Metadata } from "next";
import Link from "next/link";

import { StatusPanel } from "@/components/ContentPage";
import pageStyles from "@/components/ContentPage.module.css";

import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page Not Found | AnyHVAC",
  description: "This page could not be found. Explore AnyHVAC tools and resources or contact us for help.",
  robots: { index: false, follow: true },
  // Missing URLs must not inherit the root layout's homepage SEO metadata.
  alternates: null,
  openGraph: null,
  twitter: null,
};

export default function NotFound() {
  return (
    <main className={pageStyles.page}>
      <article className={`page-shell ${pageStyles.article} ${pageStyles.compact}`}>
        <header className={pageStyles.intro}>
          <p className={pageStyles.eyebrow}>AnyHVAC · 404</p>
          <h1>Page not found.</h1>
          <p className={pageStyles.lead}>
            The page you’re looking for may have moved or doesn’t exist. Let’s get you back to work.
          </p>
        </header>
        <div className={pageStyles.content}>
          <StatusPanel>
            <nav aria-label="Page recovery" className={styles.links}>
              <Link href="/">Home</Link>
              <Link href="/tools">Tools</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </StatusPanel>
        </div>
      </article>
    </main>
  );
}
