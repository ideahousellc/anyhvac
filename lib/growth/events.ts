import type { GrowthEvent } from "@/lib/growth/browser";

export function parseGrowthEvent(value: unknown, now = Date.now()): GrowthEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).sort().join(",") !== "event,placement,viewId,viewStartedAt") return null;
  if (typeof body.viewId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.viewId)) return null;
  if (typeof body.viewStartedAt !== "number" || !Number.isSafeInteger(body.viewStartedAt) || body.viewStartedAt > now + 60_000 || body.viewStartedAt < now - 86_400_000) return null;
  const valid = body.event === "resource_view" ? body.placement === null :
    body.event === "resource_calculator_click" ? typeof body.placement === "string" && ["duct-reference-top", "duct-reference-contextual"].includes(body.placement) :
    body.event === "resource_newsletter_open" && typeof body.placement === "string" && ["duct-reference-inline", "footer", "automatic", "other"].includes(body.placement);
  return valid ? body as GrowthEvent : null;
}
