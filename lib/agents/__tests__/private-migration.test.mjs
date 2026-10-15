import { it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { stageMigration, verifyMigration, rollbackMigration, migrationPlan } from '../../../scripts/agents/private-migration.mjs';
import { privateHome, assertLegacyInactive } from '../../../scripts/agents/private-home.mjs';
async function fixture(test) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'anyhvac-private-fixture-'));
  const source = path.join(root, 'source'), destination = path.join(root, 'destination');
  for (const base of [source, destination]) for (const name of ['production', 'runner', 'activation', 'audit']) await fs.mkdir(path.join(base, name), { recursive: true });
  await fs.writeFile(path.join(source, 'production/runner-config.json'), JSON.stringify({ runnerId: 'fixture', token: 'NONPRODUCTION-CANARY' }));
  await fs.writeFile(path.join(source, 'runner/12345678-1234-1234-1234-123456789abc.json'), JSON.stringify({ taskId: '12345678-1234-1234-1234-123456789abc', phase: 'delivered', threadId: 'preserved' }));
  try { await test(source, destination); } finally {
    if (!root.startsWith(path.join(os.tmpdir(), 'anyhvac-private-fixture-'))) throw Error('Unexpected fixture directory.');
    await fs.rm(root, { recursive: true });
  }
}
it('uses only the designated local Windows profile', () => {
  expect(privateHome({ LOCALAPPDATA: 'C:\\Fixture\\Local' }).root).toBe('C:\\Fixture\\Local\\AnyHVAC\\AgentInbox');
  for (const value of [undefined, 'relative', '\\\\server\\share']) expect(() => privateHome({ LOCALAPPDATA: value })).toThrow();
});
it('copies identity and journals byte for byte; rollback preserves both copies', () => fixture(async (source, destination) => {
  const manifest = await stageMigration(source, destination);
  expect(manifest.state).toBe('staged-inactive');
  await verifyMigration(source, destination, manifest);
  await rollbackMigration(destination);
  expect(JSON.parse(await fs.readFile(path.join(destination, 'audit/migration.json'), 'utf8')).state).toBe('rolled-back-inactive');
  expect(await fs.readFile(path.join(source, 'production/runner-config.json'), 'utf8')).toBe(await fs.readFile(path.join(destination, 'production/runner-config.json'), 'utf8'));
  await expect(stageMigration(source, destination)).rejects.toThrow();
}));
it('fails closed on tampering or legacy locks', () => fixture(async (source, destination) => {
  const manifest = await stageMigration(source, destination);
  await fs.writeFile(path.join(destination, 'production/runner-config.json'), 'tampered');
  await expect(verifyMigration(source, destination, manifest)).rejects.toThrow();
  await fs.writeFile(path.join(source, 'runner/runner.lock'), '{}');
  await expect(assertLegacyInactive(source)).rejects.toThrow();
  await expect(migrationPlan(source)).rejects.toThrow();
}));
it('partial copy remains inactive and cannot overwrite existing records', () => fixture(async (source, destination) => {
  await fs.writeFile(path.join(destination, 'production/runner-config.json'), 'existing');
  await expect(stageMigration(source, destination)).rejects.toThrow();
  expect(JSON.parse(await fs.readFile(path.join(destination, 'audit/migration.json'), 'utf8')).state).toBe('copying-inactive');
  expect(await fs.readFile(path.join(destination, 'production/runner-config.json'), 'utf8')).toBe('existing');
}));
it('rejects source changes and unexpected manifest paths', () => fixture(async (source, destination) => {
  const manifest = await stageMigration(source, destination);
  await expect(verifyMigration(source, destination, { ...manifest, entries: [{ source: '../escape', destination: '../escape' }] })).rejects.toThrow();
  await fs.writeFile(path.join(source, 'production/runner-config.json'), 'changed');
  await expect(verifyMigration(source, destination, manifest)).rejects.toThrow();
}));
it('serializes concurrent migrations without overwriting the winner', () => fixture(async (source, destination) => {
  const results = await Promise.allSettled([stageMigration(source, destination), stageMigration(source, destination)]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  await verifyMigration(source, destination, JSON.parse(await fs.readFile(path.join(destination, 'audit/migration.json'), 'utf8')));
}));
