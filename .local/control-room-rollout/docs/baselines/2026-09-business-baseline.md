# AnyHVAC Business Baseline #1

## Context

- **Period:** Late September 2026, approximately the first month of AnyHVAC
  operation.
- **Purpose:** Starting reference for future business reporting.
- **Quality:** **DIRTY HISTORICAL BASELINE.** The Cloudflare period contains
  substantial development and admin activity. Future periods after admin analytics
  exclusion must not be compared naively with these totals.

No value below fills a missing measurement by assumption.

## Discovery - Google Search Console

| Classification | Metric | Value |
| --- | --- | ---: |
| MEASURED | Search impressions | 272 |
| MEASURED | Search clicks | 1 |
| MEASURED | Search CTR | 0.37% |
| MEASURED, approximate | Average position | ~70 |

## Audience - Cloudflare historical report

| Classification | Metric | Value |
| --- | --- | ---: |
| MEASURED | Recorded visits | 290 |
| MEASURED | Recorded page views | 610 |
| MEASURED, approximate classification | Known admin page views | ~240 |
| DERIVED | Non-admin page views after simple subtraction | ~370 |
| MEASURED | Google-referred visits | 10 |
| MEASURED | Direct/no-referrer visits | 280 |

The derived non-admin value is `610 - approximately 240 = approximately 370`.
It is not a clean public-audience measurement: development, testing, owner, bot,
or other internal activity may remain in it. The 290 visits and 610 page views must
not be presented as genuine audience totals.

## Audience - newsletter

| Classification | Metric | Value |
| --- | --- | ---: |
| MEASURED | Subscriptions displayed by Beehiiv | 4 |
| MEASURED with owner classification | Owner/testing subscriptions | 4 |
| DERIVED | Genuine external subscribers | 0 |

All displayed subscriptions are owner/testing subscriptions. They are not genuine
external audience growth.

## Revenue

| Classification | Metric | Value |
| --- | --- | ---: |
| MEASURED | Actual Stripe/support revenue | $0.00 |
| DERIVED | First-dollar milestone | $0.00 / $1.00 |

No earned revenue source exists at this baseline.

## Operations and missing data

No clean post-exclusion Cloudflare public baseline, returning-usage measurement,
Core Web Vitals measurement, or quantified email/support workload was supplied for
Baseline #1. These values remain unrecorded rather than estimated.
