import fs from 'node:fs/promises';
import path from 'node:path';

export const PROTECTED_TASK_IDS = Object.freeze([
  '60bc8020-8abc-4871-8403-ddf7ca98c642',
  '8df19c32-1ba6-4453-8166-af0c24db9925',
]);

export class RunnerRequestError extends Error {
  constructor(status) { super('Runner request rejected.'); this.status = status; }
}
export class RunnerTransportError extends Error {
  constructor() { super('Runner connection unavailable.'); }
}

export function runnerApi(endpoint, runnerId, token, fetcher = fetch) {
  return async (action, fields = {}) => {
    let result;
    try {
      result = await fetcher(endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ action, runnerId, ...fields }), signal: AbortSignal.timeout(15_000) });
    } catch { throw new RunnerTransportError(); }
    if (!result.ok) {
      if (result.status >= 500) throw new RunnerTransportError();
      throw new RunnerRequestError(result.status);
    }
    try { return await result.json(); } catch { throw new RunnerTransportError(); }
  };
}

// These operations are safe to repeat. NEVER wrap start or inference in retry.
export async function reconnect(operation, { stopping, pause, report }, attempts = Infinity) {
  for (let attempt = 0; !stopping(); attempt++) {
    try { return await operation(); } catch (error) {
      if (!(error instanceof RunnerTransportError) || attempt + 1 >= attempts) throw error;
      await report('reconnecting');
      await pause(Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)));
    }
  }
  throw new Error('Runner stopped.');
}

export async function privateStatus(directory, status, details = {}) {
  const record = { at: new Date().toISOString(), pid: process.pid, status, ...details };
  // Callers supply only fixed statuses, agent/task IDs and booleans, never errors,
  // prompts, replies, process output, environment or credential configuration.
  const file = path.join(directory, 'status.json');
  await fs.writeFile(file + '.tmp', JSON.stringify(record, null, 2), { mode: 0o600 });
  await fs.rename(file + '.tmp', file);
  const log = path.join(directory, 'health.jsonl');
  const size = await fs.stat(log).then(s => s.size, () => 0);
  if (size > 1_000_000) await fs.rename(log, log + '.previous');
  await fs.appendFile(log, JSON.stringify(record) + '\n', { mode: 0o600 });
}

export async function acquireRunnerLock(directory) {
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'runner.lock');
  let lock;
  try { lock = await fs.open(file, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Serialize reclaimers. Normal acquisitions may win the unlink/open gap;
    // in that case open(wx) rejects and their new lock is never removed.
    // A stale recovery guard or legacy/unknown lock deliberately fails closed.
    const guardFile = path.join(directory, 'lock-recovery.lock');
    const guard = await fs.open(guardFile, 'wx');
    try {
      const previous = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!Number.isSafeInteger(previous.pid) || previous.pid < 1) throw Error('Unknown lock owner.');
      let dead = false;
      try { process.kill(previous.pid, 0); }
      catch (check) { if (check.code === 'ESRCH') dead = true; else throw check; }
      if (!dead) { const live = new Error('Runner already active.'); live.code = 'EEXIST'; throw live; }
      // Parse every journal BEFORE reclaim. All uncertain phases remain fenced
      // by runRunner; reclaim never clears journals, starts or model threads.
      const records = await journals(directory);
      await fs.appendFile(path.join(directory, 'lock-recovery.jsonl'), JSON.stringify({ at: new Date().toISOString(), previousPid: previous.pid, unresolved: records.filter(r => r.phase !== 'delivered').length }) + '\n', { mode: 0o600 });
      await fs.unlink(file);
      lock = await fs.open(file, 'wx');
    } finally { await guard.close(); await fs.unlink(guardFile); }
  }
  await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  return async () => { await lock.close(); await fs.unlink(file); };
}

export async function journals(directory) {
  const records = [];
  for (const file of await fs.readdir(directory)) if (/^[0-9a-f-]{36}\.json$/i.test(file)) {
    const record = JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'));
    if (record.taskId + '.json' !== file || !['prepared', 'executing', 'result-saved', 'delivered'].includes(record.phase)) throw new Error('Journal requires review.');
    records.push(record);
  }
  return records;
}
