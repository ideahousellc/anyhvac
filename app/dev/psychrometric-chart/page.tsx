import type { Metadata } from "next";

import { PsychrometricCalculator } from "@/components/psychrometrics/PsychrometricCalculator";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Psychrometric Calculator Development",
  robots: { index: false, follow: false, nocache: true },
};

export default function PsychrometricChartDevPage() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Internal development route</p>
        <h1>Psychrometric calculator</h1>
        <p>
          Define one air state, review the complete calculated result, and locate
          it on the pressure-specific chart.
        </p>
      </header>
      <PsychrometricCalculator />
    </main>
  );
}
