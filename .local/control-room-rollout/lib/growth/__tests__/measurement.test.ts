import { describe, expect, it } from "vitest";
import { measurementAllowed, RESOURCE_PATH } from "@/lib/growth/browser";
import { parseGrowthEvent } from "@/lib/growth/events";
import { DEFAULT_BEEHIIV_FORM_ID, newsletterFormForSource } from "@/lib/growth/newsletter-source";

const now = 1_791_300_000_000;
const view = { event: "resource_view", placement: null, viewId: "d3e15125-4d43-4dc3-a15d-f52f5013ed93", viewStartedAt: now };

describe("private resource measurement contract", () => {
  it("rejects identity data, arbitrary placements, timestamps and malformed IDs", () => {
    expect(parseGrowthEvent(view, now)).toEqual(view);
    for (const body of [
      { ...view, email: "private@example.test" }, { ...view, placement: "https://example.test" },
      { ...view, viewId: "visitor" }, { ...view, viewStartedAt: now - 86_400_001 },
      { ...view, viewStartedAt: now + 60_001 }, { ...view, event: "newsletter_conversion" },
      { ...view, event: "resource_calculator_click", placement: "footer" },
      { ...view, event: "resource_newsletter_open", placement: ["footer"] },
      { ...view, event: "resource_calculator_click", placement: ["duct-reference-top"] },
    ]) expect(parseGrowthEvent(body, now)).toBeNull();
  });
  it("permits only the two calculator placements and separate signup entry points", () => {
    for (const placement of ["duct-reference-top", "duct-reference-contextual"]) {
      expect(parseGrowthEvent({ ...view, event: "resource_calculator_click", placement }, now)).not.toBeNull();
    }
    for (const placement of ["duct-reference-inline", "footer", "automatic", "other"]) {
      expect(parseGrowthEvent({ ...view, event: "resource_newsletter_open", placement }, now)).not.toBeNull();
    }
  });
  it("fails closed for admin, previews, development, owner opt-out and inaccessible storage", () => {
    const allowed = { enabled: true, production: true, pathname: RESOURCE_PATH, hostname: "www.anyhvac.net", storage: { getItem: () => null } };
    expect(measurementAllowed(allowed)).toBe(true);
    for (const options of [
      { ...allowed, enabled: false }, { ...allowed, production: false },
      { ...allowed, pathname: "/admin" }, { ...allowed, hostname: "preview.vercel.app" },
      { ...allowed, storage: { getItem: () => "true" } },
      { ...allowed, storage: { getItem: () => { throw new Error("blocked"); } } },
    ]) expect(measurementAllowed(options)).toBe(false);
  });
});

describe("newsletter attribution readiness", () => {
  it("preserves the current signup form for every existing source", () => {
    const dedicated = "73c01614-764a-45ef-a8ea-0d16d5402cc7";
    for (const source of ["footer", "automatic", "other"] as const) {
      expect(newsletterFormForSource(source, dedicated)).toEqual({ formId: DEFAULT_BEEHIIV_FORM_ID, dedicatedFormConfigured: false });
    }
  });
  it("rejects missing, malformed or default IDs as dedicated attribution", () => {
    for (const configuredId of [undefined, "", "arbitrary-url", DEFAULT_BEEHIIV_FORM_ID, DEFAULT_BEEHIIV_FORM_ID.toUpperCase()]) {
      expect(newsletterFormForSource("duct-reference-inline", configuredId)).toEqual({ formId: DEFAULT_BEEHIIV_FORM_ID, dedicatedFormConfigured: false });
    }
    expect(newsletterFormForSource("duct-reference-inline", "73c01614-764a-45ef-a8ea-0d16d5402cc7").dedicatedFormConfigured).toBe(true);
  });
});
