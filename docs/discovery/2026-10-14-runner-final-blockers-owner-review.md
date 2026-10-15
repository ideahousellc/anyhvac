# Final runner blockers: owner review

Secure copy-only migration and restart integrity implementation completed locally.
Production runner remains offline. Legacy credential exposure remains an activation
gate because retirement/modification was explicitly prohibited in this stage.

## Confirmed root causes

1. `.local/agent-inbox/production/runner-config.json` holds the production runner
   bearer credential under permissive inherited ACLs. Its ancestors can permit file
   replacement even if the file itself is hardened. The designated standard user
   cannot harden the old root without additional rights. A content-only in-memory
   comparison over 166 relevant local/generated text files, including ignored files,
   found exactly this one production-token copy. Root environment files had no copy.
   This is a scoped scan, not a guarantee about employer backups or external copies.
   Local test configurations use separate fixture identities. The existing ChatGPT
   authentication store is reused, never copied into the runner directory.
2. The previous migration hash compared changing operational files to migration-time
   bytes. Health updates and legitimate result-saved to delivered journal transitions
   could therefore block every subsequent startup.
3. A crash could leave the legacy guard lock behind. The blanket legacy lock absence
   check would reject restart before the existing proven-dead-PID recovery could run.

## Credential migration performed

Destination: `%LOCALAPPDATA%\AnyHVAC\AgentInbox`. Actual Windows profile ownership,
standard-user token and the user/SYSTEM/Administrators ACL allowlist verified before
copying and recursively afterward. No elevation or execution policy override.

Twenty approved records copied, with byte lengths and SHA-256 hashes checked against
unchanged legacy sources. Original messages, audit records, runner identity and five
historical journals preserved. The destination production configuration uses the same
runner identity and production origin. A read-only authenticated status call using
the NEW copy succeeded: protocol 2, identity match, runnerOnline false. It did not
heartbeat, claim, start or finish anything. No production database writes were made.

The only legacy production credential retirement candidate found in scope is
`.local/agent-inbox/production/runner-config.json`. It was neither modified nor deleted.
Do not retire the historical journals or audit records as part of credential cleanup.
The new immutable credential snapshot and journal integrity key are protected private
records and must remain outside Git, logs, XML arguments and deployment artifacts.

## Atomic migration procedure

The following were run under the actual designated standard user:

1. `powershell.exe -NoProfile -NonInteractive -File scripts/agents/private-acl.ps1`
2. `node --experimental-strip-types scripts/agents/migrate-private.mjs --plan`
3. `node --experimental-strip-types scripts/agents/migrate-private.mjs --stage`
4. Repeat ACL validation, then run `--auth-check` instead of `--stage`.

Each file is flushed to an exclusively created same-directory temporary file, then
installed with a no-overwrite hard link. On NTFS this atomically installs a complete
file. The version-2 manifest is a final atomic commit marker: copying-inactive remains
fenced until every record and immutable archive is verified. Migration is NOT a single
transaction over all files; a crash leaves partial protected copies, never an enabled
runner. Interrupted writes/ambiguous states require review, not automatic cleanup.
Source files are never overwritten or deleted. Re-running stage cannot overwrite
the completed destination. Do not rerun it against the current staged directory.

Rollback (`--rollback`) atomically marks the migration rolled-back-inactive; both
copies remain, neither runner is activated. This was tested with isolated fixtures;
the live staged migration was not rolled back.

## Narrow restart integrity solution

- Every imported byte sequence remains in `audit/migration-snapshot` and is verified
  on startup, including credentials, journals, raw process output and telemetry.
- Production configuration and original supersession audit copies remain immutable.
- Imported operational journals must initially match their archived hashes exactly.
  Subsequent legitimate journal versions are authenticated with HMAC-SHA-256 using
  a separate random 32-byte key in the private production directory. Every journal
  read verifies its MAC or its exact imported baseline and validates identity/phase.
  New unsigned, changed, missing imported or partially written journals fail closed.
