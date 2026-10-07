# Phase 1 Agent Inbox: owner review

Database validation follow-up: [readiness results, exact commit inventory and rollout](2026-10-07-agent-inbox-database-readiness.md). The original local-only validation record below is retained as implementation history; the follow-up supersedes its database-validation limitations.

**Implemented and verified locally.** Control Room has an owner-only Agents / Team entry and persistent conversations for `anyhvac.george` and `anyhvac.william`. A restricted, outbound-only local Codex runner returns replies to the originating task. Feature is disabled by default. No commit, migration, push or deployment was performed.

## Review the experience

Local screenshots, never uploaded:

- [Control Room navigation](../../.local/agent-inbox/review/01-control-room.png)
- [George response](../../.local/agent-inbox/review/04-george-completed.png)
- [William response](../../.local/agent-inbox/review/05-william-completed.png)
- [Offline runner and preserved pending message](../../.local/agent-inbox/review/06-offline-pending.png)
- [Mobile layout](../../.local/agent-inbox/review/07-mobile.png)

To reopen locally, run `node scripts/agents/local-review.mjs`, then visit **http://localhost:3016/admin** and select **Agents / Team**. The dev server was stopped for the production build; no background runner is installed. Test sign-in details are in the private, ignored `.local/agent-inbox/review-config.json`. This launcher uses local-only storage/test credentials, disconnects production provider clients and disables local growth collection; it does not edit `.env.local` or live configuration. Use `localhost`, which matches the existing dev-server origin checks.

Each agent has a name, role, responsibility summary and live inbox execution state. One conversation per agent retains owner messages, replies and failures across refresh/sign-in sessions. Replies render as escaped plain text. New content scrolls into view; polling does not continually reset a reader's position. Pending request IDs survive a refresh in tab-scoped draft storage so uncertain submission can be checked without creating a duplicate.

## What was demonstrated

Browser evidence: `.local/agent-inbox/review/browser-verification.json`, verified October 7 at 19:10:50 UTC. Worker evidence: `runner-verification.json` and private per-task journals/events.

| Check | Result |
|---|---|
| Owner sign-in and Control Room navigation | Passed using existing login flow and isolated test credentials |
| George first task | Completed; summarized responsibilities and approval boundaries |
| George continuation | Completed in a separate CLI process; recalled marker absent from follow-up prompt; same recorded thread |
| William task | Completed; explained measurement responsibilities and measured/derived/inferred labels, leaving unavailable data unknown |
| Pending → working → completed | Recorded execution permits/start timestamps, completed results and UI history |
| Refresh/reopen | Responses and original messages preserved |
| Runner offline | After heartbeat expiry, offline notice and pending message remained visible; no fictitious processing |
| Duplicate request | Same request submitted again: HTTP 200, task count stayed 4 → 4 |
| Tool activity | Saved JSONL events rechecked against the final worker verifier; no tool execution for any completed task |

Completed task IDs: George `daeebed1-c909-49cd-901c-4c4810baa0d9`, `cbcd533f-f5b5-428e-b8ae-f368e7f5688d`; William `170da4fa-dddd-4b5a-a06c-356599ace848`. One harmless offline test task remains pending in **local test storage only**. Starting the review runner would process that queued question.

Browser automation required fixes for hydration timing, `localhost` origin and waiting for agent data after refresh. Completed inference tasks were inspected and preserved; they were not blindly rerun. The disabled-Code-Mode warning remains an explicitly recognized nonfatal, fail-closed warning; no host/package was installed.

## Storage and architecture

Local development uses `.local/agent-inbox/state.json`, atomic replacement, an exclusive file lock and revision compare-and-swap. A stale lock fails closed rather than being deleted automatically. No production database was contacted.

The production adapter reuses server-only Supabase configuration and nonpersistent service-client conventions. Proposed, **unapplied** migration: `supabase/migrations/20261007000100_create_agent_inbox.sql`.

For this single-owner, low-volume pilot, one `agent_inbox_documents` row per stable hashed owner stores a bounded JSON document of tasks and heartbeat state, with revision and update timestamp. An atomic compare-and-swap RPC serializes concurrent changes. RLS is enabled/forced; anonymous/authenticated access is revoked; only the server service role may read/update through this adapter. No existing mail, measurement or publication table changes. Owner scope derives from configured username, not the expiring session nonce. Renaming that username requires an explicit data-transfer plan.

