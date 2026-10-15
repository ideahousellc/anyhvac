import Image from "next/image";

import styles from "./Admin.module.css";

export function AdminBrand() {
  return (
    <div className={styles.brand}>
      <Image
        src="/Horizontal Logo.png"
        alt="AnyHVAC"
        width={2073}
        height={758}
        priority
      />
      <h1>AnyHVAC Admin</h1>
    </div>
  );
}
