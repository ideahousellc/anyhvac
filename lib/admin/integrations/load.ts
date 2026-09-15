import { loadResendEmailMetrics } from "@/lib/admin/integrations/resend/metrics";
import type { ResendEmailMetricsSnapshot } from "@/lib/admin/integrations/resend/types";

export type ControlRoomIntegrations = {
  resend: ResendEmailMetricsSnapshot;
};

const RESEND_UNAVAILABLE: ResendEmailMetricsSnapshot = {
  state: "unavailable",
  data: null,
};

export async function loadControlRoomIntegrations({
  loadResend = loadResendEmailMetrics,
}: {
  loadResend?: typeof loadResendEmailMetrics;
} = {}): Promise<ControlRoomIntegrations> {
  const [resend] = await Promise.allSettled([loadResend()]);
  return {
    resend: resend.status === "fulfilled" ? resend.value : RESEND_UNAVAILABLE,
  };
}
