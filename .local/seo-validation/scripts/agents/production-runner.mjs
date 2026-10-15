// No environment files, secret arguments, API key fallback or automatic activation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runRunner } from './runner-service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, '.local/agent-inbox/runner');
const production = path.join(root, '.local/agent-inbox/production');
export function validateProductionConfig(config) {
  if (config.url !== 'https://www.anyhvac.net' || config.runnerId !== 'anyhvac-owner-local-phase1' || typeof config.token !== 'string' || config.token.length < 32) throw new Error('Invalid production configuration.');
}
export async function main(mode) {
  if (mode === '--status') {
    let state;
    try { state = JSON.parse(await fs.readFile(path.join(directory, 'status.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; console.log('No local runner status yet. Check Control Room for the authoritative heartbeat.'); return; }
    console.log(JSON.stringify({ status: state.status, lastUpdate: state.at, fresh: Date.now() - Date.parse(state.at) < 35_000, note: 'Local process evidence only; Control Room heartbeat is authoritative.' }));
    return;
  }
  if (mode === '--stop') {
    await fs.writeFile(path.join(directory, 'stop.request'), 'Owner requested graceful stop.\n', { mode: 0o600 });
    console.log('Graceful stop requested. Check local status and Control Room heartbeat.');
    return;
  }
  if (!['--check', '--run', '--recover'].includes(mode)) throw Error('Choose --check, --status, --stop, --run or --recover.');
  const config = JSON.parse(await fs.readFile(path.join(production, 'runner-config.json'), 'utf8'));
  validateProductionConfig(config);
  if (mode === '--check') { console.log('Local configuration valid. No network request, task claim, or execution. Activation and private ACL verification required before running.'); return; }
  const activation = JSON.parse(await fs.readFile(path.join(production, 'activation.json'), 'utf8'));
  if (activation.enabled !== true || !path.isAbsolute(activation.codexBin ?? '') || !activation.codexBin.toLowerCase().endsWith('.exe')) throw Error('Explicit local activation and installed binary required.');
  await fs.access(activation.codexBin);
  // POSIX mode bits do not protect Windows files. Fail closed unless the private
  // inbox tree grants read access only to this user, SYSTEM and Administrators.
  if (process.platform !== 'win32') throw Error('Windows user runtime required.');
  const powershell = path.join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const acl = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/agents/private-acl.ps1')], { cwd: root, windowsHide: true, stdio: 'pipe' });
  if (acl.status !== 0) throw Error('Private ACL review required.');
  await runRunner({ runnerId: config.runnerId, token: config.token, binary: activation.codexBin, url: config.url, directory, root, recover: mode === '--recover' });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv[2]); }
  catch { console.error('Production runner not started or stopped safely. Check activation, private ACLs and local status/journals. No automatic task replay.'); process.exitCode = 1; }
}
