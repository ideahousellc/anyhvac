import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
vi.mock('server-only', () => ({}));
import { LocalDocumentStore, transaction } from '../storage';
import { claim, disposePending, finish, start } from '../state';
import { runRunner } from '../../../scripts/agents/runner-service.mjs';
import { acquireRunnerLock, PROTECTED_TASK_IDS, reconnect, RunnerRequestError, RunnerTransportError, runnerApi } from '../../../scripts/agents/runner-runtime.mjs';
import { validateProductionConfig } from '../../../scripts/agents/production-runner.mjs';
import { sealJournal } from '../../../scripts/agents/journal-integrity.mjs';

const root = process.cwd();
const task = (agentId = 'anyhvac.george', id = randomUUID()) => ({ id, agentId, requestId: randomUUID(), prompt: 'State your name and role in one sentence. No content, tools or collaboration.', createdAt: Date.now(), status: 'pending' });
const execution = { definitionVersion: 'a'.repeat(64), threadId: randomUUID() };
async function isolated(test) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-runner-test-'));
  try { await test(base); } finally {
    if (!path.resolve(base).startsWith(path.resolve(os.tmpdir()) + path.sep + 'agent-runner-test-')) throw Error('Unexpected cleanup target.');
    await fs.rm(base, { recursive: true, force: true });
  }
}
function harness(base) {
  const store = new LocalDocumentStore(path.join(base, 'inbox'));
  const calls = [], spawnCalls = [];
  let lostFinish = false, loseStart = false, cancelOnStart = false;
  const fetcher = async (_url, options) => {
    const value = JSON.parse(options.body); calls.push(value.action);
    if (value.action === 'status') return Response.json({ protocol: 2, runnerMatches: true });
    const now = Date.now();
    if (value.action === 'claim') return Response.json(await transaction(s => ({ task: claim(s, value.runnerId, randomUUID(), now, value.excludedTaskIds) }), store));
    if (value.action === 'start') {
      if (cancelOnStart) {
        await transaction(s => disposePending(s, value.taskId, { action: 'cancel', requestId: randomUUID(), reason: 'Race test', at: now, actor: 'owner' }), store);
        return Response.json({}, { status: 409 });
      }
      await transaction(s => start(s, value.taskId, value.runnerId, value.leaseId, now), store);
      if (loseStart) throw Error('Response lost');
      return Response.json({ permitted: true });
    }
    if (value.action === 'finish') {
      await transaction(s => finish(s, value.taskId, value.runnerId, value.leaseId, { reply: value.reply, execution: value.execution }, now), store);
      if (lostFinish) { lostFinish = false; throw Error('Delivery response lost'); }
      return Response.json({ received: true });
    }
    throw Error('Unexpected operation');
  };
  const spawnProcess = (_binary, args, options) => {
    spawnCalls.push({ args, env: options.env, prompt: '' });
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => child.emit('close', 1);
    child.stdin.on('data', b => { spawnCalls.at(-1).prompt += b; });
    child.stdin.on('finish', () => setImmediate(() => {
      child.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: randomUUID() }) + '\n');
      child.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Harmless isolated reply' } }) + '\n');
      child.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\n');
      child.emit('close', 0);
    }));
    return child;
  };
  const options = { root, directory: path.join(base, 'runner'), runnerId: 'test', token: 'private-isolated-test-token-32-characters', url: 'http://127.0.0.1:3016', binary: 'isolated-stub', once: true, fetcher, spawnProcess };
  return { store, options, calls, spawnCalls, setLostFinish: () => { lostFinish = true; }, setLostStart: () => { loseStart = true; }, setCancellation: () => { cancelOnStart = true; } };
}

