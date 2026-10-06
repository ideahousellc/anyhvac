export const RESOURCE_PATH = "/resources/duct-design-quick-reference";
export const GROWTH_OPT_OUT_KEY = "anyhvac-growth-measurement-opt-out";
export const NEWSLETTER_OPEN_EVENT = "anyhvac:growth-newsletter-open";
export type NewsletterSource = "duct-reference-inline" | "footer" | "automatic" | "other";
export type CalculatorPlacement = "duct-reference-top" | "duct-reference-contextual";
export type GrowthEvent = {
  event: "resource_view" | "resource_calculator_click" | "resource_newsletter_open";
  viewId: string;
  viewStartedAt: number;
  placement: CalculatorPlacement | NewsletterSource | null;
};

export function measurementAllowed(options: {
  enabled: boolean; production: boolean; pathname: string; hostname: string;
  storage: Pick<Storage, "getItem">;
}) {
  if (!options.enabled || !options.production || options.pathname !== RESOURCE_PATH) return false;
  if (options.hostname !== "www.anyhvac.net" && options.hostname !== "anyhvac.net") return false;
  try { return options.storage.getItem(GROWTH_OPT_OUT_KEY) !== "true"; }
  catch { return false; }
}

export function sendGrowthEvent(payload: GrowthEvent) {
  void fetch("/api/growth/events", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), keepalive: true, credentials: "same-origin",
  }).catch(() => undefined);
}

export function notifyNewsletterOpen(source: NewsletterSource) {
  window.dispatchEvent(new CustomEvent(NEWSLETTER_OPEN_EVENT, { detail: source }));
}
