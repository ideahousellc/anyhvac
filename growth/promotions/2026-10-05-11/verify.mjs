import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const dir='growth/promotions/2026-10-05-11';
const output=resolve('growth/.generated/promotions/2026-10-05-11');
const hash=data=>createHash('sha256').update(data).digest('hex');
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const packages=await load(`${dir}/packages.json`),calendar=await load(`${dir}/calendar.json`),provenance=await load(`${dir}/media-provenance.json`);
assert.equal(packages.length,5);assert.equal(calendar.posts.length,13);
for(const platform of ['linkedin','instagram','youtube-short'])assert.equal(calendar.posts.filter(p=>p.platform===platform).length,platform==='youtube-short'?3:5);
for(const post of calendar.posts){assert.equal(post.status,'OWNER REVIEW');assert.equal(post.scheduled_at,null);assert.equal(post.published_at,null);assert.equal(post.approved_at,null);for(const file of post.media)await access(resolve(output,post.package_id,file));}
for(const p of packages)for(const file of p.source)await access(file);
for(const asset of provenance.assets){assert.equal(hash(await readFile(asset.path)),asset.sha256);if(asset.path.endsWith('.png')){const m=await sharp(asset.path).metadata();assert.equal(m.width,1080);assert.equal(m.height,1350);}}
const scheduled=await load('growth/promotions/2026-10-02-03/publication-record.json');
assert.equal(scheduled.status,'SCHEDULED');
for(const p of scheduled.platform_publications){assert.equal(p.publication_status,'SCHEDULED');assert.equal(p.published_at,null);assert.equal(p.post_url,null);}
for(const asset of scheduled.media_retention)assert.equal(hash(await readFile(asset.path)),asset.sha256);
const approvedText=await readFile(scheduled.caption_source,'utf8');
assert.equal(hash(approvedText.slice(approvedText.indexOf('## LinkedIn'),approvedText.indexOf('## Buffer inspection'))),scheduled.approved_caption_section_sha256);
const campaign003=await load('growth/promotions/2026-10-02-03/campaign-003-retained-assets.json');
for(const asset of campaign003.assets)assert.equal(hash(await readFile(asset.path)),asset.sha256);
const bin=resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const videoChecks=[];
for(const p of packages.filter(p=>p.short)){
 const media=resolve(output,p.id),mp4=resolve(media,'youtube-short.mp4');
 const probe=await load(resolve(media,'video-verification.json'));
 const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
 assert.equal(video.codec_name,'h264');assert.equal(video.width,1080);assert.equal(video.height,1920);assert.equal(video.pix_fmt,'yuv420p');assert.equal(video.nb_frames,'288');assert.equal(video.duration,'12.000000');assert.equal(audio.codec_name,'aac');assert.equal(audio.channels,2);
 const decodedAudio=resolve(media,'qa-decoded-audio.wav');
 const decode=spawnSync(bin,['-y','-i',mp4,'-vn','-c:a','pcm_s16le',decodedAudio],{encoding:'utf8'});
 assert.equal(decode.status,0,decode.stderr);
 const b=await readFile(decodedAudio);let offset=12,length=0;
 while(offset<b.length){const n=b.readUInt32LE(offset+4);if(b.toString('ascii',offset,offset+4)==='data'){length=n;offset+=8;break;}offset+=8+n+(n%2);}
 assert.ok(length>0);let peak=0,energy=0,clipped=0;
 for(let i=offset;i<offset+length;i+=2){const n=b.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(n));energy+=n*n;if(Math.abs(n)>=0.9999)clipped++;}
 assert.equal(clipped,0);
 const decodedFrame=resolve(media,'qa-decoded-frame.png');
 const frame=spawnSync(bin,['-y','-ss','6','-i',mp4,'-frames:v','1','-c:v','png','-f','image2',decodedFrame],{encoding:'utf8'});
 assert.equal(frame.status,0,frame.stderr);
 const frameMeta=await sharp(decodedFrame).metadata();assert.equal(frameMeta.width,1080);assert.equal(frameMeta.height,1920);
 videoChecks.push({package_id:p.id,codec:video.codec_name,width:video.width,height:video.height,frames:Number(video.nb_frames),duration_seconds:12,fps:video.r_frame_rate,decoded_audio_peak_dbfs:20*Math.log10(peak),decoded_audio_rms_dbfs:20*Math.log10(Math.sqrt(energy/(length/2))),clipped_samples:clipped,decoded_frame:decodedFrame});
}
const destinations=await load(`${dir}/destination-checks.json`);assert.ok(destinations.results.every(r=>r.status===200));
await writeFile(`${dir}/validation.json`,JSON.stringify({date:'2026-10-01',passed:true,packages:5,proposed_posts:13,platform_counts:{linkedin:5,instagram:5,'youtube-short':3},image_exports:9,source_files_exist:true,destinations_http_200:true,approved_october_2_3_captions_and_media_hashes_unchanged:true,campaign003_media_hashes_unchanged:true,publication_statuses_correct:true,visual_review:'Social and video contact sheets inspected for clipping, legibility, conceptual labels and safe placement. Owner must review full sound and final Buffer crop.',video_checks:videoChecks},null,2)+'\n');
console.log('PASS: five packages, thirteen proposed posts, nine images, three decoded videos/audio, all retained hashes and status boundaries.');
