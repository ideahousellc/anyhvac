import Link from "next/link";

import styles from "./ToolPageIntro.module.css";

type ToolPageIntroProps = {
  title: string;
  description: string;
  eyebrow: string;
  status: string;
};

export function ToolPageIntro({
  title,
  description,
  eyebrow,
  status,
}: ToolPageIntroProps) {
  return (
    <section className={`page-shell ${styles.intro}`} aria-labelledby="tool-title">
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li>
            <Link href="/tools">Tools</Link>
          </li>
          <li className={styles.breadcrumbSeparator} aria-hidden="true">
            /
          </li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>

      <div className={styles.headingRow}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title} id="tool-title">
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </div>
        <span className={styles.status}>{status}</span>
      </div>
    </section>
  );
}
