import type { NewsletterSource } from "@/lib/growth/browser";

export const DEFAULT_BEEHIIV_FORM_ID = "e6094995-c70e-4323-9cb8-69c189648725";

export function newsletterFormForSource(source: NewsletterSource, configuredId?: string) {
  const candidate = configuredId?.trim();
  const dedicated = source === "duct-reference-inline" && !!candidate &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate) &&
    candidate.toLowerCase() !== DEFAULT_BEEHIIV_FORM_ID;
  return {
    formId: dedicated ? candidate : DEFAULT_BEEHIIV_FORM_ID,
    // Configuration alone is not evidence of provider-confirmed attribution.
    dedicatedFormConfigured: dedicated,
  };
}