describe('conversation runner reliability', () => {
  it('uses the expected production identity and HTTPS origin only', () => {
    const c = { url: 'https://www.anyhvac.net', runnerId: 'anyhvac-owner-local-phase1', token: 'a'.repeat(32) };
    expect(() => validateProductionConfig(c)).not.toThrow();
    for (const v of [{ ...c, url: 'http://www.anyhvac.net' }, { ...c, url: 'https://evil.test' }, { ...c, runnerId: 'new' }]) expect(() => validateProductionConfig(v)).toThrow();
  });
  it('classifies transport failures without including secret-bearing errors', async () => {
    const api = runnerApi('http://localhost', 'test', 'secret', async () => { throw Error('secret'); });
    await expect(api('claim')).rejects.toThrow('Runner connection unavailable.');
    const rejected = runnerApi('http://localhost', 'test', 'secret', async () => Response.json({}, { status: 401 }));
    await expect(rejected('claim')).rejects.toBeInstanceOf(RunnerRequestError);
  });
  it('reconnects safe operations with capped backoff; rejects auth errors and stops on shutdown', async () => {
    const pauses = [], reports = []; let tries = 0;
    const control = { stopping: () => false, pause: async ms => pauses.push(ms), report: async status => reports.push(status) };
    expect(await reconnect(async () => { if (++tries < 9) throw new RunnerTransportError(); return true; }, control)).toBe(true);
    expect(Math.max(...pauses)).toBe(30000); expect(reports).toHaveLength(8);
    await expect(reconnect(async () => { throw new RunnerRequestError(401); }, control)).rejects.toThrow();
    await expect(reconnect(async () => true, { ...control, stopping: () => true })).rejects.toThrow('stopped');
  });
  it('prevents simultaneous processes and reclaims only demonstrably dead worker locks', async () => isolated(async base => {
    const release = await acquireRunnerLock(base);
    await expect(acquireRunnerLock(base)).rejects.toMatchObject({ code: 'EEXIST' });
    await release(); const again = await acquireRunnerLock(base); await again();
    await fs.writeFile(path.join(base, 'runner.lock'), '{"pid":9999999}');
    const recovered = await acquireRunnerLock(base); await recovered();
    expect(await fs.readFile(path.join(base, 'lock-recovery.jsonl'), 'utf8')).toContain('9999999');
    await fs.writeFile(path.join(base, 'runner.lock'), '');
    await expect(acquireRunnerLock(base)).rejects.toThrow();
  }));
  it('keeps both protected requests untouched while George and William respond independently and persist', async () => isolated(async base => {
    const h = harness(base), george = task(), william = task('anyhvac.william');
    h.options.journalIntegrity = { key: Buffer.alloc(32, 3), imported: {} };
    await transaction(s => { s.tasks.push(...PROTECTED_TASK_IDS.map(id => task('anyhvac.george', id)), george, william); }, h.store);
    await runRunner(h.options); await runRunner(h.options);
    const refreshed = (await new LocalDocumentStore(path.join(base, 'inbox')).read()).payload.tasks;
    expect(refreshed.slice(0, 2).map(t => t.status)).toEqual(['pending', 'pending']);
    expect(refreshed.slice(2).map(t => t.status)).toEqual(['completed', 'completed']);
    expect(h.spawnCalls).toHaveLength(2);
    expect(h.spawnCalls[0].prompt).toContain('Logical agent: anyhvac.george');
    expect(h.spawnCalls[0].prompt).not.toContain('SOURCE docs/agents/william.md');
    expect(h.spawnCalls[1].prompt).toContain('Logical agent: anyhvac.william');
    expect(h.spawnCalls[1].prompt).not.toContain('SOURCE docs/agents/george.md');
    expect(h.spawnCalls[0].args).toContain('--ignore-user-config');
    expect(h.spawnCalls[0].env).not.toHaveProperty('AGENT_RUNNER_TOKEN');
  }));
  it('never spawns after cancellation wins the start race or an ambiguous start response', async () => isolated(async base => {
    const h = harness(base), a = task(); await transaction(s => s.tasks.push(a), h.store); h.setCancellation();
    await runRunner(h.options); await runRunner(h.options);
    expect(h.spawnCalls).toHaveLength(0); expect(h.calls.filter(c => c === 'start')).toHaveLength(1);
    expect((await h.store.read()).payload.tasks[0].status).toBe('cancelled');
  }));
  it('preserves an ambiguous start across restarts and never repeats start or inference', async () => isolated(async base => {
    const h = harness(base), a = task(); h.options.journalIntegrity = { key: Buffer.alloc(32, 7), imported: {} }; await transaction(s => s.tasks.push(a), h.store); h.setLostStart();
    await runRunner(h.options); await runRunner(h.options);
    expect(h.spawnCalls).toHaveLength(0); expect(h.calls.filter(c => c === 'start')).toHaveLength(1);
    const journal = JSON.parse(await fs.readFile(path.join(h.options.directory, a.id + '.json'), 'utf8'));
    expect(journal.phase).toBe('prepared');
  }));
  it('reclaims a dead worker after shutdown without replaying its executing journal, keeping William available', async () => isolated(async base => {
    const h = harness(base), george = task(), william = task('anyhvac.william');
    h.options.journalIntegrity = { key: Buffer.alloc(32, 4), imported: {} };
    await transaction(s => { s.tasks.push(george, william); claim(s, 'test', 'old-lease', Date.now() - 120000); start(s, george.id, 'test', 'old-lease', Date.now() - 119999); }, h.store);
    await fs.mkdir(h.options.directory, { recursive: true });
    await fs.writeFile(path.join(h.options.directory, george.id + '.json'), JSON.stringify(sealJournal({ taskId: george.id, agentId: george.agentId, phase: 'executing', leaseId: 'old-lease' }, h.options.journalIntegrity.key)));
    await fs.writeFile(path.join(h.options.directory, 'runner.lock'), '{"pid":9999999}');
    await runRunner(h.options); await runRunner(h.options);
    expect(h.spawnCalls).toHaveLength(1); expect(h.spawnCalls[0].prompt).toContain('Logical agent: anyhvac.william');
    expect((await h.store.read()).payload.tasks.map(t => t.status)).toEqual(['failed', 'completed']);
    expect((await h.store.read()).payload.tasks[0].reviewRequired).toBe(true);
    expect(JSON.parse(await fs.readFile(path.join(h.options.directory, george.id + '.json'), 'utf8')).phase).toBe('executing');
  }));
  it('retries identical result delivery after a lost acknowledgement without duplicate inference', async () => isolated(async base => {
    const h = harness(base); await transaction(s => s.tasks.push(task()), h.store); h.setLostFinish();
    await runRunner(h.options);
    expect(h.spawnCalls).toHaveLength(1); expect(h.calls.filter(c => c === 'finish')).toHaveLength(2);
    const log = await fs.readFile(path.join(h.options.directory, 'health.jsonl'), 'utf8');
    expect(log).not.toContain(h.options.token); expect(log).not.toContain('Harmless isolated reply');
  }), 10000);
  it('recovers saved results on restart without spawning; excludes superseded records', async () => isolated(async base => {
    const h = harness(base), a = task(), b = task();
    h.options.journalIntegrity = { key: Buffer.alloc(32, 9), imported: {} };
    await transaction(s => { s.tasks.push(a, b); claim(s, 'test', 'lease', Date.now()); start(s, a.id, 'test', 'lease', Date.now()); disposePending(s, b.id, { action: 'cancel', reason: 'Review', actor: 'owner', requestId: randomUUID(), at: Date.now() }); }, h.store);
    await fs.mkdir(h.options.directory, { recursive: true });
    await fs.writeFile(path.join(h.options.directory, a.id + '.json'), JSON.stringify(sealJournal({ taskId: a.id, leaseId: 'lease', phase: 'result-saved', reply: 'Saved reply', execution }, h.options.journalIntegrity.key)));
    await runRunner(h.options);
    expect(h.spawnCalls).toHaveLength(0); expect((await h.store.read()).payload.tasks.map(t => t.status)).toEqual(['completed', 'cancelled']);
  }));
  it('fails closed against an old deployment before claiming anything', async () => isolated(async base => {
    const h = harness(base);
    await expect(runRunner({ ...h.options, fetcher: async () => Response.json({}) })).rejects.toThrow('Compatible deployed server');
    expect(h.calls).toHaveLength(0); expect(h.spawnCalls).toHaveLength(0);
  }));
  it('gracefully stops active inference, saves failure evidence and recovers without a second spawn', async () => isolated(async base => {
    const h = harness(base), a = task(); await transaction(s => s.tasks.push(a), h.store);
    let spawns = 0;
    const stalled = () => {
      spawns++;
      const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.stdin.resume();
      child.kill = () => { setImmediate(() => child.emit('close', 1)); return true; };
      child.stdin.on('finish', () => { void fs.writeFile(path.join(h.options.directory, 'stop.request'), 'stop'); });
      return child;
    };
    await runRunner({ ...h.options, spawnProcess: stalled });
    const saved = JSON.parse(await fs.readFile(path.join(h.options.directory, a.id + '.json'), 'utf8'));
    expect(saved).toMatchObject({ phase: 'result-saved', verifiedSuccess: false });
    expect(h.calls.filter(c => c === 'finish')).toHaveLength(0);
    await runRunner({ ...h.options, spawnProcess: stalled });
    expect(spawns).toBe(1); expect((await h.store.read()).payload.tasks[0]).toMatchObject({ status: 'failed', reviewRequired: true });
  }), 10000);
  it.skipIf(!process.env.AGENT_PILOT_CODEX_BIN)('real installed Codex answers both isolated harmless requests', async () => isolated(async base => {
    const h = harness(base); await transaction(s => s.tasks.push(task(), task('anyhvac.william')), h.store);
    await runRunner({ ...h.options, binary: process.env.AGENT_PILOT_CODEX_BIN, spawnProcess: undefined });
    await runRunner({ ...h.options, binary: process.env.AGENT_PILOT_CODEX_BIN, spawnProcess: undefined });
    const tasks = (await h.store.read()).payload.tasks;
    const evidence = path.join(root, '.local/agent-inbox/reliability-review/real-codex');
    await fs.mkdir(evidence, { recursive: true });
    await fs.cp(h.options.directory, evidence, { recursive: true });
    expect(tasks.map(t => t.status)).toEqual(['completed', 'completed']);
    expect(tasks[0].reply).toMatch(/George/i); expect(tasks[1].reply).toMatch(/William/i);
  }), 300000);
});
