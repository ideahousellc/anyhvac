import type { AdminIntegrationSnapshot } from "@/lib/admin/integrations/types";

export type ResendEmailMetrics = {
  bounced: number;
  delivered: number;
  deliveryRate: number | null;
  failed: number;
  period: "last-30-days";
  sent: number;
};

export type ResendEmailMetricsSnapshot =
  AdminIntegrationSnapshot<ResendEmailMetrics>;

export type ResendMetricsApiResponse = {
  object: "metrics";
  start_date: string;
  end_date: string;
  metrics: string[];
  totals: {
    bounced: number;
    delivered: number;
    delivery_rate: number;
    failed: number;
    sent: number;
  };
};
