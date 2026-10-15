# Legacy runner credential retirement: owner review

Completed the owner's specifically authorized single-file retirement. No runner
activation, startup registration, pending request execution or production mutation.

## Exact disposition

Deleted only `.local/agent-inbox/production/runner-config.json` on the designated
work computer, under the actual standard Windows user without elevation. The exact
resolved target was checked to be a regular file with no reparse-point ancestors.
Its SHA-256 hash matched the preverified protected copy immediately before deletion.
No recursive deletion, ownership takeover, ACL bypass, token revocation or remote
credential change was performed.

Protected configuration remains at
`%LOCALAPPDATA%\AnyHVAC\AgentInbox\production\runner-config.json`, unchanged.
The immutable protected migration snapshot also remains unchanged. These intended
private copies are ACL-protected and excluded from Git/deployment artifacts.

The server authenticates against its independently configured AGENT_RUNNER_TOKEN;
it does not read the retired local file. The production launcher reads configuration
only from the protected location. Its remaining legacy path references are lock and
retirement checks, not credential fallback reads.

## Verification

- Before retirement: protected ACL/ownership allowlist verified, credential bytes
  identical, strict archive/journal integrity passed, read-only status authentication
  accepted with protocol 2 and matching runner identity; runner offline.
- After retirement: legacy path absent; protected configuration hash unchanged;
  status authentication accepted again; strict integrity and ACL checks passed,
  including the former legacy credential activation gate.
- All 37 other inventoried files under legacy production, runner and activation
  directories retained their hashes. Journals, audit and conversation records were
  not deleted or modified.
- Production launcher --check passed without network access or execution.
- Zero matching runner processes; old/new runner locks absent; protected activation
  record absent; sign-in task absent. These are point-in-time observations.
- Relevant migration, journal-integrity and reliability tests: 23 passed, 1 skipped.
- Secret-value checks found no remaining matching production-token copies in the
  scoped legacy/generated text files or root environment files. Changed-file scans
  found no credential/key/profile leaks. Deployment traces contain no private paths.
  These scoped scans do not prove absence from employer backups or external copies.
- Whitespace check passed. No runtime code changed during retirement; prior full
  validation remains 611 tests passed/4 skipped, TypeScript/build passed, lint zero
  errors and five existing warnings.

Only the read-only runner status API was called. No heartbeat, claim, start, finish,
pending request change, Buffer/Stripe/analytics change or other remote action occurred.

## Private audit inventory

Under the protected `audit` directory, outside Git:

- credential-retirement-preflight.json: verification and hashes of the 38 original
  legacy files, without secret contents.
- credential-retirement-intent.json: owner-authorized single-file intent.
- credential-retirement.json: verified disposition and authentication result.

The completion record is flushed and installed atomically. No credential values
are stored in retirement logs, task arguments or this report.

## Remaining owner actions

The known credential-exposure and restart-integrity technical gates are cleared.
Activation and Windows task registration remain intentionally unperformed and require
separate authorization. Confirm employer permission remains applicable; future
activation must recheck identity, installed binary/login, ACLs, integrity, production
status and single-instance protections before harmless conversation tests. Do not
enable collaboration, content generation, scheduling, publishing or automatic cleanup.

The repository remains main tracking origin/main with the preceding 17 local draft
files plus this report (18 total). No existing runtime file was changed in this stage;
no commit, push or deployment occurred. The earlier blocker review is historical;
this report supersedes its outstanding legacy-credential retirement gate.