Task records carry stable `agentId`, request ID, message/reply, state, lease, runner and execution metadata. Codex thread IDs never define agent identity. The registry has no schema dependence on only George/William; no future agents were added. Pilot capacity is **200 retained tasks total**, at most **10 outstanding**, owner messages up to 6,000 characters, replies up to 32,000. At capacity, sending stops with an explicit review message; no history is silently deleted. Larger volume should move to normalized task/message rows and pagination under a later scope.

**The SQL and Supabase adapter have not been exercised against PostgreSQL.** Production migration validation is required in a separately authorized isolated database before deployment. Local persistence, contention and route/state tests pass; they do not substitute for that database validation.

## Runner and continuity

`scripts/agents/runner.mjs` polls the authenticated `/api/agent-runner` endpoint over outbound HTTPS (loopback HTTP permitted for local review). No public local listener/tunnel. A single stable runner ID claims tasks; one task per agent can be active. The runner uses the documented `codex exec` / `codex exec resume` JSON mechanism, validated with installed CLI 0.160.1. [Official interface](https://learn.chatgpt.com/docs/non-interactive-mode).

For each job, it reads canonical `AGENTS.md`, the registry-selected role file, `data/tools.ts` and the Duct Design Quick Reference source. Paths are fixed by code, never supplied by the owner prompt or remote job. A combined source hash versions context. Same runner + unchanged context resumes the prior successful thread. New bindings/context versions start a new restricted thread with bounded recent canonical messages; unavailable resume fails for review without a silent fallback/replay. Historical IDE threads are not imported or synchronized.

The runner's execution workspace is sanitized. It supplies curated text as model context rather than allowing an unrestricted repository shell. Direct filesystem, browser, connectors, hooks, plugins, image tooling, child agents and Code Mode are disabled; web search is disabled. Child environment forwards only OS/runtime/auth-resolution paths, not runner tokens, Supabase keys, mail credentials or API-key variables. Codex credentials remain in the existing private host credential store, never browser props or database records. Existing ChatGPT login covered the three harmless review executions; monetary charge/remaining allowance was not established.

Native TypeScript stripping requires a compatible Node version (tested Node 26.5.0). Runner setup uses an existing installed Codex binary, `AGENT_CODEX_BIN`, `AGENT_RUNNER_ID`, `AGENT_INBOX_URL` and `AGENT_RUNNER_TOKEN`. Local helper: set `AGENT_CODEX_BIN`, then `node scripts/agents/local-runner.mjs --once`. Continuous explicit worker mode omits `--once`; it processes only owner-submitted messages and never creates autonomous tasks. No worker service/autostart was installed.

## Security and recovery boundaries

- Owner page/API independently verify the existing signed admin session; writes require same-origin JSON. Existing private/public analytics separation, login, mail and other provider behavior remain unchanged. Owner APIs return private/no-store/noindex responses and strip execution fences from browser history.
- Runner uses a separate server-configured secret, constant-time comparison and non-browser authentication; browser-origin runner requests are rejected. The credential permits only claim/start/heartbeat/result operations, not generic HTTP, commands, mail or production operations. It is not stored in task records.
- Server must issue a **one-time positive start permit** before spawning Codex. Duplicate starts/wrong leases are rejected. A network-ambiguous start does not execute. Expired claims that never started may return to pending; started/uncertain jobs become failed and block that agent's next task pending review.
- Runner saves results locally before delivery. `--recover` resubmits saved results only, never inference; identical result delivery is idempotent. Different replacements are rejected. Late recovery with the same execution fence is accepted until the owner closes the attempt. Closing a failed attempt does not enqueue a retry.
- Crash locks/journals must be inspected by the operator before removing a stale lock or unstarted journal. Do not delete a live lock or infer that an unknown job never executed. Incomplete execution journals are not automatically replayed. This deliberately favors safe failure over unattended recovery.
- Two-minute execution timeout, bounded stdout/stderr and heartbeat failure stop the child and require review. Context/history are bounded, and unexpected error/tool events fail closed. No inference request is automatically retried by the worker after a failed turn. The Codex runtime's internal transport handling remains its responsibility.

This interface cannot authorize commit/push/deployment, production mutation, Buffer operations, measurement changes, Beehiiv changes, email or payment/advertising actions. The only writes are controlled inbox bookkeeping and local runner evidence. It is conversation/snapshot assistance, not a production execution agent. Existing owner auth retains its known single-owner/PIN/stateless-session limitations; no new auth provider was introduced. Arbitrary prompts are not an authority grant. Host isolation against adversarial prompts and future runtime changes still deserves dedicated validation before broadening access.

## Validation

| Command/check | Final result |
|---|---|
| Full `npm test` | 564 tests, 57 files passed |
| Focused agent tests | 19 tests across 3 files; auth, fences, offline expiry, recovery, concurrency, replay and executor restrictions |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed; four pre-existing warnings in unrelated growth/reference files |
| `npm run build` | Passed; `/admin/agents` and both new APIs are dynamic routes |
| Real Chrome browser | Passed desktop/mobile, both agents, George continuation, refresh, offline/pending and message replay |
| Final verifier on saved CLI events | All three completed results matched; tool-free completion confirmed without new inference |
| Whitespace/source review | Passed |

Build ran with the dev server stopped, inbox disabled and production provider credentials blanked in the build process. No measurement flags or production environment were changed.

## Files in this implementation

Modified: `.gitignore` (ignore private local inbox), `app/admin/page.tsx`, `components/admin/ControlRoomDashboard.tsx` (feature-gated navigation).

Added:

- `app/admin/agents/page.tsx`
- `app/api/admin/agents/route.ts`
- `app/api/agent-runner/route.ts`
- `components/admin/AgentInbox.tsx`, `AgentInbox.module.css`
- `lib/agents/{types,registry,state,storage,http}.ts`
- `lib/agents/__tests__/{state,routes}.test.ts`, `runner.test.mjs`
- `scripts/agents/{runner,runner-core,local-review,local-runner,browser-review}.mjs`
- `supabase/migrations/20261007000100_create_agent_inbox.sql`
- This review document.

Private/ignored: local state, test configuration, drafts/browser profile, screenshots, runner journals/events and workspace. No package/dependency files changed. Earlier discovery/POC and unrelated weekly-content artifacts were left untouched and remain outside any future implementation commit inventory.

## Remaining limits and proposed production sequence

Limits: single owner/runner, one conversation per agent, bounded history/context, no attachments, no full IDE synchronization, no automatic operational-report import, no live provider readings, no hosted/always-on execution and no silent model-API fallback. With the computer off, messages would stay pending in hosted storage; this local review server itself is also unavailable when stopped. Exactly-once distributed inference is not promised: permits, journals and explicit unknown states prevent blind application-level replay.

Proposed next steps, each subject to owner authorization:

1. Validate the drafted SQL, service-role/RLS restrictions and concurrent CAS behavior against isolated PostgreSQL/Supabase. Exercise the Supabase adapter and worker interruption/recovery there. Check snapshot context and existing auth are sufficient for the limited pilot.
2. Agree retention/export, stable owner/runner IDs, credential rotation and a tested Node/Codex version. Configure a scoped runner token only on server and trusted worker; no local test credentials/state in production.
3. Approve a narrow commit inventory of this implementation. Exclude all `.local` data, prior unapproved drafts and unrelated content artifacts. Review/apply only the new production migration, then deploy code with `AGENT_INBOX_ENABLED` absent/false. Verify existing production behavior without changing baseline or queued posts.
4. Separately enable the inbox with Supabase storage after verification; launch the trusted local worker manually. Perform minimum owner-only harmless QA and leave real pending messages intact. No tunnel or public worker endpoint.
5. Rollback: stop the worker and disable the inbox flag first. Recover/reconcile any saved or uncertain results; never replay unknown executions. Roll back code if required; retain/export private inbox history. Only drop the isolated new RPC/table under separate approval after preservation; no existing table/configuration rollback is needed.

Stopped for owner review. Local `main` remains at checkpoint `a149a6e089f2e13f455378117d0f49561ccfd52c`, matching `origin/main`; work is uncommitted. Production, Buffer, active measurement, Beehiiv, outreach and payment/advertising systems were untouched.
