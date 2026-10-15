import { loadBeehiivNewsletterMetrics } from "@/lib/admin/integrations/beehiiv/metrics";
import type { BeehiivNewsletterSnapshot } from "@/lib/admin/integrations/beehiiv/types";
import { loadGoogleSearchMetrics } from "@/lib/admin/integrations/google-search-console/metrics";
import type { GoogleSearchSnapshot } from "@/lib/admin/integrations/google-search-console/types";
import { loadResendEmailMetrics } from "@/lib/admin/integrations/resend/metrics";
import type { ResendEmailMetricsSnapshot } from "@/lib/admin/integrations/resend/types";

export type ControlRoomIntegrations = {
  beehiiv: BeehiivNewsletterSnapshot;
  googleSearch: GoogleSearchSnapshot;
  resend: ResendEmailMetricsSnapshot;
};

const RESEND_UNAVAILABLE: ResendEmailMetricsSnapshot = {
  state: "unavailable",
  data: null,
};

const BEEHIIV_UNAVAILABLE: BeehiivNewsletterSnapshot = {
  state: "unavailable",
  data: null,
};

const GOOGLE_SEARCH_UNAVAILABLE: GoogleSearchSnapshot = {
  state: "unavailable",
  data: null,
};

export async function loadControlRoomIntegrations({
  loadBeehiiv = loadBeehiivNewsletterMetrics,
  loadGoogleSearch = loadGoogleSearchMetrics,
  loadResend = loadResendEmailMetrics,
}: {
  loadBeehiiv?: typeof loadBeehiivNewsletterMetrics;
  loadGoogleSearch?: typeof loadGoogleSearchMetrics;
  loadResend?: typeof loadResendEmailMetrics;
} = {}): Promise<ControlRoomIntegrations> {
  const [resend, beehiiv, googleSearch] = await Promise.allSettled([
    loadResend(), loadBeehiiv(), loadGoogleSearch(),
  ]);
  return {
    resend: resend.status === "fulfilled" ? resend.value : RESEND_UNAVAILABLE,
    beehiiv: beehiiv.status === "fulfilled" ? beehiiv.value : BEEHIIV_UNAVAILABLE,
    googleSearch: googleSearch.status === "fulfilled"
      ? googleSearch.value : GOOGLE_SEARCH_UNAVAILABLE,
  };
}
