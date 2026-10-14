# Agent conversation reliability pilot — owner review

Implemented locally on October 14, 2026. This is an uncommitted draft. Production
code/configuration/data, Task Scheduler registration and runner activation were
not changed. The sign-in task was exported to private XML only. No planning,
collaboration, content preparation, Buffer scheduling or publication occurred.

## Result and scope

The existing hosted inbox and one local outbound-only worker remain the architecture.
Both logical agents are supported, sequentially, with separate definitions and
conversation history. No new dependency, paid service, tunnel or listener was added
to the production worker. Existing Codex login/usage allowance is reused; this is
not a promise of unlimited free inference or availability while the computer sleeps.

| Capability | Pilot behavior |
|---|---|
| Conversation availability | Owner messages persist; restricted text replies while the Windows user is signed in, the computer is awake, and network/Codex authentication are available |
| George/William collaboration | Not enabled; no cross-agent dispatch, shared conversation injection or child-agent tools |
| Weekly content preparation | Not enabled; the runner explains unavailable work without preparing it; no media or batch production integration |
| Scheduling/publication | Unavailable; exact-batch approval and a separately authorized publishing workflow remain necessary |

## Pending request safety

The owner UI offers **Cancel request** and **Supersede request**. It displays the
original message, requires a reason, and requires an explicit confirmation. A
replacement must already be another pending request for the same agent.

Original task IDs, request IDs, prompts, timestamps and execution fences remain.
An immutable disposition records the owner actor, action request ID, reason,
timestamp and optional replacement task ID. Identical delivery is idempotent;
changed reuse conflicts. Cancelled/superseded records remain in retained history
and cannot be claimed, started, expired back into pending, or finished.

Disposition, claim and start use the existing document compare-and-swap. If an
unstarted claim wins first, cancellation can revoke it and start is denied. If a
positive start permit wins first, cancellation conflicts and the owner must review
the execution. Started or uncertain work is never represented as safely cancelled.
Supersession does not execute or approve the replacement.

Two requests are also guarded by fixed worker exclusions:

- October 13: `60bc8020-8abc-4871-8403-ddf7ca98c642`.
- October 14: `8df19c32-1ba6-4453-8166-af0c24db9925`.

The exclusion travels in the claim request; the worker also rejects either ID
before execution. These guards remain even if the owner supersedes one with the
other. Removing the protection is a separate task, not part of this pilot.

Read-only production verification at **8:52 a.m. EDT October 14** found both still
pending, without start timestamps, replies or dispositions. Production's last
heartbeat remained October 8 at 2:21:42 p.m. EDT. Neither production message was
cancelled, superseded, claimed or executed during implementation.

No database migration is needed: the existing JSON document stores the additional
optional disposition/status fields. Existing records remain readable. The new
worker requires server protocol 2 and matching registered runner identity before
any claim. An older deployment fails closed.

## Worker, reconnection and recovery

`production-runner.mjs` reuses the existing private production `runner-config.json`.
It validates the exact production origin and stable runner ID. It never loads
`.env.local`, accepts secret arguments, creates a credential, or changes server
configuration. `--check` is local-only. `--status` reads local evidence only.

Production execution also requires an owner-created `activation.json` containing
`enabled: true` and the absolute installed Codex executable path. No activation
file was created. Before running, Windows ACL verification requires the private
inbox directory, production subtree and runner subtree to allow only the current
user, SYSTEM and Administrators; reparse points fail the check. Existing credentials
stay in their existing configuration/host store, never task arguments or logs.

Safe transport retries use backoff from one second to a maximum of 30 seconds.
Claim retries cannot spawn anything without a received claim and positive start
permit. Start requests and model inference are never automatically retried.
Authentication/identity/protocol errors stop for review. HTTP 5xx/transport/JSON
response ambiguity is treated as uncertain rather than proof that a write failed.

Results are saved before delivery. An uncertain finish retries the identical
fenced result. Restart recovers `result-saved` journals without inference. Prepared
and executing journals remain excluded; started failures still block the relevant
agent pending review, while the other agent can continue. Closed attempts reject
late results. There is no promise of distributed exactly-once inference.

During execution, heartbeat failure stops the child. Both worker and server reject
continuation across an expired 60-second lease, including sleep/resume. Idle
polling reconnects after network loss. A two-minute execution limit, output bounds
and the existing tool-free completion verifier remain in force.

