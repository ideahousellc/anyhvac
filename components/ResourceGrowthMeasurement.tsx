"use client";

import { useEffect } from "react";
import {
  GROWTH_OPT_OUT_KEY, measurementAllowed, NEWSLETTER_OPEN_EVENT, sendGrowthEvent,
  type CalculatorPlacement, type NewsletterSource,
} from "@/lib/growth/browser";

export function ResourceGrowthMeasurement() {
  useEffect(() => {
    try {
      if (!measurementAllowed({
        enabled: process.env.NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED === "true",
        production: process.env.NODE_ENV === "production",
        pathname: window.location.pathname, hostname: window.location.hostname,
        storage: window.localStorage,
      })) return;
    } catch { return; }
    let viewId: string;
    try { viewId = crypto.randomUUID(); } catch { return; }
    const viewStartedAt = Date.now();
    const sent = new Set<string>();
    function emit(event: "resource_view" | "resource_calculator_click" | "resource_newsletter_open", placement: CalculatorPlacement | NewsletterSource | null) {
      try {
        if (window.localStorage.getItem(GROWTH_OPT_OUT_KEY) === "true") return;
      } catch { return; }
      const key = `${event}:${placement}`;
      if (sent.has(key)) return;
      sent.add(key);
      sendGrowthEvent({ event, viewId, viewStartedAt, placement });
    }
    emit("resource_view", null);
    function click(event: MouseEvent) {
      if (window.location.pathname !== "/resources/duct-design-quick-reference") return;
      if ((event.type === "click" && event.button !== 0) || (event.type === "auxclick" && event.button !== 1)) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[data-growth-calculator]");
      if (link?.getAttribute("href") !== "/tools/duct-calculator") return;
      const placement = link.getAttribute("data-growth-calculator");
      if (placement === "duct-reference-top" || placement === "duct-reference-contextual") emit("resource_calculator_click", placement);
    }
    function newsletter(event: Event) {
      if (window.location.pathname !== "/resources/duct-design-quick-reference") return;
      const source = (event as CustomEvent<unknown>).detail;
      if (source === "duct-reference-inline" || source === "footer" || source === "automatic" || source === "other") emit("resource_newsletter_open", source);
    }
    document.addEventListener("click", click, true);
    document.addEventListener("auxclick", click, true);
    window.addEventListener(NEWSLETTER_OPEN_EVENT, newsletter);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("auxclick", click, true);
      window.removeEventListener(NEWSLETTER_OPEN_EVENT, newsletter);
    };
  }, []);
  return null;
}
