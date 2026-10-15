# William measurement handoff — October 12–18 weekly social batch

**Status:** all 13 approved posts independently verified SCHEDULED. None is yet confirmed PUBLISHED. Exact provider IDs, platform/channel, Eastern scheduled time, caption, ordered media and destination are preserved in `publication-record.json`; final queue verification is in `scheduling-verification.json`. A durable append-only journal also resides at `growth/distribution/buffer/records.jsonl`, with this batch’s backup in `scheduling-journal-backup.jsonl`.

**Deployment context:** media-only commit `6eb05268e9cecfcdc3ad8e4abe5ef59651d76a01`; Vercel deployment `dpl_Gy3HxHdsZVjaV79SUGemQ7Q82zUG`, production READY on `www.anyhvac.net` at verification 2026-10-07T13:46:48.568Z. Twenty assets verified HTTP 200, correct MIME types and approved SHA-256. Production environment fingerprint unchanged, both measurement flag entries retained. No application code, analytics configuration, Beehiiv, CTA or SEO experiment changes. Media verification used downloads/HEAD requests without executing site analytics JavaScript.

## Collection procedure

1. After each scheduled time, independently confirm platform publication. Record actual publication timestamp and public URL; a scheduled status is not successful publication. Preserve failed/missing/late confirmation as such. No new monitoring automation was created.
2. Collect free native post analytics at 48 hours and seven days **after actual publication**, with source, export timestamp, post ID, reporting period, metric availability and denominators.
3. Promotional packages: separately available LinkedIn link clicks are primary. If only total clicks are exposed, label them as a proxy; do not count every click as a destination visit. Report YouTube engaged views and Instagram saves separately.
4. Six-slide carousels: Instagram saves/reached accounts, plus absolute saves and reach. LinkedIn engagement and destination referrals are secondary. Avoid comparisons across platforms without matching metric definitions.
5. Main 28-second video: YouTube average percentage viewed, engaged views and retention where available; record absent exports as unknown. Report Instagram/LinkedIn video metrics separately.
6. Existing destination page/referrer totals provide aggregate traffic context. No new UTMs, paid analytics or attribution system was added; native clicks and site views are not individual-level attribution. Instagram caption/Shorts description links are not assumed clickable. Confirmed newsletter attribution remains limited; no signups may be inferred from views or clicks.

## Baseline interpretation

Continue the existing resource baseline unchanged. No post links to the Duct Design Quick Reference. Do not reset or alter baseline counters, exclusions, dates or flags. The approved Duct Calculator video goes out October 16 at 15:00 LinkedIn, 16:00 YouTube and 18:00 Instagram EDT: log this social exposure when interpreting calculator traffic and future search outcomes. Social activity can change aggregate discovery; it does not establish SEO experiment effects. The pending resource CTA and calculator SEO-title experiment remain unlaunched.

## Package map

| Package | Platforms | Existing destination | Primary reading |
|---|---|---|---|
| `promo-pressure-reference` | LI / IG / YT | Airflow & Static Pressure Measurement resource | Separately available LI link clicks |
| `carousel-supply-outdoor` | LI / IG | Air Distribution Tools | IG saves/reach |
| `promo-project-pressure` | LI / IG / YT | Psychrometric Calculator | Separately available LI link clicks |
| `carousel-dewpoint-wetbulb` | LI / IG | Psychrometric Calculator | IG saves/reach |
| `main-nominal-size` | LI / IG / YT | HVAC Duct Calculator | YT average percentage viewed |

Exact approved copy and rights records remain in `packages.json`; exact schedule in `calendar.json`; immutable asset inventory in `media-manifest.json`; full approved API inputs/settings and owner authorization in `execution-package.json`. Keep public media available through publication and subsequent review; do not delete it to reclaim queue capacity. Handoff prepared locally; performance collection has not yet occurred.