An exclusive file lock prevents a second worker, including manual versus scheduled
launches. A dead worker's lock can be reclaimed only when its recorded PID is
demonstrably absent and every task journal parses. Reclaimers are serialized; a
new lock that wins acquisition is never removed. Reclamation is logged and never
clears task journals, permits or threads. A live/reused PID, permission uncertainty,
legacy empty lock, malformed journal, or interrupted recovery guard fails closed
for operator review. A machine crash can leave a child/attempt uncertain; that
task is not replayed even when the dead worker lock is reclaimed.

SIGINT/SIGTERM and the local `--stop` request stop the active child and preserve
result evidence. Abrupt Windows termination retains journals for safe recovery.
The graceful stop request is consumed by the next worker that observes it; disable
the scheduled task as well if the owner wants it to remain off across sign-in.

Private `status.json`, bounded/rotated `health.jsonl` and lock recovery records
contain fixed statuses, timestamps, process/task/agent IDs and counts only. They
exclude prompts, responses, tokens, environment and raw errors. Per-task result,
JSONL and stderr evidence stays private in the protected runner subtree. Control
Room shows online/offline and the last server heartbeat. Its last snapshot expires
even when browser polling fails, using elapsed time rather than assuming matching
browser/server clocks; local status is explicitly
not proof of current production reachability.

## Windows startup preparation

Prepared XML: `.local/agent-inbox/reliability-review/AnyHVAC-Agent-Conversations.xml`.
The checked preparation script exports XML; it has no registration/start command.

- Existing Windows account, interactive sign-in token, least privilege; no password.
- Sign-in trigger with a 30-second delay; hidden PowerShell/Node launch.
- Task Scheduler `IgnoreNew` plus the worker's exclusive process lock.
- Three process restart attempts one minute apart; no task time limit or sleep wakeup.
- Runs on battery; network unavailability is handled by the worker's backoff.
- Absolute Windows PowerShell executable and repository paths; no credentials in XML.

PowerShell's `ExecutionPolicy Bypass` applies only to these explicit trusted script
processes because this computer currently blocks `.ps1` execution by default. No
machine/user execution policy, authentication boundary, TLS verification or Codex
sandbox setting was changed. Owner review should include the scripts' integrity
before registration. Actual Windows sign-out/reboot and scheduled-task activation
remain deliberately untested until separate activation approval.

References: [Microsoft sign-in triggers](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasktrigger?view=windowsserver2025-ps),
[task settings](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset?view=windowsserver2025-ps).
Codex's documented [non-interactive execution/resume interface](https://learn.chatgpt.com/docs/non-interactive-mode)
is retained. Tested runtime: Node 26.5.0, installed Codex 0.162.0-alpha.17.2.

## Validation and security review

- Full Vitest suite: **600 passed, 4 skipped**. Skips are existing opt-in database
  checks and the explicit real-Codex check when its executable is not supplied.
- Focused coverage includes actual filesystem CAS races, concurrent claims,
  cancellation/start outcomes, immutable dispositions, expired sleep leases,
  dead/live/unknown locks, executing-journal restart, ambiguous starts, lost finish
  acknowledgements, shutdown/result recovery, protected IDs, protocol mismatch,
  credential filtering and independent agent context.
- Real installed Codex: **two isolated harmless role questions passed**, George
  and William independently. Temporary inbox storage and a test transport were
  used; no production endpoints were contacted. Initial sandbox runs hit a Git
  workspace check, then TLS `UnknownIssuer`. The workspace check was explicitly
  supported for empty curated workspaces. Outside the tool sandbox the real check
  passed without changing trust, authentication or TLS verification.
- Chrome UI checks passed with actual local Next.js owner/runner endpoints:
  confirmed cancellation/supersession, audit retention, excluded superseded claims,
  independent replies, refresh persistence, heartbeat display and mobile layout.
  UI replies were explicitly simulated; real inference was verified separately.
  Screenshots were inspected. The dedicated local review namespace preserves the
  historical local inbox. External browser traffic and production providers were
  disconnected; no public analytics or growth events were generated.
  Deliberately blocking inbox polling confirmed stale online status expires.
- TypeScript passed. ESLint passed with four pre-existing unrelated warnings.
- Production build passed with production provider clients and growth collection
  disconnected; the development server was stopped before building.
