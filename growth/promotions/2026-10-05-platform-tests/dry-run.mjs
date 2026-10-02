import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { validatePackage, prepare, duplicateReasons, readRecords, packageDigest, operation, sha256 } from '../../distribution/buffer/scheduler.mjs';
import { bufferClient, loadKey } from '../../distribution/buffer/client.mjs';

const root = 'growth/promotions/2026-10-05-platform-tests/';
const client = bufferClient(loadKey()); // Mutations disabled; no media-fetch bypass.
const channels = await client.channels();
const records = readRecords();
const reports = [];
for (const platform of ['instagram', 'youtube']) {
  const batch = JSON.parse(await readFile(root + platform + '-package.json', 'utf8'));
  validatePackage(batch, { requireApproval: false });
  const post = batch.posts[0];
  const channel = channels.find(c => c.id === post.channel_id && c.service === platform);
  if (!channel || channel.timezone !== 'America/New_York' || channel.isDisconnected || channel.isLocked || channel.isQueuePaused) throw Error('Channel preflight failed.');
  const queue = await client.posts(channel);
  const duplicates = duplicateReasons(post, queue, records);
  const report = { platform, mode: 'UNAPPROVED READ-ONLY PROPOSAL — NOT EXECUTABLE', checked_at: new Date().toISOString(), package_sha256: packageDigest(batch), owner_approval: null, channel_id: channel.id, channel_name: channel.displayName, channel_timezone: channel.timezone, scheduled_at: post.scheduled_at, slot_source: platform === 'instagram' ? 'First configured slot in next-week window: Monday 19:00. Earlier calendar draft proposed 18:00; this is a new time proposal.' : 'First configured slot in next-week window: Thursday 19:00; matches next-week Mixed Air proposal.', queue_count: queue.filter(p => p.status === 'scheduled').length, queue_history_count: queue.length, duplicate_check: duplicates.length ? 'FAIL' : 'PASS', duplicate_reasons: duplicates, occupied: queue.some(p => Date.parse(p.dueAt) === Date.parse(post.scheduled_at)), network_settings: post[platform], buffer_caption_character_count: post.caption.length + (platform === 'instagram' ? (post.caption.match(/\n/g) || []).length : 0), hashtag_count: (post.caption.match(/#[A-Za-z0-9_]+/g) || []).length, operation: duplicates.length ? null : operation(post), approval_gate: 'BLOCKED — owner approval required' };
  if (duplicates.length) { report.full_preflight = 'FAIL'; reports.push(report); continue; }
  if (platform === 'instagram') {
    const metadata = await sharp(await readFile(post.media[0].path)).metadata();
    const bytes = await readFile(post.media[0].path);
    report.media = { format: metadata.format, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: sha256(bytes) };
    if (metadata.width !== 1080 || metadata.height !== 1350 || bytes.length >= 8 * 1024 * 1024 || report.hashtag_count > 5 || report.buffer_caption_character_count > 2196) throw Error('Instagram media/caption requirement failed.');
    const data = await client.request('query InstagramReminderSettings($input: ChannelsInput!) { channels(input: $input) { id metadata { ... on InstagramMetadata { defaultToReminders } } } }', { input: { organizationId: channel.organizationId } });
    report.default_to_reminders = data.channels.find(c => c.id === channel.id)?.metadata?.defaultToReminders;
    report.account_type_verification = 'Professional account type is not exposed by the inspected channel metadata; verify automatic publishing eligibility before live execution.';
  } else {
    report.media = JSON.parse(await readFile(root + 'media-verification.json', 'utf8'));
    if (post.youtube.title.length > 100 || post.caption.length > 5000) throw Error('YouTube title/caption requirement failed.');
  }
  const head = await fetch(post.media[0].url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(20000) });
  report.public_media_http_status = head.status;
  try { report.preflight = await prepare(batch, { client, requireApproval: false }); report.full_preflight = 'PASS — content still unapproved'; }
  catch (error) { report.full_preflight = 'BLOCKED'; report.blocker = client.redact(error.message); }
  reports.push(report);
}
await writeFile(root + 'dry-run-results.json', JSON.stringify(reports, null, 2) + '\n');
console.log(JSON.stringify(reports.map(r => ({ platform: r.platform, scheduled_at: r.scheduled_at, duplicate_check: r.duplicate_check, occupied: r.occupied, full_preflight: r.full_preflight, public_media_http_status: r.public_media_http_status, default_to_reminders: r.default_to_reminders, blocker: r.blocker })), null, 2));
