import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const config = JSON.parse(await fs.readFile('.local/agent-inbox/review-config.json','utf8'));
if (!process.env.AGENT_CODEX_BIN) throw Error('Set AGENT_CODEX_BIN to the installed Codex executable.');
const child = spawn(process.execPath, ['--experimental-strip-types','scripts/agents/runner.mjs',...process.argv.slice(2)], { env: { ...process.env, AGENT_INBOX_URL: 'http://127.0.0.1:3016', AGENT_RUNNER_TOKEN: config.runnerToken, AGENT_RUNNER_ID: 'local-review' }, windowsHide: true, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
