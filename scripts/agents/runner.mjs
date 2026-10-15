// Outbound-only restricted conversation worker. Never auto-replays inference.
import { runRunner } from './runner-service.mjs';
try {
  const endpoint = new URL(process.env.AGENT_INBOX_URL ?? 'http://127.0.0.1:3016');
  if (endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) throw Error('Use the protected production launcher.');
  await runRunner({ runnerId: process.env.AGENT_RUNNER_ID, token: process.env.AGENT_RUNNER_TOKEN, binary: process.env.AGENT_CODEX_BIN, url: process.env.AGENT_INBOX_URL ?? 'http://127.0.0.1:3016', once: process.argv.includes('--once'), recover: process.argv.includes('--recover') });
} catch { console.error('Runner stopped. Review private status/journals; no automatic inference replay.'); process.exitCode = 1; }
