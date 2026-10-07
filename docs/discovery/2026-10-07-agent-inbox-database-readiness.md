# Agent Inbox: database readiness and proposed rollout

**Ready for a controlled owner-authorized rollout, with the limitations below.** No production database, configuration, application deployment, Buffer record or measurement was changed. Inbox remains disabled by default. Nothing was staged, committed or pushed.

## Validation performed October 7, 2026

An independently initialized PostgreSQL **17.11** cluster under ignored `.local/agent-inbox/database-validation/pgdata` listened only on `127.0.0.1:55441`. Existing PostgreSQL binaries were reused; no packages were installed. Separate database: `anyhvac_agent_validation`. Supabase roles were modeled with unprivileged `anon`/`authenticated` and `service_role BYPASSRLS`. This is real PostgreSQL validation, **not an actual Supabase/PostgREST deployment**.

| Check | Result |
| --- | --- |
| Migration on clean database inside transaction | Passed |
| Owner hash, nonnegative revision, object/tasks-array envelope, 200-task bound | Invalid fixtures rejected |
| Owner row primary key/index, enabled and forced RLS, zero allow policies | Verified in catalog |
| RPC security invoker and role grants | Verified; service role cannot delete; browser roles cannot select/insert/update/delete/invoke RPC |
| Accidental anon SELECT grant | Forced RLS still returned zero rows; test grant rolled back |
| Concurrent CAS | 12 simultaneous calls against one revision: exactly one winner, one increment; second owner's row unchanged |
| Actual Supabase SDK/storage adapter | Passed through loopback validation REST transport into PostgreSQL |
| Durable identity/message/execution records | George and William stable IDs, prompts, response, thread/version/token metadata and failure state persisted and reloaded through new store instances |
| Concurrent duplicate submission and task claim | Five identical submissions produced one task; five claims produced one winner |
| Start/replay/recovery | Duplicate start denied; expired started work failed for review; saved result recovered with original fence; repeated result delivery idempotent; closed failed attempt stayed failed |
| Owner scope | Different configured owner read an empty document; server chooses owner, never browser body |
| Rollback and clean reapply | Dropped only new function/table; unrelated sentinel survived; reapplied migration yielded empty inbox |
| Complete application suite with DB test enabled | **58 files / 565 tests passed** |
| TypeScript | Passed |
| Lint | Zero errors; four existing unrelated warnings |
| Production build, Inbox disabled | Passed |
| Git whitespace check | Passed |

The underlying storage is one JSON document per owner. Conversation/message/task relationships and legal state transitions are enforced by server code, not normalized SQL foreign keys or per-task SQL constraints. The database enforces the document envelope, revision and owner-key uniqueness. This accepted pilot architecture supports low-volume use; SQL alone does not validate every embedded task field. Service-role access bypasses RLS by design: it is **not** per-owner database isolation. Existing signed owner sessions, server-only credentials and server-selected owner hashes provide that boundary. A compromised service-role credential has broader existing database privileges and must remain private.

Owner route tests verify unauthenticated reads/writes fail, cross-origin writes fail, unknown fields/agents are rejected, leases are stripped and responses are private/no-store. Runner endpoint uses separate bearer authentication, rejects browser Origin headers and exposes only bookkeeping operations. The production browser is not given a Supabase client or service key. Direct anon/authenticated SQL access was tested as denied.

Credential flow review: server credentials stay in server-only modules/environment; runner token is used only for outbound endpoint authentication; Codex receives an allowlisted runtime environment and curated repository text, never production keys or runner token. Execution metadata accepts only thread UUID, definition hash and numeric usage; no credential field. The database integration credential canary was absent from persisted payloads. Private review config, cached Codex authentication, journals and screenshots stay ignored/local. **Arbitrary owner prompts and model replies are stored verbatim:** no guarantee can prevent an owner from manually pasting a secret. Do not enter credentials in conversations. The POC's tool-free Codex/browser verification was not rerun as paid inference during this database validation.

## Reproduce locally

Use a new disposable cluster, never an existing or production database. Initialize with existing PostgreSQL `initdb`, start with `pg_ctl -D PATH -l LOG -o "-h 127.0.0.1 -p 55441" start`, and keep the validation ports free. The script requires a clean cluster because it creates its own roles/database; do not blindly retry a partially completed run.

```text
node scripts/agents/validate-database.mjs PATH_TO_PSQL
```

Then set `AGENT_VALIDATION_PSQL=PATH_TO_PSQL` only in the test process and run `npm test` (Windows: `npm.cmd test`). This enables `lib/agents/__tests__/database.test.ts`; otherwise it is explicitly skipped. Its REST adapter binds loopback port 55442, uses only a fake test key and launches psql only against the named local validation database. No production `.env.local` values are used by that adapter. Local evidence: `.local/agent-inbox/database-validation/sql-result.json`. Stop the isolated cluster after testing. Trust authentication is acceptable only for this disposable loopback fixture, not production.

## Exact proposed commit inventory: 26 files

Modified existing files:

```text
.gitignore
app/admin/page.tsx
components/admin/ControlRoomDashboard.tsx
```

New implementation, tests and directly related review records:

