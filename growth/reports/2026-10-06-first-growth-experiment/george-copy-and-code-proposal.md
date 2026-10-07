# George: copy and code proposal

October 6, 2026. Copy direction approved; launch withheld. Conversion copy and SEO snippets remain unimplemented. Separate measurement infrastructure was prepared locally after owner authorization; see [instrumentation review](instrumentation-owner-review.md).

## Exact resource copy and placement

Page: `/resources/duct-design-quick-reference`. Insert one inline newsletter section immediately below the existing PDF download panel, outside that panel and before **What's inside**. Keep **Download Free PDF**, its ungated download, and **No signup required** prominent.

Heading: **Get new free HVAC tools and practical references in your inbox.**

Body: **Optional newsletter. The PDF and calculators stay free, with no signup required.**

Button: **Get free tool updates**

The button opens the existing Beehiiv modal via `NewsletterTrigger`. It promises no mailing cadence. Existing footer newsletter and automatic prompt behavior remain unchanged; record them as competing signup entry points.

There are already two calculator links. Keep the secondary action beside the PDF, **Open Duct Calculator**. Improve the existing contextual section after **What's inside** rather than add a third link:

Section heading: **Explore the calculator**

Body: **Use your airflow and design friction rate to explore round and rectangular duct sizes with the free HVAC Duct Calculator. Check fittings, noise, available space, and project requirements before final design.**

Link: **Open HVAC Duct Calculator** (retain the decorative arrow)

Both link destinations: `/tools/duct-calculator`, same tab. Replace the existing **Need an exact duct size instead of a quick reference?** sentence with the body above. This accurately describes the existing tool without implying an exact final design.

## SEO title before and after

Exact current repository title, verified October 6 in `app/tools/duct-calculator/page.tsx`: **HVAC Duct Calculator | AnyHVAC**

Proposed title from the reviewed October 2 report: **HVAC Duct Size Calculator: Round & Rectangular | AnyHVAC**

Canonical URL: `https://www.anyhvac.net/tools/duct-calculator`. Keep H1, description, URL, body, calculator behavior and engineering logic unchanged. Current description remains **Interactive duct sizing tool for airflow, friction rate, velocity, round duct, and rectangular duct design.** The existing `createPageMetadata` helper also updates Open Graph and Twitter titles from the same argument; owner approval must cover that propagation.

The repository establishes the configured title, not Google's displayed title. Capture the rendered production title and search appearance before launch where available. Record when the proposed title appears in search rather than assuming deployment means search adoption. The hypothesis is improved alignment with duct-size and round/rectangular search intent; uplift is unproven.

## Necessary implementation after authorization

The following snippets are drafts, not applied patches. Installed Next.js guides read under `node_modules/next/dist/docs/`: `01-app/01-getting-started/05-server-and-client-components.md`, `01-app/01-getting-started/14-metadata-and-og-images.md`, and `01-app/03-api-reference/02-components/link.md`.

1. Import `NewsletterTrigger` from `@/components/ModalTriggers` into the resource page. Keep the page a Server Component; reuse the trigger's existing client behavior and public modal provider.
2. Insert the section below after the download panel. Add `.newsletterAction` in `app/resources/resources.module.css` with `margin-top: 17px; font-family: inherit; cursor: pointer;`, alongside existing `.secondaryAction` styling. Verify theme and mobile appearance.

```tsx
<ContentSection title="Get new free HVAC tools and practical references in your inbox.">
  <p>Optional newsletter. The PDF and calculators stay free, with no signup required.</p>
  <NewsletterTrigger
    source="duct-reference-inline"
    className={`${styles.secondaryAction} ${styles.newsletterAction}`}
    data-growth-newsletter="duct-reference-inline"
  >
    Get free tool updates
  </NewsletterTrigger>
</ContentSection>
```

3. Replace the existing contextual paragraph with the exact body above. Add `data-growth-calculator="duct-reference-top"` to the existing top calculator `Link` and `data-growth-calculator="duct-reference-contextual"` to the existing contextual `Link`. Preserve CSS classes, destinations and decorative arrow.
4. For the later SEO test, change only the title argument of the Duct Calculator's existing metadata call:

```tsx
title: "HVAC Duct Size Calculator: Round & Rectangular | AnyHVAC",
```

5. Complete William's approved measurement implementation before prospective baseline collection. Data attributes are selectors, **not tracking**. They emit no events. Avoid passing event functions from the Server Component to `Link`; use a narrow approved client component or public-only delegated collector if needed. `NewsletterTrigger` overwrites supplied `onClick` with `openNewsletter`; explicitly compose measurement with that action or observe the marker independently. Preserve public/admin analytics separation and never send emails or form contents in events.

Instrument both existing calculator placements before copy changes. The proposed inline CTA does not exist during baseline, so its baseline opens are not applicable. A zero baseline for a new CTA does not establish uplift. Compare page-wide subscriptions only with consistent attribution and owner/test exclusion definitions.

## Measurement and review requirements

William's companion audit is the measurement gate; use the owner-review package's revised calendar. Measure resource visits; both calculator-link placements separately and aggregated; visit-based calculator click rate; inline newsletter opens; and genuinely confirmed subscriptions attributed to this resource where provider evidence supports it. Modal opens are not subscriptions. Report provider-wide subscriber change separately when resource attribution is unavailable. Exclude owner/test activity. Record ongoing Buffer promotion as a confounder and leave every existing Buffer post untouched.

Owner review covers this exact copy and placement, markers on the two existing links, the SEO title and share-title propagation, and the measurement plan. Draft approval alone does not publish or deploy. Later implementation should verify the modal, ungated PDF, destinations, attribution and exclusions, metadata, both themes/mobile layout, relevant regressions and repository checks. Resource and title changes must be independently reversible while consistent approved measurement remains.

No spending, formula change, payment action, newsletter sending, outreach, production modification, or Buffer action is part of this preparation. Revenue remains a separate measured downstream outcome, not an assumed result of the test.
