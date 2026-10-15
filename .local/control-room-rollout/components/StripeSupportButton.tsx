"use client";

import Script from "next/script";

import styles from "./StripeSupportButton.module.css";

export function StripeSupportButton() {
  return (
    <div className={styles.wrap}>
      <Script
        id="anyhvac-stripe-buy-button"
        async
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="afterInteractive"
      />
      <stripe-buy-button
        buy-button-id="buy_btn_1UDVYHLk8FShz8ORBjswDHQt"
        publishable-key="pk_live_51TcUMJLk8FShz8ORWMJDbSHeQ6mpSeMuTZhvFIkdtNTvYz4TbtDIj6vBKyiFm4xSgsoLtkK3mca8WOOhuZP4kT7000d4ZNSHiT"
      />
    </div>
  );
}