```text
app/admin/agents/page.tsx
app/api/admin/agents/route.ts
app/api/agent-runner/route.ts
components/admin/AgentInbox.module.css
components/admin/AgentInbox.tsx
lib/agents/types.ts
lib/agents/registry.ts
lib/agents/state.ts
lib/agents/storage.ts
lib/agents/http.ts
lib/agents/__tests__/state.test.ts
lib/agents/__tests__/routes.test.ts
lib/agents/__tests__/runner.test.mjs
lib/agents/__tests__/database.test.ts
scripts/agents/runner.mjs
scripts/agents/runner-core.mjs
scripts/agents/local-review.mjs
scripts/agents/local-runner.mjs
scripts/agents/browser-review.mjs
scripts/agents/validate-database.mjs
supabase/migrations/20261007000100_create_agent_inbox.sql
docs/discovery/2026-10-07-agent-inbox-phase1-owner-review.md
docs/discovery/2026-10-07-agent-inbox-database-readiness.md
```

Excluded: the earlier communication/continuity/POC discovery reports and `docs/discovery/george-continuity-poc.mjs`; all 25 existing untracked weekly-content artifacts under `growth/promotions/2026-10-12-18/`; `.local/`, `.env.local`, `growth/.generated/`, screenshots, DB cluster/logs, test credentials, runner workspace/journals, caches, `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, private publication records and reference copies. No dependency changes. Canonical existing role definitions remain reused unchanged. Review exact staged paths/diff again only after commit authorization; this is an inventory, not staged work.

## Production rollout proposed for separate authorization

1. Keep runner stopped and `AGENT_INBOX_ENABLED` absent/false. Confirm production backup/restore availability, stable `ADMIN_USERNAME`, approved stable runner ID and tested Node/Codex versions. No live runner token in a report or Git.
2. Apply **only** `20261007000100_create_agent_inbox.sql` in an explicit transaction using the production migration workflow. Confirm browser roles have no access, RLS is enabled/forced, existing service role has BYPASSRLS and RPC/table grants match review. Do not create/change Supabase's existing roles. If any result is ambiguous, stop and inspect rather than reapply.
3. Stage only the 26 approved paths, inspect exact staged diff and secret exclusions, commit, verify commit tree, then push main under separate authorization. Let existing Vercel deployment complete with Inbox disabled. No other configuration or application changes.
4. Verify production health, existing owner login/Control Room, calculators/resources and newsletter UI. Inspect existing Buffer/measurement code paths for regressions without mutating queued posts or injecting audience events. Disabled Inbox endpoints should refuse use. Check no Agent Inbox client credentials exist in served bundles. Verify actual Supabase PostgREST access using server-side test only.
5. Set server-only `AGENT_RUNNER_TOKEN` (random >=32 characters) on Vercel and the trusted local worker; reuse existing server-only Supabase URL/key. Set `AGENT_INBOX_STORAGE=supabase` or leave unset. Do not rename `ADMIN_USERNAME`; its hash binds history. Enable only after disabled-stage checks pass, using `AGENT_INBOX_ENABLED=true` and the required deployment/configuration refresh. Never use NEXT_PUBLIC credentials.
6. Owner-only smoke test: sign in, open Agents, submit one harmless read-only George question with runner stopped. Confirm pending/offline and refresh persistence. Verify anonymous/cross-origin access denied. Public/site analytics must remain separated from admin QA.
7. Start trusted local runner manually against production HTTPS with approved ID/binary/token. Verify heartbeat, one fenced start, completed reply, matching stable agent/task/execution metadata and refreshed history. Repeat minimally with William. Re-submit the same request ID to confirm no duplicate inference. Stop runner to verify offline status and preserved history. Inspect server-only Supabase records/transport behavior and logs without copying private payloads into public reports.
8. Leave the runner in the explicitly agreed manual operating mode only after owner smoke checks pass. No public worker listener, tunnel, cloud service or automatic task generation. Record deployment and acceptance evidence privately.

## Rollback and limitations

Stop local runner and disable Inbox first (redeploy configuration if required). Reconcile active permits, local saved results and uncertain executions; do not retry inference or delete locks without evidence. Roll back application commit only if necessary, leaving the new storage intact. Export/retain private history before destructive database rollback. With further authorization, database rollback is:

```sql
begin;
drop function public.agent_inbox_compare_swap(text, bigint, jsonb);
drop table public.agent_inbox_documents;
commit;
```

This drops all Inbox history and must never be used merely to hide a deployment error. No CASCADE and no existing table/schema/provider rollback. Tested rollback preserved an unrelated table. Reapply recreates empty storage, not prior history; restoration needs the retained backup. Migration itself is intentionally not idempotent; inspect database state after an ambiguous apply.

Remaining limits: real hosted Supabase/PostgREST has not been contacted; network/timeouts and platform role differences require the authorized production smoke check. Single owner/runner, 200 retained tasks, 10 outstanding tasks and bounded context; owner username changes require a data-transfer plan. Computer off means pending/offline, not execution. Unknown execution crashes fail closed and need operator review. Codex model output is advisory and its existing account limits apply. No automatic production permissions or provider access exist in this interface.

Local main and origin/main remain `a149a6e089f2e13f455378117d0f49561ccfd52c`. Previously deployed measurement/media commits remain ancestors. Final worktree contains the three listed tracked modifications plus listed implementation/discovery and unrelated untracked artifacts; nothing is staged. Stopped for owner authorization before production migration, commit, push, deployment or enablement.
