import type { ReactNode } from "react";

import { Header } from "@/components/Header";

import styles from "./ContentPage.module.css";

export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <main className={styles.page}>
      <Header />
      <article className={`page-shell ${styles.article} ${compact ? styles.compact : ""}`}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.lead}>{intro}</p>
        </header>
        <div className={styles.content}>{children}</div>
      </article>
    </main>
  );
}

export function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrincipleGrid({
  items,
}: {
  items: readonly { title: string; description: string }[];
}) {
  return (
    <div className={styles.cardGrid}>
      {items.map((item) => (
        <article className={styles.card} key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function StatusPanel({ children }: { children: ReactNode }) {
  return <div className={styles.statusPanel}>{children}</div>;
}
