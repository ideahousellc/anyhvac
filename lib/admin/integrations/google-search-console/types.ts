import type { AdminIntegrationSnapshot } from "@/lib/admin/integrations/types";

export type GoogleSearchDay = {
  date: string;
  impressions: number;
  clicks: number;
};

export type GoogleSearchMetrics = {
  impressions: number;
  clicks: number;
  ctr: number | null;
  averagePosition: number | null;
  daily: GoogleSearchDay[];
  startDate: string;
  endDate: string;
  period: "last-28-days";
};

export type GoogleSearchSnapshot = AdminIntegrationSnapshot<GoogleSearchMetrics>;
