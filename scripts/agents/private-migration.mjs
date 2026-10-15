// Offline, copy-only migration. Caller must validate Windows ACLs first.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { atomicPrivateWrite } from './journal-integrity.mjs';
import { journals } from './runner-runtime.mjs';
import { assertLegacyInactive, readPrivateJson } from './private-home.mjs';

const allowed = /^(production\/runner-config\.json|runner\/(?:[0-9a-f-]{36}(?:\.json|-events\.jsonl|-stderr\.txt)|(?:health|lock-recovery)\.jsonl(?:\.previous)?|status\.json)|activation\/(?:supersession-plan|before-inbox|after-supersession|activation-stopped)\.json)$/i;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function regular(file) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Regular private file required.');
  return fs.readFile(file);
}
export async function migrationPlan(source) {
  const root = await fs.lstat(source);
  if (!root.isDirectory() || root.isSymbolicLink()) throw Error('Regular source root required.');
  await assertLegacyInactive(source);
  const entries = [];
  for (const folder of ['production', 'runner', 'activation']) {
    const parent = path.join(source, folder);
    const exists = await fs.lstat(parent).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!exists) continue;
    if (!exists.isDirectory() || exists.isSymbolicLink()) throw Error('Regular private directory required.');
    for (const name of (await fs.readdir(parent)).sort()) {
      const relative = folder + '/' + name;
      if (!allowed.test(relative)) continue;
      const bytes = await regular(path.join(source, relative));
      entries.push({ source: relative, destination: folder === 'activation' ? 'audit/legacy-' + name : relative, archive: 'audit/migration-snapshot/' + relative, bytes: bytes.length, sha256: digest(bytes) });
    }
  }
  if (!entries.some(entry => entry.source === 'production/runner-config.json')) throw Error('Configuration missing.');
  return { version: 2, state: 'planned-inactive', entries };
}
export async function verifyMigration(source, destination, manifest) {
  if (manifest.version !== 2 || !Array.isArray(manifest.entries)) throw Error('Migration manifest invalid.');
  await assertLegacyInactive(source);
  const expected = await migrationPlan(source);
  if (JSON.stringify(expected.entries) !== JSON.stringify(manifest.entries)) throw Error('Source changed; review required.');
  for (const entry of manifest.entries) {
    const bytes = await regular(path.join(destination, entry.destination));
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw Error('Migration integrity mismatch.');
  }
}
export async function verifyPrivateRuntime(destination, manifest) {
  if (manifest.version !== 2 || manifest.state !== 'staged-inactive' || !Array.isArray(manifest.entries)) throw Error('Verified migration required.');
  const imported = {};
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!allowed.test(entry.source) || entry.archive !== 'audit/migration-snapshot/' + entry.source || seen.has(entry.source)) throw Error('Manifest path requires review.');
    seen.add(entry.source);
    const expectedDestination = entry.source.startsWith('activation/') ? 'audit/legacy-' + path.basename(entry.source) : entry.source;
    if (entry.destination !== expectedDestination) throw Error('Manifest destination requires review.');
    const archive = await regular(path.join(destination, entry.archive));
    if (archive.length !== entry.bytes || digest(archive) !== entry.sha256) throw Error('Immutable archive integrity mismatch.');
    if (entry.source === 'production/runner-config.json' || entry.source.startsWith('activation/')) {
      const current = await regular(path.join(destination, entry.destination));
      if (digest(current) !== entry.sha256) throw Error('Immutable operational record changed.');
    } else if (/^runner\/[0-9a-f-]{36}\.json$/i.test(entry.source)) imported[path.basename(entry.source)] = entry.sha256;
    // Telemetry/raw process output is archived and verified above; it is never an execution authority.
  }
  if (!seen.has('production/runner-config.json')) throw Error('Configuration manifest missing.');
  const key = await regular(path.join(destination, 'production/journal-integrity.key'));
  if (key.length !== 32) throw Error('Journal key requires review.');
  const integrity = { key, imported };
  await journals(path.join(destination, 'runner'), integrity);
  return integrity;
}
export async function stageMigration(source, destination) {
  const manifest = await migrationPlan(source);
  const record = path.join(destination, 'audit/migration.json');
  await atomicPrivateWrite(record, JSON.stringify({ ...manifest, state: 'copying-inactive' }), true);
  for (const entry of manifest.entries) {
    const bytes = await regular(path.join(source, entry.source));
    if (digest(bytes) !== entry.sha256) throw Error('Source changed; stop.');
    await fs.mkdir(path.dirname(path.join(destination, entry.archive)), { recursive: true });
    await atomicPrivateWrite(path.join(destination, entry.archive), bytes, true);
    await atomicPrivateWrite(path.join(destination, entry.destination), bytes, true);
  }
  await verifyMigration(source, destination, manifest);
  await atomicPrivateWrite(path.join(destination, 'production/journal-integrity.key'), randomBytes(32), true);
  manifest.state = 'staged-inactive';
  await verifyPrivateRuntime(destination, manifest);
  await atomicPrivateWrite(record, JSON.stringify(manifest));
  return manifest;
}
export async function rollbackMigration(destination) {
  const file = path.join(destination, 'audit/migration.json');
  const manifest = await readPrivateJson(file);
  if (!['copying-inactive', 'staged-inactive'].includes(manifest.state)) throw Error('Migration state requires review.');
  manifest.state = 'rolled-back-inactive';
  await atomicPrivateWrite(file, JSON.stringify(manifest));
  // Both copies remain intact. Neither launcher is activated.
}
