# William analytics: Stage 1 local reporting

Owner-approved Stage 1 reporting, November 16, 2026. Closeout authorizes committing
and pushing only reusable reporting code, tests, scripts and documentation. No
manual deployment, scheduled job, permission change, new credentials, paid service
or website-event changes. An existing automatic Vercel deployment may follow the
push; verify status and public health without changing production settings.
George's media, publication files and Buffer queue are not modified by this work.
The existing Control Room display/cache remains unchanged. The richer adapter is
invoked by the local report command, not wired into a production route.

## Run the weekly brief

From the repository root, using Node **24+** (tested with installed Node 26.5):

```text
node scripts/analytics/weekly-report.mjs
node scripts/analytics/weekly-report.mjs --supplied .local/analytics/owner-evidence.json
```

No new dependency is installed. The command uses the installed `@next/env`, native
TypeScript stripping and a process-local resolver for the existing `@/` alias.
Node may emit a harmless typeless-package warning; do not change package.json to
silence it. Output files are timestamped JSON and Markdown in `.local/analytics/`.
They are private operational reports, ignored by that directory's `.gitignore`.
Neither `.local/analytics/` (including its local ignore file) nor generated example
reports, environment files or credential JSON belong in the closeout commit.
Existing files are never overwritten. Do not put credentials in supplied evidence.

Read operations only:

- Google: existing service-account authentication and six Search Analytics
  queries, using only `webmasters.readonly`. Missing configuration means no Google
  authentication or API request. JWT authentication uses Google's token endpoint;
  no account, permission, property or indexing request is created.
- Buffer: existing client with its default **mutations disabled**; channel and
  paginated post queries, plus a single metrics-permission probe. No scheduling,
  uploads, reconnects, API-key changes or publication-file writes.
- Supabase: aggregate `SELECT` from `resource_growth_daily`, limited to the report
  week. No individual receipt records, customer data or writes/RPCs.
- Cloudflare, native Buffer Insights, Beehiiv, Stripe, AdSense and indexing:
  dated owner-supplied observations only in this stage. No new provider access.

## Google connection diagnosis and exact property

Initial November 16 inspection found all three local settings absent. After owner
confirmation of the Domain property and existing credential location, all three
settings were securely configured in the ignored root `.env.local`. The original
JSON remains outside the repository; no credential values are recorded here.

| Setting | Required value/origin |
|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | Email of an existing approved Google service account |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | Its existing approved private key, supplied securely; literal or escaped newlines supported |
| `GOOGLE_SEARCH_CONSOLE_PROPERTY` | `sc-domain:anyhvac.net` (owner confirmed, configured locally) |

AnyHVAC uses the confirmed **Domain property**, **`sc-domain:anyhvac.net`**.
Do not substitute the website URL or create a URL-prefix property. Domain reporting
can include other protocols/subdomains and is not automatically canonical-host-only.
The implementation allows those two explicit identifiers and reports the one used.

**Connected, November 16 at 21:55 UTC:** the supplied existing JSON file was found,
its account and project matched the owner's confirmation, and the private key
parsed locally. The search-only test and combined weekly report both succeeded.
The owner reports Restricted property access; actual performance retrieval now
confirms sufficient read access. No credentials were rotated or generated and no
permissions were changed by the agent. Production configuration is unchanged.

### Exact owner steps (no credentials in chat)

1. Property identification is complete: use `sc-domain:anyhvac.net`.
2. Check the existing approved Google Cloud project/service account and existing
   secure credential storage. Inspect whether the **Google Search Console API** is
   already enabled. Do not create an account/key or enable an API during inspection.
3. If approved existing credentials exist, authorize their **local configuration**
   and place the three settings above in the existing ignored root `.env.local`
   through the established secure workflow. Keep them server/local only; never
   use `NEXT_PUBLIC_`, paste keys into chat, print them, commit them or put them in
   a report. Following explicit owner authorization, the agent configured the
   existing email/key locally from the supplied external JSON, without displaying
   them. The walkthrough below remains available for future approved setup.
