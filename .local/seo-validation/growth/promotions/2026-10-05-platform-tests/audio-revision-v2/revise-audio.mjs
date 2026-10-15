import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const base = 'growth/promotions/2026-10-05-platform-tests';
const dir = `${base}/audio-revision-v2`;
const ffmpeg = path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const ffprobe = path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
const original = `${base}/mixed-air-short.mp4`;
const source = `${dir}/sleepy-cat-source.mp3`;
const output = `${dir}/mixed-air-short-audio-v2.mp4`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (binary, args) => {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result;
};
const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const probe = (file) => JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
const packets = (file) => JSON.parse(run(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256', '-show_entries', 'packet=pts_time,dts_time,duration_time,size,data_hash', '-of', 'json', file]).stdout).packets;
const loudness = (input, filters, seek = []) => {
  const result = run(ffmpeg, ['-hide_banner', ...seek, '-i', input, '-vn', '-af', `${filters ? `${filters},` : ''}loudnorm=I=-18:TP=-2:LRA=7:print_format=json`, '-f', 'null', '-']);
  return JSON.parse(result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] || '{}');
};

if (sha(await fs.readFile(original)) !== '86098e26c422d213ba43f764bcc73dc5a3e8bc1122dedb3f17332a5691f0c8d4') throw new Error('Approved visual source changed');
const pkg = JSON.parse(await fs.readFile(`${base}/youtube-package.json`, 'utf8'));
const before = { caption: pkg.posts[0].caption, title: pkg.posts[0].youtube.title, scheduled_at: pkg.posts[0].scheduled_at };
// Equal-power entry and exit envelopes, applied only to the existing recorded music.
const envelope = "atrim=duration=15,asetpts=PTS-STARTPTS,volume='if(isnan(t),0,if(lt(t,0.25),sin(t/0.25*PI/2),if(gt(t,12.8),sin(max(0,(15-t)/2.2)*PI/2),1)))':eval=frame";
const measured = loudness(source, envelope, ['-ss', '16']);
const normalize = `loudnorm=I=-18:TP=-2:LRA=7:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=json`;
run(ffmpeg, ['-y', '-hide_banner', '-i', original, '-ss', '16', '-i', source, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `${envelope},${normalize}`, '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-t', '15', '-movflags', '+faststart', output]);
const oldPackets = packets(original);
const newPackets = packets(output);
if (JSON.stringify(oldPackets) !== JSON.stringify(newPackets) || newPackets.length !== 450) throw new Error('Video stream preservation failed');
const metadata = probe(output);
const finalLoudness = loudness(output, '');
const pcmPath = `${dir}/review-audio.wav`;
run(ffmpeg, ['-y', '-v', 'error', '-i', output, '-vn', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', pcmPath]);
const wav = await fs.readFile(pcmPath);
let pcm;
for (let offset = 12; offset + 8 <= wav.length;) {
  const length = wav.readUInt32LE(offset + 4);
  if (wav.toString('ascii', offset, offset + 4) === 'data') { pcm = wav.subarray(offset + 8, offset + 8 + length); break; }
  offset += 8 + length + (length % 2);
}
if (!pcm) throw new Error('PCM data missing');
let peak = 0;
let clipped = 0;
for (let offset = 0; offset < pcm.length; offset += 2) {
  const sample = pcm.readInt16LE(offset);
  peak = Math.max(peak, Math.abs(sample));
  if (sample === -32768 || sample === 32767) clipped++;
}
if (clipped || Number(finalLoudness.input_tp) > -1.5 || Math.abs(Number(metadata.format.duration) - 15) > 0.05) throw new Error('Audio/duration safety check failed');
const bytes = await fs.readFile(output);
const hash = sha(bytes);
const verification = {
  checked_at: new Date().toISOString(), output, sha256: hash, bytes: bytes.length,
  duration_seconds: Number(metadata.format.duration),
  video: { codec: metadata.streams[0].codec_name, width: metadata.streams[0].width, height: metadata.streams[0].height, frame_rate: metadata.streams[0].r_frame_rate, unchanged_encoded_packets: newPackets.length, packet_data_and_timing_identical: true, packet_manifest_sha256: sha(JSON.stringify(newPackets)) },
  audio: { codec: metadata.streams[1].codec_name, channels: metadata.streams[1].channels, sample_rate: metadata.streams[1].sample_rate, integrated_lufs: Number(finalLoudness.input_i), true_peak_dbtp: Number(finalLoudness.input_tp), decoded_sample_peak_dbfs: 20 * Math.log10(peak / 32768), clipped_pcm_samples: clipped, source_start_seconds: 16, source_end_seconds: 31, entry_fade_seconds: 0.25, exit_fade_seconds: 2.2, normalization_target_lufs: -18 },
  preserved: before, listening_review: 'Owner playback approval required; this environment cannot audition audio. Technical checks do not establish subjective musical suitability.',
  uploaded: false, deployed: false, scheduled: false, approval: null,
};
await writeJson(`${dir}/verification.json`, verification);
await writeJson(`${dir}/music-provenance.json`, {
  track: 'Sleepy Cat', artist: 'Alejandro Magaña (A. M.)', provider: 'Mixkit',
  catalog_url: 'https://mixkit.co/free-stock-music/chillout/', download_url: 'https://assets.mixkit.co/music/135/135.mp3',
  license_name: 'Mixkit Stock Music Free License', license_url: 'https://mixkit.co/license/modal/musicFree/', terms_url: 'https://mixkit.co/terms/', attribution_faq_url: 'https://mixkit.co/free-stock-music/',
  rights: 'Free commercial and non-commercial use in promotional web/social videos including YouTube. Editing permitted for synchronized video. Attribution not required.',
  restrictions: 'No standalone music redistribution, music-only remix, ownership claim or rights-management registration. No TV/radio, video games or CDs/DVDs.',
  attribution_required: false, optional_credit: 'Music: Sleepy Cat — Alejandro Magaña (A. M.), via Mixkit.',
  local_source: source, source_sha256: sha(await fs.readFile(source)), license_evidence: ['mixkit-track-evidence.html', 'mixkit-license-evidence.html', 'mixkit-music-faq-evidence.html', 'mixkit-terms-evidence.html'],
  selection_basis: 'Provider labels this existing full-length recording Downtempo, Atmospheric, Bass and Drums. Subjective warmth, arrangement and suitability remain subject to owner listening review.',
  edit: '16–31 second excerpt; 0.25 second smooth entry, 2.2 second smooth exit; two-pass loudness normalization; synchronized with unchanged approved visual stream.', checked_at: verification.checked_at,
});
pkg.batch_version = 'v2';
pkg.approval = null;
pkg.posts[0].media[0] = { kind: 'video', path: output, url: `https://www.anyhvac.net/social/mixed-air-short-${hash.slice(0, 16)}.mp4`, sha256: hash, preview_review: 'Approved visuals preserved byte-for-byte. Existing licensed Mixkit soundtrack replaces rejected synthesized audio. Owner audio/video approval pending; not uploaded.' };
if (JSON.stringify(before) !== JSON.stringify({ caption: pkg.posts[0].caption, title: pkg.posts[0].youtube.title, scheduled_at: pkg.posts[0].scheduled_at })) throw new Error('Caption/title/slot changed');
await writeJson(`${base}/youtube-package.json`, pkg);
const manifest = JSON.parse(await fs.readFile(`${base}/hosting-manifest.json`, 'utf8'));
manifest.new_files_for_later_batch = [{ source: output, target: `public/social/mixed-air-short-${hash.slice(0, 16)}.mp4`, url: pkg.posts[0].media[0].url, sha256: hash, bytes: bytes.length }];
manifest.estimated_new_media_bytes = bytes.length;
await writeJson(`${base}/hosting-manifest.json`, manifest);
const status = JSON.parse(await fs.readFile(`${base}/review-status.json`, 'utf8'));
status.youtube = { status: 'VISUAL DIRECTION APPROVED; REVISED AUDIO/VIDEO PENDING OWNER APPROVAL', approval: null, uploaded: false, deployed: false, scheduled: false, revision: 'audio-revision-v2', previous_soundtrack: 'REJECTED' };
await writeJson(`${base}/review-status.json`, status);
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
await fs.writeFile(`${dir}/review.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AnyHVAC Mixed Air — audio revision review</title><style>body{background:#101b28;color:#f4f6f8;font:16px system-ui;max-width:900px;margin:32px auto;padding:0 24px}video{display:block;width:auto;max-width:100%;height:70vh;margin:24px auto}pre{white-space:pre-wrap;line-height:1.6}a{color:#8ddcfa}</style><h1>Mixed Air Short — revised soundtrack</h1><p>Press Play and listen with sound enabled. Local review only; publication approval remains pending.</p><video controls playsinline preload="auto" src="mixed-air-short-audio-v2.mp4"></video><p>15 seconds • approved visuals unchanged • Thursday, October 8, 2026, 7 PM EDT</p><p>Music: “Sleepy Cat” by Alejandro Magaña (A. M.), via <a href="https://mixkit.co/free-stock-music/chillout/">Mixkit</a>. <a href="https://mixkit.co/license/modal/musicFree/">Free commercial/social video license</a>; no attribution required.</p><p>Measured ${verification.audio.integrated_lufs} LUFS; ${verification.audio.true_peak_dbtp} dBTP; zero clipped PCM samples. Owner listening review is still required.</p><h2>Unchanged caption</h2><pre>${escape(before.caption)}</pre></html>`);
console.log(JSON.stringify(verification, null, 2));
