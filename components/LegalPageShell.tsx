import type { ReactNode } from "react";

import { ContentPage } from "@/components/ContentPage";

import styles from "./LegalPageShell.module.css";

export function LegalPageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <ContentPage
      compact
      eyebrow="Legal"
      title={title}
      intro={intro}
    >
      <p className={styles.updated}>Last Updated: September 10, 2026</p>
      <div className={styles.document}>{children}</div>
    </ContentPage>
  );
}
