import { unstable_cache } from "next/cache";

import { retrieveBeehiivNewsletterMetrics } from "@/lib/admin/integrations/beehiiv/client";
import type { BeehiivNewsletterSnapshot } from "@/lib/admin/integrations/beehiiv/types";

export const BEEHIIV_METRICS_CACHE_SECONDS = 15 * 60;

export async function loadBeehiivNewsletterMetricsUncached({
  apiKey = process.env.BEEHIIV_ADMIN_API_KEY,
  publicationId = process.env.BEEHIIV_PUBLICATION_ID,
  fetcher = fetch,
}: {
  apiKey?: string;
  publicationId?: string;
  fetcher?: typeof fetch;
} = {}): Promise<BeehiivNewsletterSnapshot> {
  if (!apiKey || !publicationId) return { state: "not-connected", data: null };

  try {
    const data = await retrieveBeehiivNewsletterMetrics({ apiKey, publicationId, fetcher });
    return { state: "connected", data };
  } catch {
    console.error("Beehiiv newsletter metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}

const loadConfiguredBeehiivMetrics = unstable_cache(
  async (publicationId: string) => {
    const apiKey = process.env.BEEHIIV_ADMIN_API_KEY;
    if (!apiKey) throw new Error("Beehiiv newsletter metrics are not configured.");
    return retrieveBeehiivNewsletterMetrics({ apiKey, publicationId });
  },
  ["admin-control-room-beehiiv-newsletter-metrics-v1"],
  { revalidate: BEEHIIV_METRICS_CACHE_SECONDS, tags: ["admin-beehiiv-metrics"] },
);

export async function loadBeehiivNewsletterMetrics(): Promise<BeehiivNewsletterSnapshot> {
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!process.env.BEEHIIV_ADMIN_API_KEY || !publicationId) {
    return { state: "not-connected", data: null };
  }
  try {
    const data = await loadConfiguredBeehiivMetrics(publicationId);
    return { state: "connected", data };
  } catch {
    console.error("Beehiiv newsletter metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}
