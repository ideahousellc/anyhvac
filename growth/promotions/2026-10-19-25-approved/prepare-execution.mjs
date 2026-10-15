// Local operator preparation only. No Git, deployment, provider writes or runner.
import fs from 'node:fs/promises';
import path from 'node:path';
import {digest, sha256, operation, CHANNELS} from '../../distribution/buffer/scheduler.mjs';

const dir = 'growth/promotions/2026-10-19-25-approved';
const target = 'public/social/2026-10-19-25';
const assert = (ok, message) => { if (!ok) throw Error(message); };
const content = JSON.parse(await fs.readFile(`${dir}/approved-content.json`, 'utf8'));
const state = JSON.parse(await fs.readFile(`${dir}/approved-review-state.json`, 'utf8'));
const manifestBytes = await fs.readFile(`${dir}/final-media-manifest.json`);
const manifest = JSON.parse(manifestBytes);
assert(digest(content) === 'bf8488e8273cb40ca0456c632f1680ebcea7a23d4dc112a17e8109539c694975', 'Approved content changed');
assert(digest(state) === '70b3a29f3733d40a806c4caa87e4746a39d5b46a86683703ad6a64d4e670d397', 'Approved history changed');
assert(state.versions.at(-1).number === 5 && digest(state.versions.at(-1).content) === digest(content), 'Revision mismatch');
assert(manifest.assets.length === 20 && content.media.length === 20 && content.posts.length === 13, 'Inventory mismatch');
assert(new Set(manifest.assets.map(m => m.file)).size === 20, 'Duplicate filenames');
const media = new Map();
for (const asset of manifest.assets) {
  assert(/^[a-z0-9-]+\.(png|mp4)$/.test(asset.file), 'Invalid media filename');
  const approved = content.media.find(m => m.id === asset.sha256);
  assert(approved && approved.file === asset.file && approved.bytes === asset.bytes, 'Manifest differs from approval');
  const source = path.resolve(asset.path);
  assert(source.startsWith(path.resolve('growth/.generated') + path.sep), 'Source outside generated media');
  const bytes = await fs.readFile(source);
  assert(bytes.length === asset.bytes && sha256(bytes) === asset.sha256, 'Source media hash mismatch');
  media.set(asset.sha256, {asset, bytes});
}
const main = content.posts.filter(p => p.packageId === 'main-airflow-area');
assert(main.length === 3 && main.every(p => p.media.length === 1 && p.media[0] === '296114e1c4489c48e7e60169f4060af5ee2242ff575b7ce5db761341f00ef409'), 'Wrong main video');
const posts = content.posts.map(p => {
  assert(CHANNELS[p.platform] === p.channelId && Date.parse(p.scheduledAt) > Date.now() + 300000, 'Channel/time mismatch');
  const ig = p.settings.instagram, yt = p.settings.youtube;
  const post = {post_id:p.id, package_id:p.packageId, platform:p.platform, channel_id:p.channelId,
    caption:p.caption, destination_url:p.destination, scheduled_at:p.scheduledAt, ai_assisted:true,
    technical_review:'PASS', rights_review:'PASS',
    ...(ig ? {instagram:{type:ig.postType, shouldShareToFeed:ig.shareToFeed, isAiGenerated:false}} : {}),
    ...(yt ? {youtube:{...yt, embeddable:true, license:'youtube', isAiGenerated:false}} : {}),
    media:p.media.map((id,i) => {
      const {asset} = media.get(id);
      const image = asset.type === 'image/png';
      assert(!image || typeof p.alt[i] === 'string', 'Missing approved alt text');
      return {kind:image?'image':'video', path:`${target}/${asset.file}`,
        url:`https://www.anyhvac.net/social/2026-10-19-25/${asset.file}`, sha256:id,
        ...(image ? {alt_text:p.alt[i]} : {}), preview_review:'Exact owner-approved revision 5 asset; existing approved crop and audio preserved.'};
    })};
  operation(post); // Reuse the established Buffer request mapper.
  return post;
});
const approved = {batch_id:content.batchId, batch_version:'v2-revision-5', timezone:content.timezone, posts};
const approval = {decision:'APPROVED AND AUTHORIZED FOR EXECUTION', owner:'Cesar', recorded_at:new Date().toISOString(),
  evidence:'Owner instruction: ANYHVAC — EXECUTE OCTOBER 19–25 APPROVED BATCH; resumed with owner-mediated Git operations.',
  approvedContentDigest:digest(approved), sourceContentDigest:digest(content), reviewManifestSha256:sha256(manifestBytes),
  platformSettings:'Preserve explicit revision-5 settings, including YouTube notifySubscribers=false. Remaining embeddable/license/disclosure defaults reuse the October 12 executor.'};
// Preflight all source bytes and any existing destination before creating anything.
try {
  const names = await fs.readdir(target);
  assert(names.length === 20 && names.every(n => manifest.assets.some(a => a.file === n)), 'Unexpected public inventory');
  for (const {asset} of media.values()) assert(sha256(await fs.readFile(`${target}/${asset.file}`)) === asset.sha256, 'Existing public media differs');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(target, {recursive:true});
for (const {asset,bytes} of media.values()) {
  try { await fs.writeFile(`${target}/${asset.file}`, bytes, {flag:'wx'}); }
  catch (error) { if (error.code !== 'EEXIST' || sha256(await fs.readFile(`${target}/${asset.file}`)) !== asset.sha256) throw error; }
}
await fs.writeFile(`${dir}/execution-package.json`, JSON.stringify({approved,approval}, null, 2));
console.log(JSON.stringify({preparedAssets:media.size, totalBytes:[...media.values()].reduce((s,m)=>s+m.bytes.length,0), posts:posts.length, contentDigest:digest(content), executionDigest:digest(approved), publicDirectory:target}));
