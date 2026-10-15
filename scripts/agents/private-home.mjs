import path from 'node:path';
import fs from 'node:fs/promises';

export function privateHome(environment) {
  const local = environment.LOCALAPPDATA;
  if (typeof local !== 'string' || !path.win32.isAbsolute(local) || local.startsWith('\\\\')) throw Error('Designated Windows profile required.');
  const root = path.win32.join(local, 'AnyHVAC', 'AgentInbox');
  return Object.fromEntries(['root', 'production', 'runner', 'audit', 'startup', 'fixtures'].map(name => [name, name === 'root' ? root : path.win32.join(root, name)]));
}
export async function readPrivateJson(file) {
  return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}
export async function assertLegacyInactive(root) {
  for (const relative of ['production/activation.json', 'runner/runner.lock', 'runner/lock-recovery.lock']) {
    if (await fs.access(path.join(root, relative)).then(() => true, () => false)) throw Error('Legacy activation or lock requires review.');
  }
}
export async function assertLegacyUnactivated(root) {
  if (await fs.access(path.join(root, 'production/activation.json')).then(() => true, () => false)) throw Error('Legacy activation requires review.');
  // Locks are handled by acquireRunnerLock: live/unknown owners fail closed,
  // and only demonstrably dead owners can be reclaimed without executing a task.
}
