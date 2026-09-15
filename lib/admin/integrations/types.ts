export type AdminProviderId =
  | "cloudflare"
  | "search-console"
  | "beehiiv"
  | "resend"
  | "vercel"
  | "github"
  | "stripe";

export type IntegrationState =
  | "connected"
  | "not-connected"
  | "not-checked"
  | "unavailable";

export type AdminIntegrationSnapshot<T> =
  | { state: "connected"; data: T }
  | { state: Exclude<IntegrationState, "connected">; data: null };

export interface AdminIntegration<T> {
  id: AdminProviderId;
  load: () => Promise<AdminIntegrationSnapshot<T>>;
}

export type AdminMetric = {
  id: "traffic" | "search" | "newsletter" | "email";
  label: string;
  provider: string;
  providerId: AdminProviderId;
  state: IntegrationState;
  value?: string;
};

export type AdminSystemStatus = {
  id: "website" | "deployment" | "email" | "newsletter";
  label: string;
  provider: string;
  providerId?: AdminProviderId;
  state: IntegrationState;
};

export type AdminQuickLink = {
  external: boolean;
  href: string;
  label: string;
  providerId?: AdminProviderId;
};
