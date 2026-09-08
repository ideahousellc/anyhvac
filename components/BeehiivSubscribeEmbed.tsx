"use client";

import Script from "next/script";

import styles from "./BeehiivSubscribeEmbed.module.css";

export function BeehiivSubscribeEmbed() {
  return (
    <div className={styles.embed} aria-label="AnyHVAC newsletter signup form">
      <Script
        id="anyhvac-beehiiv-subscribe-form"
        async
        src="https://subscribe-forms.beehiiv.com/v3/loader.js"
        data-beehiiv-form="e6094995-c70e-4323-9cb8-69c189648725"
        strategy="afterInteractive"
      />
    </div>
  );
}