- Whitespace and secret-value checks passed. Final Git status: local `main` tracks
  `origin/main`; only the inventory below is modified/untracked, nothing staged.

Owner session checks, same-origin writes, runner bearer authentication, server-only
Supabase credentials and the public/admin analytics boundary are unchanged.
Owner-only disposition extends inbox bookkeeping, not the worker's authority.
Shell, repository edits, browser, connectors, hooks, plugins, web search, image
tools, child agents and Code Mode remain disabled for inference. The existing
read-only sandbox and exact-thread resume behavior remain. No model/API-key fallback
or new paid service was introduced. Weekly Content, Buffer, Stripe, engineering
engines, newsletter and analytics source/configuration were not changed or called
for mutations. No content or publication artifacts were created.

The local review namespace is a fixed development-only directory. Production file
tracing explicitly excludes `.local/**/*`, so building on the owner's computer
cannot package private runner credentials, journals or UI test data. Final build
traces were checked for private local paths; none were present.

## Exact review inventory — 22 files

Modified (11):

1. `app/api/admin/agents/route.ts`
2. `app/api/agent-runner/route.ts`
3. `components/admin/AgentInbox.tsx`
4. `components/admin/AgentInbox.module.css`
5. `lib/agents/types.ts`
6. `lib/agents/state.ts`
7. `lib/agents/storage.ts`
8. `lib/agents/__tests__/routes.test.ts`
9. `scripts/agents/runner.mjs`
10. `scripts/agents/runner-core.mjs`
11. `next.config.ts`

Added (11):

1. `lib/agents/__tests__/reliability-state.test.ts`
2. `lib/agents/__tests__/reliability-runner.test.mjs`
3. `scripts/agents/runner-runtime.mjs`
4. `scripts/agents/runner-service.mjs`
5. `scripts/agents/production-runner.mjs`
6. `scripts/agents/private-acl.ps1`
7. `scripts/agents/start-runner.ps1`
8. `scripts/agents/prepare-startup.ps1`
9. `scripts/agents/reliability-local-review.mjs`
10. `scripts/agents/reliability-browser-review.mjs`
11. `docs/discovery/2026-10-14-agent-conversation-reliability-owner-review.md`

Ignored/private validation output: sign-in task XML, generated local UI credentials,
Chrome profile/screenshots/browser verification and real-Codex test evidence under
`.local/agent-inbox/reliability-review/`; isolated UI state under
`.local/agent-inbox/reviews/conversation-pilot/`. None belongs in a commit. Original
production configuration/credentials and runner journals were not rewritten.

## Required owner actions after reviewing this draft

1. Separately authorize the exact code inventory's commit/push/deployment. Deploy
   the protocol-2 API/UI before enabling the local worker. No migration, new token,
   provider integration or paid service is required.
2. Review the two existing pending messages. Separately authorize any production
   cancellation/supersession using the new controls. Both remain excluded from
   execution regardless; this pilot never enables weekly planning.
3. Authorize local activation: review/restrict the private Windows ACLs and select
   the installed Codex executable. Create the nonsecret activation file only after
   this approval. Verify the existing Codex login/allowance under Cesar's account;
   do not introduce an API key or paid fallback when unavailable.
4. Regenerate/review the task XML with
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/agents/prepare-startup.ps1`.
   Separately approve registration of `AnyHVAC-Agent-Conversations` under the
   existing interactive user. The preparation command itself never installs it.
5. After activation approval, validate one harmless request per agent and actual
   sign-in, idle sleep/resume, network loss/reconnect and reboot recovery. Reconcile
   unknown locks/attempts instead of replaying them. Check the production heartbeat.

Local checks (no network or execution):

```powershell
node --experimental-strip-types scripts/agents/production-runner.mjs --check
node --experimental-strip-types scripts/agents/production-runner.mjs --status
```

After activation approval, `--run` starts the continuous worker, `--recover`
delivers saved results only, and `--stop` requests a graceful local stop. For a
durable stop, disable the scheduled task and then request `--stop`; verify the
heartbeat expires. Never remove a live/unknown lock or clear an executing journal.
Rollback stops the worker and disables its task before reverting code; preserve
inbox history and reconcile saved results first.

Stopped for owner review. No commit, push, deployment, startup registration or
production runner activation has occurred.
