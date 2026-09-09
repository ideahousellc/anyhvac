import Link from "next/link";

import styles from "./EngineeringNotice.module.css";

export function EngineeringNotice() {
  return (
    <aside className={`page-shell ${styles.notice}`} aria-label="Engineering notice">
      <p>
        <strong>Engineering Notice:</strong> Results are for design assistance and
        should be independently verified.{" "}
        <Link href="/engineering-disclaimer">Engineering Disclaimer</Link>
      </p>
    </aside>
  );
}
