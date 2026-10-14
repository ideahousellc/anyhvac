// Outbound-only restricted conversation worker. Never auto-replays inference.
import { runRunner } from './runner-service.mjs';
try {
  await runRunner({ runnerId: process.env.AGENT_RUNNER_ID, token: process.env.AGENT_RUNNER_TOKEN, binary: process.env.AGENT_CODEX_BIN, url: process.env.AGENT_INBOX_URL ?? 'http://127.0.0.1:3016', once: process.argv.includes('--once'), recover: process.argv.includes('--recover') });
} catch { console.error('Runner stopped. Review private status/journals; no automatic inference replay.'); process.exitCode = 1; }
