import fs from 'node:fs';
import { packageDigest, prepare, scheduleApprovedBatch, digest, sha256 } from '../../../distribution/buffer/scheduler.mjs';
import { bufferClient, loadKey } from '../../../distribution/buffer/client.mjs';

const base = 'growth/promotions/2026-10-05-platform-tests';
const dir = `${base}/audio-revision-v2`;
const commit = '7c7abf3b25c47db79afa9e015d2b41fda53a80d2';
const target = 'public/social/mixed-air-short-86098e26c422d213.mp4';
const url = 'https://www.anyhvac.net/social/mixed-air-short-86098e26c422d213.mp4';
const expected = '2b1c637250de4b38bd690e64385eeee2a7980a920938eef2dbf4f9c5dd3976e6';
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const save = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const evidence = 'FINAL OWNER APPROVAL in this conversation: owner watched and approved revised 15-second Mixed Air MP4 with Sleepy Cat by Alejandro Magaña, existing visuals and unchanged caption; authorizes only that MP4 at public/social/mixed-air-short-86098e26c422d213.mp4, one single-file commit/push/deployment, and exactly one YouTube Short scheduling test for October 8, 2026, 7 PM EDT with previously reviewed title and settings, after successful verification and duplicate/slot checks.';
const client = bufferClient(loadKey());
const mode = process.argv[2];
assert(['--dry-run', '--schedule'].includes(mode) && process.argv.length === 3, 'Use --dry-run or --schedule');
try {
  const verification = read(`${dir}/verification.json`);
  assert(sha256(fs.readFileSync(verification.output)) === expected && sha256(fs.readFileSync(target)) === expected, 'Local approved media mismatch');
  const provenance = read(`${dir}/music-provenance.json`);
  assert(sha256(fs.readFileSync(provenance.local_source)) === provenance.source_sha256, 'Music source mismatch');
  for (const file of provenance.license_evidence) assert(fs.statSync(`${dir}/${file}`).size > 100, 'License evidence missing');
  if (mode === '--dry-run') {
    const response = await fetch(`https://api.github.com/repos/ideahousellc/anyhvac/commits/${commit}/status`, { headers: { 'User-Agent': 'AnyHVAC-owner-authorized-verification' }, signal: AbortSignal.timeout(20000) });
    assert(response.status === 200, 'Deployment status unavailable');
    const status = await response.json();
    const vercel = status.statuses?.find((item) => item.context === 'Vercel');
    assert(vercel?.state === 'success', `Vercel deployment not successful: ${vercel?.state}`);
    const media = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60000) });
    assert(media.status === 200 && media.headers.get('content-type')?.split(';')[0] === 'video/mp4', 'Public MP4 HTTP/content-type verification failed');
    const bytes = Buffer.from(await media.arrayBuffer());
    assert(sha256(bytes) === expected, 'Public bytes differ from approved revision');
    save(`${dir}/deployment-verification.json`, { verified_at: new Date().toISOString(), commit, commit_files: [target], deployment_status: vercel.state, deployment_url: vercel.target_url, public_url: url, http_status: media.status, content_type: media.headers.get('content-type'), sha256: expected, bytes: bytes.length, approved_local_file: verification.output, matching_approved_bytes: true, license_evidence_retained: true, filename_suffix_is_historical: true });
    const pkg = read(`${base}/youtube-package.json`);
    const post = pkg.posts[0];
    assert(pkg.posts.length === 1 && post.platform === 'youtube' && post.caption === verification.preserved.caption && post.youtube.title === verification.preserved.title && post.scheduled_at === verification.preserved.scheduled_at, 'Reviewed content/time changed');
    assert(JSON.stringify(post.youtube) === JSON.stringify({ title: verification.preserved.title, categoryId: '28', privacy: 'public', madeForKids: false, notifySubscribers: true, embeddable: true, license: 'youtube', isAiGenerated: false }), 'Reviewed YouTube settings changed');
    post.media[0] = { kind: 'video', path: target, url, sha256: expected, preview_review: 'Owner watched and approved revised 15-second MP4 including Sleepy Cat soundtrack, existing visuals and unchanged caption; exact revised bytes verified against retained local source and deployed URL.' };
    const now = new Date().toISOString();
    pkg.approval = { decision: 'APPROVED', owner: 'Cesar', approved_at: now, evidence, package_sha256: packageDigest(pkg) };
    save(`${base}/youtube-package.json`, pkg);
    save(`${dir}/scheduling-authorization.json`, { decision: 'AUTHORIZE LIVE SCHEDULING', owner: 'Cesar', authorized_at: now, evidence, package_sha256: packageDigest(pkg) });
    const manifest = read(`${base}/hosting-manifest.json`);
    manifest.new_files_for_later_batch = [];
    manifest.existing_public_assets.push({ path: target, url, sha256: expected, bytes: bytes.length });
    manifest.estimated_new_media_bytes = 0;
    manifest.status = 'Approved YouTube MP4 deployed and verified; no additional files authorized';
    save(`${base}/hosting-manifest.json`, manifest);
    const result = await prepare(pkg, { client });
    assert(result.plans.length === 1, 'Expected exactly one dry-run plan');
    save(`${dir}/approved-dry-run.json`, { ...result, checked_at: new Date().toISOString(), duplicate_check: 'PASS', slot_available: true, operation_sha256: digest(result.plans[0].operation) });
    console.log(JSON.stringify({ mode: result.mode, package_sha256: result.package_sha256, slot_available: true, duplicate_check: 'PASS', scheduled_at: post.scheduled_at, media_verified: true }));
  } else {
    assert(!fs.existsSync(`${base}/youtube-publication-record.json`), 'Publication record already exists; do not retry');
    const pkg = read(`${base}/youtube-package.json`);
    const dry = read(`${dir}/approved-dry-run.json`);
    assert(dry.package_sha256 === packageDigest(pkg), 'Dry run package hash mismatch');
    const authorization = read(`${dir}/scheduling-authorization.json`);
    let records;
    try {
      records = await scheduleApprovedBatch(pkg, { authorization });
    } catch (error) {
      // Inspect only; never retry a failed or ambiguous create operation.
      const failure = { checked_at: new Date().toISOString(), error: client.redact(error.message), create_retried: false };
      try {
        const channels = await client.channels();
        const channel = channels.find((item) => item.id === pkg.posts[0].channel_id);
        const queue = await client.posts(channel);
        failure.matching_queue_posts = queue.filter((item) => item.text === pkg.posts[0].caption || Date.parse(item.dueAt) === Date.parse(pkg.posts[0].scheduled_at) || item.assets.some((asset) => asset.source === url));
      } catch (inspectionError) { failure.queue_inspection_error = client.redact(inspectionError.message); }
      save(`${dir}/scheduling-failure.json`, failure);
      throw error;
    }
    assert(records.length === 1, 'Unexpected scheduling result count');
    const record = records[0];
    // Save the returned ID before the independent queue retrieval, so it survives a read failure.
    save(`${base}/youtube-publication-record.json`, { ...record, create_attempts: 1, queue_verified: false, media_deployment_commit: commit, music_provenance: `${dir}/music-provenance.json` });
    const channels = await client.channels();
    const channel = channels.find((item) => item.id === pkg.posts[0].channel_id);
    const queue = await client.posts(channel);
    const actual = queue.find((item) => item.id === record.buffer_post_id);
    assert(actual && actual.channelId === pkg.posts[0].channel_id && actual.status === 'scheduled' && actual.text === pkg.posts[0].caption && Date.parse(actual.dueAt) === Date.parse(pkg.posts[0].scheduled_at) && actual.assets.some((asset) => asset.source === url), 'Independent queue verification failed; do not retry');
    const final = { ...record, queue_verified: true, queue_verified_at: new Date().toISOString(), queue_post_id: actual.id, queue_channel_id: actual.channelId, queue_due_at: actual.dueAt, queue_status: actual.status, queue_media: actual.assets, create_attempts: 1, media_deployment_commit: commit, music_provenance: `${dir}/music-provenance.json`, schedule_confirmation_source: 'Exact Buffer createPost response plus independently retrieved live queue' };
    save(`${base}/youtube-publication-record.json`, final);
    const fd = fs.openSync('growth/distribution/buffer/records.jsonl', 'a');
    try { fs.appendFileSync(fd, `${JSON.stringify(final)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const status = read(`${base}/review-status.json`);
    status.youtube = { status: 'SCHEDULED', approval: pkg.approval, uploaded: true, deployed: true, scheduled: true, buffer_post_id: actual.id, scheduled_at: pkg.posts[0].scheduled_at, queue_verified: true, create_attempts: 1, publication_record: 'youtube-publication-record.json' };
    save(`${base}/review-status.json`, status);
    console.log(JSON.stringify({ buffer_post_id: actual.id, channel_id: actual.channelId, status: actual.status, scheduled_at: pkg.posts[0].scheduled_at, queue_verified: true, create_attempts: 1 }));
  }
} catch (error) { console.error(client.redact(error.message)); process.exitCode = 1; }
