import { loadBeehiivNewsletterMetrics } from "@/lib/admin/integrations/beehiiv/metrics";
import type { BeehiivNewsletterSnapshot } from "@/lib/admin/integrations/beehiiv/types";
import { loadResendEmailMetrics } from "@/lib/admin/integrations/resend/metrics";
import type { ResendEmailMetricsSnapshot } from "@/lib/admin/integrations/resend/types";

export type ControlRoomIntegrations = {
  beehiiv: BeehiivNewsletterSnapshot;
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

export async function loadControlRoomIntegrations({
  loadBeehiiv = loadBeehiivNewsletterMetrics,
  loadResend = loadResendEmailMetrics,
}: {
  loadBeehiiv?: typeof loadBeehiivNewsletterMetrics;
  loadResend?: typeof loadResendEmailMetrics;
} = {}): Promise<ControlRoomIntegrations> {
  const [resend, beehiiv] = await Promise.allSettled([loadResend(), loadBeehiiv()]);
  return {
    resend: resend.status === "fulfilled" ? resend.value : RESEND_UNAVAILABLE,
    beehiiv: beehiiv.status === "fulfilled" ? beehiiv.value : BEEHIIV_UNAVAILABLE,
  };
}
