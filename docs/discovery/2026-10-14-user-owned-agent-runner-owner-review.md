# User-owned runner directory: owner review

Historical preparation snapshot. The subsequent copy-only migration and narrow
journal-integrity implementation are documented in
[the final blocker review](2026-10-14-runner-final-blockers-owner-review.md).
Use that review for the current inventory and activation gates.

Local preparation only. Production runner remains inactive. No task registered,
pending request executed, production configuration changed, legacy file deleted,
commit, push or deployment performed.

## Security findings

The actual standard Windows identity was obtained with WindowsIdentity.GetCurrent
outside the isolated tool account and matched against LocalApplicationData ownership.
No administrator token or elevation was used. The earlier helper's captured identity
must not be used.

Created `%LOCALAPPDATA%\AnyHVAC\AgentInbox` with owner-only/SYSTEM/Administrators
FullControl ACLs at creation, removing inherited unrelated principals. Ownership,
allowlist and inheritance were checked recursively. The standard user can create,
read and update isolated fixture records; ACL inspection establishes FullControl.
This is not a claim that employer endpoint administrators cannot access the data.
No employer policy was changed or bypassed.

Subdirectories: production, runner, audit, startup, fixtures. The private identity
record contains the actual SID; no personal account identity or path is in Git.
Production credentials and historical records have NOT been copied yet.

Legacy credential copies still have unsafe inherited permissions. Activation checks
both the copy and its ancestors and remains blocked while they exist insecurely.
The new directory does not remedy legacy exposure. The old root cannot currently be
hardened by the designated user. Resolve through approved IT assistance or a separately
reviewed credential retirement/rotation procedure; do not take ownership or elevate.

## Migration and rollback procedure

All commands run as the designated standard user from the repository, subject to
existing execution policy. No ExecutionPolicy Bypass is used.

1. `powershell.exe -NoProfile -NonInteractive -File scripts/agents/private-acl.ps1`
2. `node scripts/agents/migrate-private.mjs --plan` (read-only; currently 20 files).
3. After review, `node scripts/agents/migrate-private.mjs --stage` copies only the
   production runner configuration, historical journals/events/stderr and four
   supersession audit records. It verifies byte lengths and SHA-256 hashes against
   unchanged sources. It excludes activation, locks, the incorrect ACL helper,
   browser profiles and reproducible workspace snapshots. No production API is called.
4. Interrupted copies remain copying-inactive and cannot start. No existing file is
   overwritten. Investigate privately; do not blindly retry or clear records.
5. `node scripts/agents/migrate-private.mjs --rollback` marks the copy inactive and
   preserves every original and destination record. It never activates the old runner.

Future activation requires an explicit activation record, secure legacy-copy handling,
matching identity/configuration and a verified migration manifest. The launcher acquires
both old and new runner locks; the old environment entry point accepts only loopback.
Strict migration hashes remain enforced. If copied health/journal records advance,
subsequent startup can require review. A narrowly scoped mutable-record recovery design
is a remaining prerequisite for unattended operation; broad integrity exemptions were
rejected by automatic approval review and were not applied.

## Startup preparation

`powershell.exe -NoProfile -NonInteractive -File scripts/agents/prepare-startup.ps1`
exports XML privately under `startup`. It does not register or run a task. Principal
and sign-in trigger resolve to the actual designated SID, with InteractiveToken,
LeastPrivilege, IgnoreNew, a 30-second delay and three restart attempts. No password,
token or ExecutionPolicy override appears in arguments. Repository/script paths in
the private XML are necessary; no generated XML is added to Git. Registration and
real sign-in testing require later owner authorization and employer policy compliance.

## Validation

- Full Vitest: 606 passed, 4 skipped; 63 test files passed, 2 skipped.
- Focused migration/reliability tests: 18 passed, 1 skipped.
- Nonproduction Windows fixture migration, rollback and inherited ACL checks passed
  under the actual standard user. Evidence retained privately under fixtures.
- Existing reliability tests cover concurrent claims, cancellation races, restart
  fencing, reconnection and live/stale locks. No production inference was tested.
- TypeScript passed; production build passed; ESLint had zero errors and five
  warnings outside this change (one ignored local audit script, four existing warnings).
- Credential/profile-path scan: zero matches across changed files. Build traces:
  43 inspected, zero private runner paths. Whitespace check passed.
- No production config/activation exists in the new home; startup task absent.
- Production conversation records were not accessed or changed during this stage.
  October 13/14 requests retain their previously superseded disposition.

## Exact repository inventory: 11 files

Modified:

1. scripts/agents/prepare-startup.ps1
2. scripts/agents/private-acl.ps1
3. scripts/agents/production-runner.mjs
4. scripts/agents/runner.mjs

Added:

5. scripts/agents/private-directory.ps1
6. scripts/agents/private-home.mjs
7. scripts/agents/private-migration.mjs
8. scripts/agents/migrate-private.mjs
9. scripts/agents/test-private-directory.ps1
10. lib/agents/__tests__/private-migration.test.mjs
11. docs/discovery/2026-10-14-user-owned-agent-runner-owner-review.md

Outside Git: secured directory tree and identity record; private startup XML;
isolated fixture source, destination and inactive rollback manifest. Legacy files
remain unchanged. Git remains main tracking origin/main with these local drafts only.

## Owner actions

Review this inventory and the migration procedure. Confirm the employer permits this
runner on the work computer. Resolve legacy credential exposure with IT or separately
authorize a reviewed retirement/rotation plan. Review a narrower restart integrity
design before authorizing unattended activation. After those gates, approve real
copy-only staging, controlled harmless conversation tests and task registration
separately. No home computer is configured; only one runner may be active.
