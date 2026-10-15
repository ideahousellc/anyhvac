import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = 'growth/promotions/2026-10-05-platform-tests/';
const hash = b => createHash('sha256').update(b).digest('hex');
const sourceRoot = 'growth/promotions/2026-10-05-linkedin/';
const provenance = JSON.parse(await readFile(sourceRoot + 'media-provenance.json', 'utf8'));
const photoBytes = await readFile(sourceRoot + 'source-chiller-ductwork.jpg');
if (hash(photoBytes) !== provenance.source_sha256) throw Error('Licensed source changed.');
const photo = await sharp(photoBytes).autoOrient().toBuffer();
const m = await sharp(photo).metadata();
const crop = await sharp(photo).extract({ left: 0, top: 0, width: m.width, height: Math.round(m.height * 0.43) })
  .resize(1080, 850, { fit: 'cover', position: 'north' }).png().toBuffer();
const logo = await sharp('public/Horizontal Logo.png').resize(350).png().toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081c32" stop-opacity="0"/><stop offset="1" stop-color="#081c32" stop-opacity="0.96"/></linearGradient></defs>
<rect width="1080" height="1920" fill="#fff"/>
<rect width="1080" height="120" fill="#081c32"/>
<image x="80" y="154" width="350" height="82" href="data:image/png;base64,${logo.toString('base64')}" preserveAspectRatio="xMinYMid meet"/>
<image x="0" y="280" width="1080" height="850" href="data:image/png;base64,${crop.toString('base64')}"/>
<rect x="0" y="650" width="1080" height="480" fill="url(#shade)"/>
<g font-family="Arial, sans-serif">
<text x="80" y="793" font-size="25" font-weight="700" letter-spacing="2" fill="#8bc2ff">FREE HVAC TOOL</text>
<text x="80" y="885" font-size="69" font-weight="700" fill="#fff">Outdoor air.</text>
<text x="80" y="973" font-size="69" font-weight="700" fill="#fff">Return air.</text>
<text x="80" y="1059" font-size="61" font-weight="700" fill="#fff">Explore mixed air.</text>
<text x="80" y="1215" font-size="47" font-weight="700" fill="#1f2a37">Mixed Air Calculator</text>
<text x="80" y="1276" font-size="30" fill="#4b5563">Define both streams. Set project pressure.</text>
<rect x="80" y="1325" width="810" height="96" rx="12" fill="#0057b8"/>
<text x="116" y="1386" font-size="34" font-weight="700" fill="#fff">Try the free calculator</text>
<text x="80" y="1490" font-size="40" font-weight="700" fill="#0057b8">anyhvac.net</text>
<text x="80" y="1540" font-size="27" fill="#4b5563">Tools → Mixed Air Calculator</text>
<text x="80" y="1607" font-size="23" fill="#4b5563">Verify inputs and assumptions before design use.</text>
<text x="80" y="1665" font-size="17" fill="#64748b">Photo: HVAC ductwork in the chiller plant room of the future LIRR</text>
<text x="80" y="1692" font-size="17" fill="#64748b">passenger concourse. MTA Capital Construction Mega Projects.</text>
<text x="80" y="1719" font-size="17" fill="#64748b">creativecommons.org/licenses/by/2.0/ · CM014B, 01-09-2019</text>
<text x="80" y="1746" font-size="17" fill="#64748b">flickr.com/photos/mtacc-esa/31760231797 · cropped + text overlay</text>
</g></svg>`;
await writeFile(root + 'mixed-air-short.svg', svg);
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(root + 'mixed-air-short-artwork.png', png);
await sharp(png).resize(360).png().toFile(root + 'mixed-air-phone-preview.png');
const audioPath = 'growth/.generated/promotions/2026-10-02-03/saturday-original-instrumental.wav';
const audioBytes = await readFile(audioPath);
if (hash(audioBytes) !== '140fe70480b71e2014069ffb4e1c43c1857b4b097236444b8b606952e775c0d0') throw Error('Approved instrumental changed.');
const bin = resolve('node_modules/@remotion/compositor-win32-x64-msvc');
const ffmpeg = resolve(bin, 'ffmpeg.exe');
function run(exe, args) { const r = spawnSync(exe, args, { encoding: 'utf8' }); if (r.status !== 0) throw Error(r.stderr); return r.stdout; }
run(ffmpeg, ['-y', '-loop', '1', '-i', resolve(root + 'mixed-air-short-artwork.png'), '-i', resolve(audioPath), '-t', '15', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-af', 'volume=0.8', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', resolve(root + 'mixed-air-short.mp4')]);
const probe = JSON.parse(run(resolve(bin, 'ffprobe.exe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', resolve(root + 'mixed-air-short.mp4')]));
for (const t of ['0', '7', '14']) run(ffmpeg, ['-y', '-ss', t, '-i', resolve(root + 'mixed-air-short.mp4'), '-frames:v', '1', resolve(root + `decoded-frame-${t}.png`)]);
run(ffmpeg, ['-y', '-i', resolve(root + 'mixed-air-short.mp4'), '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', resolve(root + 'decoded-audio.wav')]);
const wav = await readFile(root + 'decoded-audio.wav');
let pcm;
for (let offset = 12; offset + 8 <= wav.length;) { const size = wav.readUInt32LE(offset + 4); if (wav.toString('ascii', offset, offset + 4) === 'data') { pcm = wav.subarray(offset + 8, offset + 8 + size); break; } offset += 8 + size + size % 2; }
if (!pcm?.length) throw Error('Decoded WAV has no samples.');
let peak = 0, energy = 0, clips = 0;
for (let i = 0; i < pcm.length; i += 2) { const value = pcm.readInt16LE(i); peak = Math.max(peak, Math.abs(value)); energy += (value / 32768) ** 2; if (Math.abs(value) >= 32767) clips++; }
const video = probe.streams.find(s => s.codec_type === 'video');
const audio = probe.streams.find(s => s.codec_type === 'audio');
if (video.width !== 1080 || video.height !== 1920 || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' || audio.codec_name !== 'aac' || Number(probe.format.duration) !== 15 || clips !== 0) throw Error('Media verification failed.');
const outputBytes = await readFile(root + 'mixed-air-short.mp4');
await writeFile(root + 'media-verification.json', JSON.stringify({ dimensions: [1080, 1920], seconds: 15, frame_rate: video.r_frame_rate, codecs: [video.codec_name, audio.codec_name], bytes: outputBytes.length, sha256: hash(outputBytes), artwork_sha256: hash(png), audio_source: audioPath, audio_source_sha256: hash(audioBytes), audio_gain: 0.8, decoded_audio: { peak_dbfs: 20 * Math.log10(peak / 32768), rms_dbfs: 20 * Math.log10(Math.sqrt(energy / (pcm.length / 2))), clipped_samples: clips }, listening_review: 'Owner must review the complete finished MP4 with sound; prior approved instrumental reused, no new music generated.', probe }, null, 2) + '\n');
await writeFile(root + 'media-provenance.json', JSON.stringify({ status: 'OWNER REVIEW — NOT APPROVED', date_prepared: '2026-10-02', photograph: { ...provenance, status: 'Existing licensed photograph reused for a new unapproved composition', alterations: 'Equipment-area crop, vertical layout, promotional text overlay; no airflow direction or performance depicted.' }, music: { path: audioPath, sha256: hash(audioBytes), license: 'AnyHVAC original/internal composition', commercial_use: true, attribution_required: false, new_samples_or_generation: false, adaptation: 'Complete existing 15-second instrumental at 0.8 gain; AAC encode.' }, artwork: { path: root + 'mixed-air-short-artwork.png', sha256: hash(png) }, video: { path: root + 'mixed-air-short.mp4', sha256: hash(outputBytes), publication_approved: false, uploaded: false } }, null, 2) + '\n');
console.log(JSON.stringify({ path: root + 'mixed-air-short.mp4', duration: 15, dimensions: [1080, 1920], bytes: outputBytes.length, audio_clipped_samples: clips }));