- Telemetry and raw process output can evolve only as non-authoritative runtime
  records; their immutable migration archives are still verified. They never grant
  an execution permit. No blanket runner-directory integrity exemption is used.
- Writes flush before atomic installation. Leftover journal temporary files fence
  recovery. File durability cannot promise recovery from every hardware failure;
  missing keys or inconsistent state stop rather than infer completion.
- Prepared/executing journals never replay inference. Result-saved journals retry
  only the saved canonical result through the server's idempotent finish operation.
  Server claim/start CAS and one-time permits remain unchanged.
- Both directory locks remain enforced. Live/unknown owners fail closed; only
  demonstrably dead process locks may be reclaimed after journal verification.
  Legacy activation is still prohibited. No existing lock was removed in this stage.

The MAC protects against corruption or edits without the key. It does not isolate
agents from the Windows account owner, SYSTEM, Administrators or employer endpoint
management, which can access the private key. No new security principal is granted.

## Validation and production safety

- Full suite: 611 passed, 4 skipped; 64 files passed, 2 skipped.
- Fixtures cover concurrent migration, partial copy, no overwrite, source changes,
  archive tampering, journal edits, missing imported records, wrong keys, interrupted
  writes, stale/live locks, ambiguous start, saved result recovery and independent
  George/William conversations. Worker recovery tests now exercise authenticated
  journals. Existing concurrent claims/cancellation/deduplication tests still pass.
- Standard-user Windows fixture migration and rollback passed in the secured home.
- TypeScript and production build passed. ESLint: zero errors, five existing warnings
  outside this change. Whitespace check passed.
- Credential/key/personal-profile scan of changed files: zero matches. All 43 Next
  build traces inspected: zero private runner paths.
- All 20 legacy source hashes unchanged. No activation record, old/new active lock
  or registered startup task. Read-only production status reports runner offline.
- Pending requests were not read/claimed/executed or modified. Conversation database,
  Weekly Content, Buffer, Stripe and analytics received no writes from this stage.

## Exact cumulative local draft inventory: 17 files

Modified tracked files:

1. lib/agents/__tests__/reliability-runner.test.mjs
2. scripts/agents/prepare-startup.ps1
3. scripts/agents/private-acl.ps1
4. scripts/agents/production-runner.mjs
5. scripts/agents/runner-runtime.mjs
6. scripts/agents/runner-service.mjs
7. scripts/agents/runner.mjs

New files, including the preceding accepted directory stage:

8. docs/discovery/2026-10-14-user-owned-agent-runner-owner-review.md
9. docs/discovery/2026-10-14-runner-final-blockers-owner-review.md
10. lib/agents/__tests__/journal-integrity.test.mjs
11. lib/agents/__tests__/private-migration.test.mjs
12. scripts/agents/journal-integrity.mjs
13. scripts/agents/migrate-private.mjs
14. scripts/agents/private-directory.ps1
15. scripts/agents/private-home.mjs
16. scripts/agents/private-migration.mjs
17. scripts/agents/test-private-directory.ps1

Private, outside Git: destination credential configuration, journal integrity key,
20 immutable archived records, operational copies, staged-inactive manifest, existing
identity record/startup XML and isolated rollback fixtures. No production activation
record created. Git remains main tracking origin/main; no commit/push/deployment.

## Remaining owner actions

1. Review the implementation and inventory and confirm employer authorization.
2. Separately authorize retirement of the identified insecure legacy credential
   copy, with approved handling of backups. Prefer IT-guided retirement if company
   policy requires it. No elevation, ownership takeover or ACL bypass is proposed.
   A separately approved token rotation can invalidate unknown copies, but requires
   production credential changes and a reviewed refresh of the immutable credential
   snapshot; it is not silently authorized here.
3. After retirement, recheck credential absence, private ACLs, migration integrity,
   identity/authentication and old/new lock safety. Until then activation stays blocked.
4. Separately approve controlled harmless conversation activation and then startup
   task registration/sign-in testing. No collaboration/content/publishing permissions
   are added. Keep this computer as the sole execution machine.
