"use client";

import { useEffect, useRef } from "react";

import styles from "./BeehiivSubscribeEmbed.module.css";
import { DEFAULT_BEEHIIV_FORM_ID } from "@/lib/growth/newsletter-source";

const BEEHIIV_LOADER_URL = "https://subscribe-forms.beehiiv.com/v3/loader.js";

type BeehiivEmbedController = {
  destroy?: () => void;
};

type BeehiivWindow = Window & {
  __bhv_embeds?: Record<string, BeehiivEmbedController>;
};

export function BeehiivSubscribeEmbed({ formId = DEFAULT_BEEHIIV_FORM_ID, dedicatedFormConfigured = false }: { formId?: string; dedicatedFormConfigured?: boolean } = {}) {
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
    script.dataset.beehiivForm = formId;
    container.appendChild(script);

    return () => {
      observer.disconnect();
      const beehiivWindow = window as BeehiivWindow;
      beehiivWindow.__bhv_embeds?.[formId]?.destroy?.();
      script.remove();
      container.replaceChildren();
    };
  }, [formId]);

  return (
    <div
      ref={containerRef}
      className={styles.embed}
      aria-label="AnyHVAC newsletter signup form"
      data-dedicated-form-configured={dedicatedFormConfigured ? "true" : "false"}
    />
  );
}
