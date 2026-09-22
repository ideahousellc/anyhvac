import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SocialCarousel } from "@/components/social/SocialCarousel";
import { SocialExportAllButton } from "@/components/social/SocialExportControls";

import styles from "./social-studio.module.css";

export const metadata: Metadata = {
  title: "AnyHVAC Social Studio",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SocialStudioPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={styles.studio}>
      <header className={styles.utilityHeader}>
        <div>
          <p className={styles.kicker}>Internal creative workspace</p>
          <h1>AnyHVAC Social Studio</h1>
        </div>
        <div className={styles.utilityActions}>
          <dl className={styles.specs} aria-label="Carousel specifications">
            <div>
              <dt>Format</dt>
              <dd>Instagram Carousel</dd>
            </div>
            <div>
              <dt>Canvas</dt>
              <dd>1080 × 1350</dd>
            </div>
            <div>
              <dt>Ratio</dt>
              <dd>4:5</dd>
            </div>
          </dl>
          <SocialExportAllButton className={styles.exportAllButton} />
        </div>
      </header>

      <SocialCarousel />
    </main>
  );
}
