import { unstable_cache } from "next/cache";

import { retrieveResendEmailMetrics } from "@/lib/admin/integrations/resend/client";
import type { ResendEmailMetricsSnapshot } from "@/lib/admin/integrations/resend/types";

export const RESEND_METRICS_CACHE_SECONDS = 300;

export async function loadResendEmailMetricsUncached({
  apiKey = process.env.RESEND_ADMIN_API_KEY,
  fetcher = fetch,
  now = new Date(),
}: {
  apiKey?: string;
  fetcher?: typeof fetch;
  now?: Date;
} = {}): Promise<ResendEmailMetricsSnapshot> {
  if (!apiKey) return { state: "not-connected", data: null };

  try {
    const data = await retrieveResendEmailMetrics({ apiKey, fetcher, now });
    return { state: "connected", data };
  } catch {
    console.error("Resend email metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}

const loadConfiguredResendMetrics = unstable_cache(
  async () => {
    const apiKey = process.env.RESEND_ADMIN_API_KEY;
    if (!apiKey) throw new Error("Resend metrics are not configured.");
    return retrieveResendEmailMetrics({ apiKey });
  },
  ["admin-control-room-resend-email-metrics-v1"],
  { revalidate: RESEND_METRICS_CACHE_SECONDS, tags: ["admin-resend-metrics"] },
);

export async function loadResendEmailMetrics(): Promise<ResendEmailMetricsSnapshot> {
  if (!process.env.RESEND_ADMIN_API_KEY) {
    return { state: "not-connected", data: null };
  }
  try {
    const data = await loadConfiguredResendMetrics();
    return { state: "connected", data };
  } catch {
    console.error("Resend email metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}
