# George continuity POC: owner review

**Architecture C is technically viable for the tested conversation-only path.** A stable AnyHVAC George identity completed two tasks through documented Codex CLI execution. A second CLI process resumed the first thread and recalled a random marker that was absent from the second prompt. This proves useful cross-process continuity, not production readiness or seamless synchronization with the historical IDE George.

Completed October 7, 2026, 18:35:41.570 UTC. No application/UI implementation, production database access, installs, commits, pushes, deployment, Buffer operations or measurement changes.

## Architecture and identity

Local harness: [george-continuity-poc.mjs](george-continuity-poc.mjs). Local JSON storage and evidence: `growth/.generated/george-continuity-poc/` (Git-ignored). The harness, not the model, controls task/result association.

```text
anyhvac.george -> local task record -> codex exec / exec resume
                                      -> JSONL completion events
              <- attributed result <- recorded execution reference
```

`agent.id = anyhvac.george` is stable across separate harness processes. Each task and result contains this ID and its originating task ID. Codex thread `01a117a5-59f4-7042-9f7b-89ff76d08409` lives under task execution metadata, not in George's identity field. This is a new, isolated test binding; the old `/root/george` thread was not resumed or changed.

Instructions were loaded directly from repository bytes, copied to the sanitized workspace and supplied on task 1. No manually recreated George role:

| Canonical source | SHA-256 |
|---|---|
| `AGENTS.md` | `bd63888d0b100d02752aed060f561d8a9379bd461e98929384bd81b8454accd8` |
| `docs/agents/george.md` | `43f6dff4be2ba6f80676291ca20eef5211c03f3fe3de84533811dafc24999383` |

Source hashes remained unchanged. The POC boundary explicitly suspended prior publishing authority. Current operational state such as scheduling records and baseline data was not imported; this test needed only responsibilities and boundaries.

## Supported execution and observed results

