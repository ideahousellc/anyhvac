import type { AdminIntegrationSnapshot } from "@/lib/admin/integrations/types";

export type BeehiivNewsletterMetrics = {
  activeSubscribers: number;
  averageOpenRate: number | null;
  averageClickRate: number | null;
};

export type BeehiivNewsletterSnapshot =
  AdminIntegrationSnapshot<BeehiivNewsletterMetrics>;
