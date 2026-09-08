import Link from "next/link";

import styles from "./EngineeringNotice.module.css";

export function EngineeringNotice() {
  return (
    <aside className={`page-shell ${styles.notice}`} aria-label="Engineering notice">
      <p>
        <strong>Engineering Notice:</strong> AnyHVAC calculators are provided as
        informational and design-assistance tools. Results should be independently
        verified before use in final design, construction, equipment selection,
        permitting, or other safety-critical applications.
      </p>
      <Link href="/engineering-disclaimer">Engineering Disclaimer</Link>
    </aside>
  );
}