Installed Codex CLI: `0.160.1`. Used documented `codex exec --json` and `codex exec resume <explicit-thread-id> --json`, with instructions via stdin. No SDK installation, private database integration, daemon, network listener, tunnel or custom MCP service. CLI resumption and JSON events are documented in [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

| Task | Observed result |
|---|---|
| `george-poc-001` | Exit 0, completed turn and saved reply. Summarized interpreting William's findings, preparing sourced content batches and proposing free-first experiments. Identified publication/production approval boundaries and returned the random test marker. |
| `george-poc-002` | Exit 0, completed turn on the same ID in a new CLI process. Recalled the exact marker without it being supplied again. Explained William measures what happened while George interprets it into growth/distribution actions. |

Both replies were saved with `agentId=anyhvac.george`, the correct task ID and a result hash. Prompts, events, stderr, task metadata, usage and final verification are local ignored evidence. No model-generated tool execution items were recorded.

Codex emitted a nonfatal item of type `error`: Code Mode was unavailable because its host was disabled and would fail closed. The harness initially treated that item as tool activity and withheld success. After inspection, a narrow classifier correction recognized that exact warning and reconciled the saved first-task evidence. **The first task was not replayed**, Code Mode remained disabled and no host/package was installed. Task 2 emitted the same warning and still completed correctly.

## Failure behavior and validation

- Missing/unsuccessful first completion or missing thread ID blocks task 2; no implicit fresh thread, `--last` lookup or manual transcript workaround.
- Unexpected error, nonzero exit, missing reply/completion or actual tool item yields `failed-or-unknown`. Logs remain available; no automatic retry. A process interruption leaves the persisted dispatch state for review rather than re-dispatching.
- Source changes stop execution. Identity mismatches stop execution. A task already dispatched cannot run again through the harness.
- A missing or non-resumable thread does not erase logical George identity or task records. A separately reviewed fresh-thread execution using canonical task state is a future recovery option; it is not silently implemented.

Validation passed: Node syntax check; nine local checks covering completion/error/tool/missing-ID/resume eligibility; actual duplicate-dispatch rejection before invoking Codex; both result/task associations; same-thread verification; marker absent from second prompt and present in both replies; unchanged source hashes. Whitespace checks passed. No application test suite was run because application files were untouched.

Full-history export/retrieval was not tested. The app-server paginated-history obstacle for the historical child threads remains unresolved; this successful **new CLI thread** does not establish those threads can resume. The POC records its own visible replies through documented CLI events and does not depend on reading private Codex storage.

## Security, authentication and costs

Codex used the owner's existing ChatGPT authentication after a read-only login-status check. The ordinary inspection shell had no login; authorized execution ran in the owner context, with Codex restrictions still applied. Credentials were not read, copied, printed or placed in POC records. CLI/runtime-managed authentication and session persistence remain private outside application code. [Authentication documentation](https://learn.chatgpt.com/docs/auth).

Execution requested `read-only`, approval policy `never` (no elevation approvals), ignored user configuration and disabled shell/unified execution, apps, plugins, hooks, browser/computer use, image generation, Code Mode host, child agents and dependency installation. Web search was disabled. The child process received a small OS/runtime environment allowlist, not application environment variables or production keys. The test workspace held only the two canonical Markdown files. [Sandbox guidance](https://learn.chatgpt.com/docs/agent-approvals-security), [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

The model made no tool calls; no Buffer/Beehiiv/Supabase/email/application provider clients were invoked. Model inference necessarily contacted the model service. No packet capture or adversarial OS-isolation test was performed: this is evidence for harmless conversation-only work, not certification that a credential-bearing development machine is safe for arbitrary web-submitted tasks. Runtime session/log writes are bookkeeping; “read-only” describes model execution permissions, not an absence of all harness/runtime filesystem writes.

Observed usage across both turns: **55,853 input tokens, including 33,664 cached-input tokens; 590 output tokens**. This includes runtime/history overhead, not just task text. No API key or new paid service was added. The exact selected default model, account allowance remaining and monetary charge were not established from these CLI events. ChatGPT limits/credits still apply; do not claim unlimited or zero-cost operation. Repeated full instructions/history can increase usage; Phase 1 should record usage and bound context. API-key execution would incur separate usage-based billing.

## Computer-off behavior and remaining limitations

This POC is manually invoked; no background worker was installed. When the computer is off, no local Codex task executes. Local records persist on disk, but there is no hosted POC inbox. A later hosted Control Room can retain messages as queued while its runner is offline; computer-off execution requires an approved always-on host or another backend.

Not yet proven: historical George/William thread resumption, backend replacement with retained task context, simultaneous IDE/web input, cross-client transcript visibility, long-history compaction accuracy, cancellation/timeouts, worker crash recovery, concurrent writers, hostile prompts or credential renewal. JSON files are sufficient for one sequential test; they are not a production multi-worker datastore. The nine failure checks use synthetic events, not paid failing inference runs. No state synchronization with independently prompted IDE conversations is claimed.

## Smallest Phase 1 recommendation

Proceed, after owner review, with one owner-only conversation/task inbox and one Codex runner adapter. Persist logical agent definitions, versioned responsibilities/context, messages, tasks and execution references in isolated/test storage first. The runner should claim bounded work over outbound HTTPS; no public development-machine endpoint. Keep conversation-only permissions, record completions/usage, serialize tasks and show offline/failed/unknown states honestly. No automatic API fallback or production-action tools.

Use canonical completed project handoffs for a deliberate one-time operational-state import; that is separate from this responsibility-only test. Make Control Room the initial task entry point and the IDE a review/workspace surface. Add another entry point only when it automatically uses the same records. A small local/test UI and crash/offline/security validation should precede any production migration or deployment approval. George's identity remains stable even when execution threads are replaced; broader continuity must be demonstrated rather than assumed.

Final Git state: tracked application/repository files unchanged; local `main` matches `origin/main`. New POC source/report and earlier discovery documents remain untracked; pre-existing local artifacts remain untouched. Generated POC state/prompts/events/workspace are ignored and must remain local. No commit, push or deployment performed. Stopped for owner review.
