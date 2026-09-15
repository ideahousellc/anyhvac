import type {
  AdminMetric,
  AdminQuickLink,
  AdminSystemStatus,
  IntegrationState,
} from "@/lib/admin/integrations/types";

export const ADMIN_METRICS: readonly AdminMetric[] = [
  {
    id: "traffic",
    label: "Website Traffic",
    provider: "Cloudflare Web Analytics",
    providerId: "cloudflare",
    state: "not-connected",
  },
  {
    id: "search",
    label: "Google Search",
    provider: "Google Search Console",
    providerId: "search-console",
    state: "not-connected",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    provider: "Beehiiv",
    providerId: "beehiiv",
    state: "not-connected",
  },
  {
    id: "email",
    label: "Email",
    provider: "Resend",
    providerId: "resend",
    state: "not-connected",
  },
];

export const ADMIN_SYSTEM_STATUS: readonly AdminSystemStatus[] = [
  {
    id: "website",
    label: "Website",
    provider: "AnyHVAC",
    state: "not-checked",
  },
  {
    id: "deployment",
    label: "Production Deployment",
    provider: "Vercel",
    providerId: "vercel",
    state: "not-checked",
  },
  {
    id: "email",
    label: "Email",
    provider: "Resend",
    providerId: "resend",
    state: "not-connected",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    provider: "Beehiiv",
    providerId: "beehiiv",
    state: "not-connected",
  },
];

export const ADMIN_QUICK_LINKS: readonly AdminQuickLink[] = [
  { label: "Mail", href: "/admin/mail", external: false },
  {
    label: "Google Search Console",
    href: "https://search.google.com/search-console",
    external: true,
    providerId: "search-console",
  },
  {
    label: "Cloudflare",
    href: "https://dash.cloudflare.com/",
    external: true,
    providerId: "cloudflare",
  },
  {
    label: "Vercel",
    href: "https://vercel.com/dashboard",
    external: true,
    providerId: "vercel",
  },
  {
    label: "Resend",
    href: "https://resend.com/emails",
    external: true,
    providerId: "resend",
  },
  {
    label: "Beehiiv",
    href: "https://app.beehiiv.com/",
    external: true,
    providerId: "beehiiv",
  },
  {
    label: "GitHub",
    href: "https://github.com/ideahousellc/anyhvac",
    external: true,
    providerId: "github",
  },
  {
    label: "Stripe",
    href: "https://dashboard.stripe.com/",
    external: true,
    providerId: "stripe",
  },
];

export function integrationStateLabel(state: IntegrationState) {
  const labels: Record<IntegrationState, string> = {
    connected: "Connected",
    "not-connected": "Not connected",
    "not-checked": "Not checked",
    unavailable: "Unavailable",
  };
  return labels[state];
}
