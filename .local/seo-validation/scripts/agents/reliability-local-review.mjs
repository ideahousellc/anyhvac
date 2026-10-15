// Dedicated local UI namespace. Never touches production or historical local inbox.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
const root = process.cwd();
const directory = path.join(root, '.local/agent-inbox/reliability-review');
await fs.mkdir(directory, { recursive: true });
const config = { username: 'pilot-owner', pin: String(crypto.randomInt(100000, 999999)), sessionSecret: crypto.randomBytes(32).toString('hex'), runnerToken: crypto.randomBytes(32).toString('hex') };
await fs.writeFile(path.join(directory, 'ui-config.json'), JSON.stringify(config), { mode: 0o600 });
const env = { ...process.env, ADMIN_USERNAME: config.username, ADMIN_PIN_HASH: await bcrypt.hash(config.pin, 10), ADMIN_SESSION_SECRET: config.sessionSecret, AGENT_INBOX_ENABLED: 'true', AGENT_INBOX_STORAGE: 'local', AGENT_INBOX_REVIEW_NAMESPACE: 'conversation-pilot', AGENT_RUNNER_TOKEN: config.runnerToken, WEEKLY_CONTENT_ENABLED: 'false', WEEKLY_CONTENT_IMPORT_ENABLED: 'false', NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED: 'false', GROWTH_MEASUREMENT_ENABLED: 'false' };
for (const key of ['SUPABASE_URL','SUPABASE_SECRET_KEY','RESEND_API_KEY','RESEND_ADMIN_API_KEY','BEEHIIV_ADMIN_API_KEY','BEEHIIV_PUBLICATION_ID','GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL','GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY','GOOGLE_SEARCH_CONSOLE_PROPERTY']) env[key] = '';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3017'], { cwd: root, env, windowsHide: true, stdio: 'inherit' });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill());
child.on('exit', code => process.exit(code ?? 1));
