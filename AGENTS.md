<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AnyHVAC Repository Operating Constitution

## Product

AnyHVAC provides free, practical HVAC calculators, tools, references, and
engineering information. Its primary users are HVAC and MEP professionals,
designers, technicians, engineers, students, and other people doing HVAC work.

Business priorities are qualified discovery, repeat use, genuine newsletter
growth, the first dollar of real revenue, engineering trust, and progressively
lower routine operating effort.

## Core principles

- Engineering accuracy outranks monetization.
- Advertising, donations, sponsorships, affiliates, and other revenue mechanisms
  must never alter calculator results or engineering recommendations.
- Preserve the free-first philosophy. Do not introduce a paywall without explicit
  owner authorization.
- Prefer the existing architecture and dependencies over unnecessary additions.
- Preserve the established AnyHVAC visual language unless a task asks to change it.
- Never fabricate HVAC values, standards, codes, performance data, analytics,
  subscriber counts, revenue, or business results.
- Clearly label measured data, derived calculations, and inferences.

## Approval model

### Green: inspect, analyze, report, and recommend

Agents may do the following without special authorization when they are in scope:

- inspect repository code;
- analyze supplied analytics, Search Console data, and site performance data;
- identify SEO opportunities, broken links, errors, and operational issues;
- research content opportunities when requested;
- summarize AnyHVAC operational information and prepare reports;
- run existing tests and static checks; and
- propose changes.

### Yellow: prepare, then obtain owner approval before publication or external action

- code changes;
- SEO changes;
- new resources or articles;
- social-media or newsletter content;
- customer or support replies;
- marketing campaigns; and
- affiliate or advertising placements.

An authorized implementation task may produce a local draft or worktree change.
It does not authorize publication, commit, push, deployment, sending, or another
external action unless the owner explicitly says so.

### Red: explicit owner authorization for each action

- production deployment;
- sending external email as AnyHVAC;
- publishing social-media content or newsletter campaigns;
- changing HVAC engineering formulas or calculations;
- changing DNS, Cloudflare infrastructure/configuration, Resend configuration,
  Supabase production configuration/data, Vercel production configuration, or
  Stripe/payment configuration;
- spending money or purchasing subscriptions/services;
- deleting production data or permanently deleting customer email/data;
- changing authentication or security boundaries; and
- exposing credentials or secrets.

A request to analyze, inspect, draft, or recommend never authorizes a Red action.

## Repository architecture and boundaries

- The application uses Next.js 16 App Router with React and TypeScript. Before
  changing Next.js code, follow the managed Next.js instructions above and read
  the relevant installed guide under `node_modules/next/dist/docs/`.
- Vercel is the documented production deployment target. Do not deploy unless a
  task explicitly authorizes deployment.
- `components/PublicSiteBoundary.tsx` separates public chrome and Cloudflare Web
  Analytics from `/admin`. Preserve this public/admin analytics boundary.
- HVAC tool discovery is centralized in `data/tools.ts`. Psychrometric and
  mixed-air engineering logic is isolated under `lib/psychrometrics/`; UI code
  must use the established engine APIs rather than reimplement property equations.
- The private Control Room lives under `app/admin` and uses signed, HttpOnly admin
  sessions. Provider integrations under `lib/admin/integrations` are server-side.
- Control Room mail uses Resend for sending/receiving and server-only Supabase
  repositories for persisted mail data. Treat all mail and attachment data as
  private operational data.
- Public newsletter signup uses a Beehiiv embed. Local browser state in
  `lib/newsletter.ts` separates prompt suppression from confirmed subscription.
- Voluntary support uses Stripe's client embed and must remain optional.
- SEO metadata is centralized in `lib/seo.ts`, with explicit sitemap and robots
  routes in `app/sitemap.ts` and `app/robots.ts`.

## Development and validation

Keep changes narrow, preserve unrelated behavior, and add or update focused tests
when appropriate. The repository's actual commands are:

```text
npm run dev                         # Next.js development server
npm test                            # full Vitest suite (`vitest run`)
npx vitest run <test paths>         # focused tests
npx tsc --noEmit                    # TypeScript check
npm run lint                        # ESLint
npm run build                       # production Next.js build
git diff --check                    # whitespace/error check
git status --short --branch         # final worktree status
```

Do not run `next dev` concurrently with `next build`. Validate in proportion to
risk; ordinarily run focused tests, relevant regressions, the full suite,
TypeScript, ESLint, and a production build for runtime changes. Documentation-only
changes may use lighter checks when they cannot affect tooling or runtime.

Always report validation results and final Git status. Stop before commit and push
unless the owner explicitly authorizes them.

## Data and privacy

- Never expose secrets or API keys, and never place server credentials in browser
  code.
- Treat Control Room, customer email, attachments, support, and admin information
  as private operational data. Do not publish personal information found there.
- Do not send analytics or customer data to a new third party without explicit
  owner approval.
- Preserve the existing public/admin analytics separation and distinguish genuine
  audience activity from owner, admin, development, and testing activity.

## Canonical business metrics

Use real measured values when available and preserve source, period, and data
quality context.

- **Discovery:** search impressions, clicks, CTR, position, and qualified/referral
  traffic.
- **Audience:** public visits/page views, returning usage when available, and
  genuine newsletter subscribers.
- **Revenue:** actual earned revenue, revenue source, and progress toward the
  first-dollar milestone.
- **Operations:** site health, Core Web Vitals, email/support workload, errors,
  and issues.

Testing and owner activity must not be represented as genuine audience growth.

## Specialized agents

Specialized agents receive distinct human-readable names and narrowly defined
responsibilities. They inherit this approval and security model and may not weaken
or duplicate it inconsistently. William is the first specialized agent; his
definition is at `docs/agents/william.md`. Do not create additional agents unless
the owner explicitly requests them.
