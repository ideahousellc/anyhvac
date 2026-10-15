"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { SocialExportButton } from "./SocialExportControls";
import styles from "./social.module.css";

type SlideVariant = "cover" | "simple" | "tools" | "roadmap" | "cta";

type SocialSlideProps = {
  children: ReactNode;
  number: 1 | 2 | 3 | 4 | 5;
  variant: SlideVariant;
};

export function SocialSlide({ children, number, variant }: SocialSlideProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      viewport.style.setProperty("--slide-scale", String(viewport.clientWidth / 1080));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  return (
    <article className={styles.preview} aria-labelledby={`social-slide-label-${number}`}>
      <div className={styles.previewHeader}>
        <h2 className={styles.previewLabel} id={`social-slide-label-${number}`}>
          Slide {number}
        </h2>
        <SocialExportButton className={styles.exportButton} number={number} />
      </div>
      <div className={styles.viewport} ref={viewportRef}>
        <section
          className={`${styles.slide} ${styles[variant]}`}
          id={`social-slide-${number}`}
          data-social-slide={number}
          aria-label={`AnyHVAC social carousel slide ${number} of 5`}
        >
          <Image
            className={styles.brandMark}
            src="/Compact AH logo.png"
            alt=""
            width={1254}
            height={1254}
            priority
          />

          <div className={styles.slideContent}>{children}</div>
        </section>
      </div>
    </article>
  );
}
