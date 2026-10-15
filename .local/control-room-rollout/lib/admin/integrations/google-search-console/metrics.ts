import { unstable_cache } from "next/cache";

import { retrieveGoogleSearchMetrics } from "@/lib/admin/integrations/google-search-console/client";
import type { GoogleSearchSnapshot } from "@/lib/admin/integrations/google-search-console/types";

export const GOOGLE_SEARCH_CACHE_SECONDS = 15 * 60;

export async function loadGoogleSearchMetricsUncached({
  clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL,
  privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY,
  property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY,
  fetcher = fetch,
  tokenProvider,
  now = new Date(),
}: {
  clientEmail?: string;
  privateKey?: string;
  property?: string;
  fetcher?: typeof fetch;
  tokenProvider?: Parameters<typeof retrieveGoogleSearchMetrics>[0]["tokenProvider"];
  now?: Date;
} = {}): Promise<GoogleSearchSnapshot> {
  if (!clientEmail || !privateKey || !property) {
    return { state: "not-connected", data: null };
  }
  try {
    const data = await retrieveGoogleSearchMetrics({
      clientEmail, privateKey, property, fetcher, tokenProvider, now,
    });
    return { state: "connected", data };
  } catch {
    console.error("Google Search metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}

const loadConfiguredGoogleSearchMetrics = unstable_cache(
  async (property: string) => {
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
    if (!clientEmail || !privateKey) throw new Error("Google Search is not configured.");
    return retrieveGoogleSearchMetrics({ clientEmail, privateKey, property });
  },
  ["admin-control-room-google-search-metrics-v1"],
  { revalidate: GOOGLE_SEARCH_CACHE_SECONDS, tags: ["admin-google-search-metrics"] },
);

export async function loadGoogleSearchMetrics(): Promise<GoogleSearchSnapshot> {
  const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY;
  if (!process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL
    || !process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || !property) {
    return { state: "not-connected", data: null };
  }
  try {
    const data = await loadConfiguredGoogleSearchMetrics(property);
    return { state: "connected", data };
  } catch {
    console.error("Google Search metrics are temporarily unavailable.");
    return { state: "unavailable", data: null };
  }
}
