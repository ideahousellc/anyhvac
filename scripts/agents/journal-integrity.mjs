import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';

function signature(record, key) {
  const { integrity: _integrity, ...payload } = record;
  void _integrity;
  return createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex');
}
export function sealJournal(record, key) {
  return { ...record, integrity: signature(record, key) };
}
export function verifyJournal(record, key) {
  if (typeof record.integrity !== 'string' || !/^[0-9a-f]{64}$/.test(record.integrity) || !timingSafeEqual(Buffer.from(record.integrity, 'hex'), Buffer.from(signature(record, key), 'hex'))) throw Error('Journal integrity requires review.');
}
export async function atomicPrivateWrite(file, bytes, exclusive = false) {
  // A leftover temporary file is ambiguous and deliberately fences a restart.
  const temporary = file + '.tmp';
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  if (exclusive) {
    // Hard link installs without overwriting an existing target on the same volume.
    await fs.link(temporary, file);
    await fs.unlink(temporary);
  } else await fs.rename(temporary, file);
}
