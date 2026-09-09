"use client";

import { useEffect, useRef } from "react";

import styles from "./BeehiivSubscribeEmbed.module.css";

const BEEHIIV_FORM_ID = "e6094995-c70e-4323-9cb8-69c189648725";
const BEEHIIV_LOADER_URL = "https://subscribe-forms.beehiiv.com/v3/loader.js";

type BeehiivEmbedController = {
  destroy?: () => void;
};

type BeehiivWindow = Window & {
  __bhv_embeds?: Record<string, BeehiivEmbedController>;
};

export function BeehiivSubscribeEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const iframe = container.querySelector("iframe");
      if (!iframe) return;

      const iframeUrl = new URL(iframe.src);
      if (iframeUrl.searchParams.get("layout") !== "slim") {
        iframeUrl.searchParams.set("layout", "slim");
        iframe.src = iframeUrl.toString();
      }
      observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true });

    // beehiiv inserts an inline form next to the loader script. Keeping the
    // real script node here ensures its generated DOM stays inside the modal.
    const script = document.createElement("script");
    script.async = true;
    script.src = BEEHIIV_LOADER_URL;
    script.dataset.beehiivForm = BEEHIIV_FORM_ID;
    container.appendChild(script);

    return () => {
      observer.disconnect();
      const beehiivWindow = window as BeehiivWindow;
      beehiivWindow.__bhv_embeds?.[BEEHIIV_FORM_ID]?.destroy?.();
      script.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.embed}
      aria-label="AnyHVAC newsletter signup form"
    />
  );
}
