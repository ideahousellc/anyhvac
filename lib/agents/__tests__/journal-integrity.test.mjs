import { it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { atomicPrivateWrite, sealJournal } from '../../../scripts/agents/journal-integrity.mjs';
import { journals, acquireRunnerLock } from '../../../scripts/agents/runner-runtime.mjs';
import { stageMigration, verifyPrivateRuntime } from '../../../scripts/agents/private-migration.mjs';
import { assertLegacyUnactivated } from '../../../scripts/agents/private-home.mjs';
const id = '12345678-1234-1234-1234-123456789abc';
async function fixture(test) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'anyhvac-integrity-fixture-'));
  try { await test(base); } finally {
    if (!base.startsWith(path.join(os.tmpdir(), 'anyhvac-integrity-fixture-'))) throw Error('Unexpected fixture path.');
    await fs.rm(base, { recursive: true });
  }
}
it('valid journal transitions remain verifiable after restart; edited or unsigned journals fail', () => fixture(async base => {
  const policy = { key: randomBytes(32), imported: {} }, file = path.join(base, id + '.json');
  for (const phase of ['prepared', 'executing', 'result-saved', 'delivered']) {
    await atomicPrivateWrite(file, JSON.stringify(sealJournal({ taskId: id, phase, reply: 'fixture' }, policy.key)));
    expect((await journals(base, policy))[0].phase).toBe(phase);
  }
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  record.reply = 'tampered';
  await fs.writeFile(file, JSON.stringify(record));
  await expect(journals(base, policy)).rejects.toThrow('integrity');
  await fs.writeFile(file, JSON.stringify({ taskId: id, phase: 'delivered' }));
  await expect(journals(base, policy)).rejects.toThrow('Unsigned');
}));
it('interrupted journal installation and corruption fence stale lock recovery', () => fixture(async base => {
  const policy = { key: randomBytes(32), imported: {} };
  await fs.writeFile(path.join(base, 'runner.lock'), '{"pid":9999999}');
  await fs.writeFile(path.join(base, id + '.json.tmp'), 'partial');
  await expect(acquireRunnerLock(base, policy)).rejects.toThrow('Interrupted');
  expect(await fs.readFile(path.join(base, 'runner.lock'), 'utf8')).toContain('9999999');
}));
it('immutable archive stays verified while telemetry advances and signed results are recovered', () => fixture(async base => {
  const source = path.join(base, 'source'), destination = path.join(base, 'destination');
  for (const root of [source, destination]) for (const dir of ['production', 'runner', 'audit']) await fs.mkdir(path.join(root, dir), { recursive: true });
  await fs.writeFile(path.join(source, 'production/runner-config.json'), 'NONPRODUCTION-CREDENTIAL');
  await fs.writeFile(path.join(source, 'runner/status.json'), '{}');
  await fs.writeFile(path.join(source, 'runner', id + '.json'), JSON.stringify({ taskId: id, phase: 'result-saved' }));
  const manifest = await stageMigration(source, destination);
  const policy = await verifyPrivateRuntime(destination, manifest);
  await fs.writeFile(path.join(destination, 'runner/status.json'), '{"status":"stopped"}');
  await atomicPrivateWrite(path.join(destination, 'runner', id + '.json'), JSON.stringify(sealJournal({ taskId: id, phase: 'delivered' }, policy.key)));
  await verifyPrivateRuntime(destination, manifest);
  await fs.writeFile(path.join(destination, 'audit/migration-snapshot/runner', id + '.json'), 'tampered');
  await expect(verifyPrivateRuntime(destination, manifest)).rejects.toThrow('archive integrity');
}));
it('rejects missing imported journals and wrong authentication keys', () => fixture(async base => {
  await expect(journals(base, { key: randomBytes(32), imported: { [id + '.json']: 'hash' } })).rejects.toThrow('missing');
  await fs.writeFile(path.join(base, id + '.json'), JSON.stringify(sealJournal({ taskId: id, phase: 'executing' }, randomBytes(32))));
  await expect(journals(base, { key: randomBytes(32), imported: {} })).rejects.toThrow('integrity');
}));
it('permits dead legacy guard recovery but rejects live guards and legacy activation', () => fixture(async base => {
  const directory = path.join(base, 'runner');
  await fs.mkdir(directory);
  await fs.mkdir(path.join(base, 'production'));
  await fs.writeFile(path.join(directory, 'runner.lock'), '{"pid":9999999}');
  await assertLegacyUnactivated(base);
  const release = await acquireRunnerLock(directory);
  await expect(acquireRunnerLock(directory)).rejects.toThrow('active');
  await release();
  await fs.writeFile(path.join(base, 'production/activation.json'), '{}');
  await expect(assertLegacyUnactivated(base)).rejects.toThrow('activation');
}));