4. Check Search Console **Settings → Users and permissions** for that exact service
   account email. If absent, the owner can choose **Restricted** access after
   explicitly deciding to make that permission change; the agent will not do it.
   Restricted users can view Performance reports. Do not grant Full or ownership
   for this read-only reporting task. Existing higher access should not be changed
   or removed automatically. See the steps below.
   OAuth scope alone does not establish property access. If there are no approved
   credentials or the API is disabled, stop and approve a separate setup plan;
   generating keys/accounts or changing permissions is outside Stage 1.
5. After authorized setup, rerun the local command. It will report safe categories:
   `authentication-failed`, `unauthorized` (HTTP 401), `forbidden` (403),
   `rate-limited` (429), `timeout`, `invalid-response`, or `provider-error`.
   A 403 can have multiple causes; it is not automatically proof of one permission
   fault. Provider bodies, raw exceptions, tokens and private keys are suppressed.
   A read-only [Sites list](https://developers.google.com/webmaster-tools/v1/sites/list)
   can establish the exact identifier/access if a property mismatch remains.

Until then, use Search Console Performance → Search results → **Web** → date range
and Compare → Previous period, then export the chart and Queries/Pages tables.
Exports to CSV/Sheets are free. Record actual dates and export time; do not copy the
old three-month baseline into a current-week field.

### Windows walkthrough: reuse an existing approved service account

**Start with step 1 only.** No need to paste keys into chat or install anything.

1. In the existing Google Cloud project, open **IAM & Admin → Service Accounts**.
   Check for an existing approved AnyHVAC reporting account. Record its email
   privately. Do not click Create service account, Add key or Create new key.
   Tell William only whether one exists and whether you still have its original
   approved JSON key in your secure storage. Google cannot show an old private
   key again; a listed key ID is not a recoverable private key.
2. If an existing approved JSON key is available, open it locally in a trusted
   editor, outside this chat. Verify its `type` is `service_account`; use its
   `client_email` and `private_key`. A normal Google sign-in, API key, client-secret
   OAuth download or gcloud user ADC is not interchangeable with this adapter's
   service-account key. If no reusable approved key exists, **stop**: preparing
   new credentials requires a separately approved plan.
3. Open `C:\Projects\anyhvac\.env.local` in your local editor. Preserve all other
   settings. Leave the existing property line as:
   `GOOGLE_SEARCH_CONSOLE_PROPERTY=sc-domain:anyhvac.net`.
   Add exactly these two variable names with the existing approved JSON values:
   - `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`: the JSON `client_email`, enclosed in
     double quotes.
   - `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`: copy the JSON `private_key` string,
     including its surrounding double quotes and literal `\n` escapes, onto one
     line after `=`. Do not copy `private_key_id` or the entire JSON object.
   Use no spaces around `=`. Save locally; do not paste either value into a
   terminal command, chat, screenshot, report, Git change or `NEXT_PUBLIC_` variable.
   The JSON key and `.env.local` remain private; do not move keys into `public/`.
4. Read-only check in Cloud Console: **APIs & Services → Enabled APIs & services**.
   Confirm **Google Search Console API** is already enabled for that account's
   project. Do not enable an API or change Google Cloud IAM roles during this
   inspection. If disabled, report that prerequisite for separate approval.
5. If property access is missing and the owner elects to grant it: as an existing
   **property owner**, open Search Console → choose **anyhvac.net (Domain property)**
   → **Settings → Users and permissions → Add user** → enter the service account's
   exact `client_email` → choose **Restricted** → **Add/Save**. This is an actual
   permission change by the owner, not an action performed or implied by these
   instructions. Do not add the personal owner email by mistake. If the account
   is already listed with sufficient access, skip adding it. If Restricted is
   unavailable or Google rejects the account, stop rather than selecting a broader
   role. No DNS verification, ownership grant or domain-wide delegation is needed
   for adding this user to the already verified property.
6. Open PowerShell in `C:\Projects\anyhvac` and run:

   ```text
   node scripts/analytics/test-search-console.mjs
   ```

   This search-only test calls the existing read-only adapter, never Buffer or
   Supabase. It refuses a property other than the confirmed Domain identifier.
   Missing settings or connection failures produce safe diagnostic categories
   and exit code 2; a local execution failure produces code 1. On success it prints
   actual period totals and saves the complete private report under ignored
   `.local/analytics/search-console-<timestamp>.json`. It never prints credentials,
   access tokens or raw Google error bodies. Each invocation reloads local settings.
7. After success, run `node scripts/analytics/weekly-report.mjs` for the combined
   brief. No deployment or local web server is needed for either command.

Google documents Restricted-user access to Performance and owner-only user grants
in [Users and permissions](https://support.google.com/webmasters/answer/7687615?hl=en).
Reusable JSON-key handling is described in Google's
[service-account authentication guide](https://developers.google.com/identity/protocols/oauth2/service-account).

Domain-confirmation follow-up validation: the search-only test confirmed the
configured Domain identifier and returned `missing-configuration` for only the
email and private-key settings, without contacting Google. Script syntax and
ESLint checks passed; 94 Search Console-related tests passed. The local adapter
implementation is unchanged by this follow-up; no application rebuild was needed
for the documentation, ignored property setting and standalone test script.

## Reporting dates and limits

- Audience/social/resource week: seven **completed Eastern calendar days** ending
  yesterday. On November 16: **November 9–15, 2026**. Buffer counts use `sentAt`,
  never scheduled `dueAt` as a substitute for actual sent time. Sent records without
  usable `sentAt` are excluded and flagged as an incompleteness risk.
- Upcoming Buffer queue counts are a point-in-time snapshot, separately labeled.
  `sent` is Buffer's provider status, not independent native-network verification.
- Google dates: **Pacific Time**, inclusive. Policy: end three Pacific calendar
  days before today and request `dataState: final`, Web only. On November 16:
  current **November 7–13**, previous **October 31–November 6**, context
  **October 17–November 13**. Context is also split into four adjacent seven-day
  count summaries. DST is handled by calendar dates, not 168-hour arithmetic.
- Six parallel queries: 28-day total, 28-day daily rows, current-week total,
  previous-week total, current-week queries and current-week pages. The overall
  report deadline is 15 seconds. A failed subquery fails the Google report rather
  than publishing a partly successful table as complete.
- Top 10 query/page rows are ordered by clicks; ties are not a meaningful ranking.
  This is deliberately a compact top-row report, not exhaustive pagination or an
  indexing inventory. Low-click/high-impression opportunities may need an export.
- Page rows use **byPage** aggregation; other queries use **byProperty**. Query
  privacy omissions, API limits and aggregation differences mean breakdown totals
  do not necessarily match unfiltered totals. Never add them together.
- CTR is provider ratio × 100. Period position comes from the provider period
  aggregate, never an unweighted mean of daily positions. Count changes show
  absolute and percentage differences; percentage change with prior zero is
  undefined. CTR change uses percentage points; negative position change improves.
- Daily rows omitted by Google are left omitted, not synthesized. Context trend
  sums explicitly describe returned rows and include returned-day counts. A lag
  policy is not certification that every requested date is available.
- Resource counts use the existing Eastern `metric_day`. They cover only the duct
  design reference and are not unique people or sitewide calculator engagement.
  Missing metric/day rows remain unknown until coverage is verified. Automatic
  newsletter opens are not subscriptions or explicit user intent.
- Owner/dev/test/bot contamination and blocking may affect audience/event data.
  Stage 1 adds no exclusions or tracking. No subscription is inferred from an
  embed/modal interaction and no donation is inferred from a support click.
- The Nov. 9 trailing-three-month Search Console baseline remains historical;
  its exact start date was not supplied. Do not compute weekly growth against it.

## Weekly cadence and George handoff

Intended routine: run the weekly command manually **Friday at 09:00 Eastern**,
before George prepares the following Monday–Sunday publication batch. This is a
working cadence, not an installed scheduled job. The command computes its dates
at run time; do not hardcode the November 16 windows into future reports.

1. Run `node scripts/analytics/test-search-console.mjs` if connection diagnostics
   are needed, then `node scripts/analytics/weekly-report.mjs` for the brief.
2. The owner supplies any available native Buffer Insights/Cloudflare snapshots,
   confirmed subscriber totals, actual revenue and dated AdSense/indexing status.
   William can enter those observations into the supported optional supplied JSON
   and rerun with `--supplied`; owner involvement targets under 10 minutes.
3. William prepares a short **private** George handoff under `.local/analytics/`,
   stating source, retrieval time, exact periods, strongest returned signals,
   three evidence-backed topics, approved tool/resource links and limitations.
   Read the all-zero-click/top-row tie warning before interpreting search rankings;
   use the separately documented paginated export/read when necessary.
4. Present the handoff to the owner and give George its private path in his content
   planning context. Do not email, publish, commit analytics reports or automatically
   submit tasks/messages. George reads it as planning input, not publishing approval.
   No new newsletter/social publication, scheduling or account permission follows
   from a report. Do not write into George's existing publication files.

The November 23–29 handoff uses the last available finalized Google week as of
November 16, not a forecast of November 23–29. Refresh Friday November 20 before
finalizing that batch if newer finalized evidence is available.

## Buffer permissions and the safe free fallback

Read-only probe on November 16 returned:

```text
Required: insights:read
Granted: account:read, posts:read, posts:write
```

The publishing key works and was not modified. Buffer calls the UI permission
`insightsRead`; the GraphQL error spells it `insights:read`. Personal API keys can
have this permission. OAuth app clients cannot request it.

**In-place addition to this existing personal key is not established.** Current
documentation explains inspecting an existing key's permission count, choosing
permissions when generating a key, and regenerating/replacing keys. Its separate
discussion of editing app-client scopes does not establish editable personal-key
scopes, and app clients cannot obtain insights anyway. Do not claim reauthorization
will fix this. Regenerating a key immediately revokes the old one and risks the
publishing workflow. No rotation, replacement or reconnect is proposed for Stage 1.

Owner may inspect Settings → API → Personal Access → the existing key's permission
count without editing it. If an actual in-place scope control is available, stop
and approve that exact change while preserving current permissions. Otherwise
remain on manual Insights; no publishing-key disruption is justified for reporting.

Free weekly fallback, web dashboard:

1. Open Insights for each existing LinkedIn, Instagram and YouTube channel.
2. Select Last 7 days; record the actual dates, channel, capture time and available
   metrics. Check that this is the AnyHVAC account, not sample/preview analytics.
3. Use **Export → Download Snapshots**, free on all plans, or record the visible
   values. Do not use Share as Post (that opens a publishing workflow).
4. Supply the snapshots, or enter supported values in the evidence file below.
   Preserve missing metrics as null, not zero. Keep channel metrics separate when
   definitions differ. Free presets may not match the completed-week report exactly;
   retain their own dates rather than silently aligning them.

Custom ranges and CSV/Markdown/PDF exports require paid features; no purchase is
needed. Buffer API post metrics remain experimental and unsuitable as the sole
weekly reporting source. The CLI probes availability but does not sum lifetime
post metrics into weekly reach or clicks.

## Supplied evidence contract

Optional JSON accepts only `cloudflare`, `bufferInsights`, `bufferLinkedin`,
`bufferInstagram`, `bufferYoutube`, `beehiiv`, `stripe`, `adsense`, and `indexing`.
Each supplied block must contain `state: "available"`,
`source`, `checkedAt` (timestamp), `startDate`, `endDate`, `timezone`, `values`, and
nonempty `notes` describing exclusions/definitions. Preserve the original provider
dates and capture time; old observations must remain old. Omit unavailable blocks.
For status/subscriber snapshots, use the observation date for both range endpoints.

Supported values:

| Provider | Keys |
|---|---|
| Cloudflare | visits, pageViews, topLandingPages, topTrafficSources |
| Buffer native Insights | channel, reach, impressions, engagements, linkClicks, saves |
| Buffer LinkedIn / Instagram | reach, impressions, engagements, linkClicks, saves |
| Buffer YouTube | views, impressions, engagements, linkClicks, watchTimeMinutes |
| Beehiiv | activeSubscribers, confirmedNonTestSubscribers, netChange |
| Stripe | earnedRevenue, donations, refunds, currency |
| AdSense | status, earnedRevenue, currency |
| Indexing | indexed, excluded, redirects, requestedUrlsStatus |

Values are numeric observations, descriptive strings, or null. Revenue requires
an explicit three-letter currency. Revenue notes must identify actual/settled
amounts, gross/net basis, refunds and tests. Do not claim non-test subscriber totals
unless exclusions are confirmed. Counts are not deduced from missing rows.
Use the separate Buffer channel blocks when reporting multiple channels; each
keeps its own dates and freshness. `bufferInsights` can alternatively hold one
explicitly labeled provider all-channel snapshot. Do not add overlapping blocks
or non-comparable reach figures together. No native snapshot values were supplied
for this implementation's example report. The owner can simply supply the native
snapshots; William can transcribe their observed values into this contract. The
owner does not need to assemble the JSON manually.

Target owner routine after setup: under 10 minutes weekly to supply the remaining
provider snapshots and approve the three next actions. This is a workflow target,
not a measured time guarantee. No new dashboard or integration subscription needed.

## Official references checked November 16

- [Google query parameters/property identifiers](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [Google data limits and aggregation](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)
- [Google free report exports](https://support.google.com/webmasters/answer/12919797?hl=en)
- [Buffer key permissions and replacement effects](https://support.buffer.com/en-us/articles/how-to-create-your-buffer-api-key-ShIgYVwM6j)
- [Buffer free Insights and snapshot exports](https://support.buffer.com/en-us/articles/using-insights-in-buffer-x4gLauQU5a)
- [Buffer API experimental metrics limitations](https://support.buffer.com/en-us/articles/using-buffers-api-GtIYIQilz5)

## Validation and review boundary

Focused tests cover date/DST boundaries, correct page aggregation, totals versus
breakdowns, empty versus unavailable data, zero denominators, malformed responses,
timeouts, safe error categories, source/freshness preservation and supplied-data
validation. Run full tests, TypeScript, lint and production build for owner review.
The live Google connection subsequently passed after owner-authorized configuration.
Owner-approved closeout permits a narrow commit/push of the reusable Stage 1 files;
credentials, private reports, unrelated files and George's publications are excluded.
Manual deployment and production-setting changes remain unauthorized.

Validation completed locally:

- Focused Search Console/report tests: 106 passed.
- Current-project suite (`npx.cmd vitest run --exclude '**/.local/**'`): 680 passed,
  4 skipped across 73 files. The literal `npm.cmd test` also discovers preserved
  `.local` copies: 49 failures confined to those copies (1846 passed, 12 skipped).
  Copies and Vitest configuration were left unchanged.
- `npx.cmd tsc --noEmit`: passed; `npm.cmd run build`: passed.
- Changed-file ESLint: no errors/warnings. Current-project lint excluding `.local`:
  zero errors, five warnings in unrelated files. Literal `npm.cmd run lint` scans
  generated files inside preserved `.local` copies and fails with 1181 errors and
  15093 warnings. No automatic fixes, deletions or ignore-configuration changes.
- The initial local report retrieved live Buffer publication/queue counts and
  Supabase aggregates while Google configuration was missing. After authorized
  setup, both Google test and combined report retrieved real Search Analytics
  data successfully. Buffer metrics remain denied; publishing key unchanged.
- `git diff --check`: passed. No changes to George's publication files, queue,
  channels, credentials, public UI or event collection. No commit/push/deploy.

Authentication completion changed only the three approved local Google settings
and this status documentation; it made no Google permission, credential rotation,
production, HVAC or Buffer queue changes. Live reports remain ignored and private.
The November 7–13 report has all-zero clicks, so its click-ranked top-10 query/page
lists are subject to arbitrary provider ties. A separate read-only, paginated
breakdown retrieved 34 query rows and 12 page rows and ranked them by impressions
for the owner's brief. That companion JSON is under `.local/analytics/` and does
not alter the reusable reporting code. Privacy/API omissions still apply; search
performance rows are not an indexing inventory.
