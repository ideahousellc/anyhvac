import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import sharp from "sharp";

const week = "2026-10-12-18";
const source = `growth/promotions/${week}/media-production`;
const generated = resolve(`growth/.generated/weekly/${week}`);
const output = resolve(generated, "media");
const review = resolve(generated, "media-review");
await mkdir(output, { recursive: true }); await mkdir(review, { recursive: true });
const bin = resolve("node_modules/@remotion/compositor-win32-x64-msvc");
const ffmpeg = resolve(bin, "ffmpeg.exe"); const ffprobe = resolve(bin, "ffprobe.exe");
const musicPath = "growth/promotions/2026-10-05-platform-tests/audio-revision-v2/sleepy-cat-source.mp3";
const music = await readFile(musicPath);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (hash(music) !== "fc15a57f37b711f746e523bc89ee7311e2081cd4b25a6a89db0da33c3c42f64c") throw new Error("Licensed music identity changed");
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const logo = (await sharp("public/Horizontal Logo.png").resize({ width: 355 }).png().toBuffer()).toString("base64");
const pressurePhoto = await sharp(resolve(generated, "inputs/pressure-mechanical-room.jpg")).extract({ left: 0, top: 0, width: 2200, height: 2400 }).resize(1080, 1180, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer();
const airPhoto = await sharp(resolve(generated, "sources/air-handler-cc0.jpg")).resize(1080, 1180, { fit: "cover", position: "centre" }).jpeg({ quality: 90 }).toBuffer();
const photo = (bytes, x, y, w, h) => `<image href="data:image/jpeg;base64,${bytes.toString("base64")}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
const text = (x, y, size, value, fill = "#f8fafc", weight = 700, extra = "") => `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" ${extra}>${escape(value)}</text>`;
function base(height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071827" stop-opacity="0.08"/><stop offset="1" stop-color="#071827" stop-opacity="0.95"/></linearGradient></defs><rect width="1080" height="${height}" fill="#081b2c"/><g font-family="Arial,Helvetica,sans-serif">${content}</g></svg>`;
}
const promos = [
  { id: "promo-pressure-reference", photograph: pressurePhoto, tag: "FREE FIELD REFERENCE", headline: ["A pressure reading", "needs context."], support: ["Free field-reference PDF.", "Airflow methods. Pressure boundaries."], action: "Download the free reference", navigation: "anyhvac.net / Resources", limit: "Follow equipment-specific instructions and project requirements.", credit: "Photo: MTA Capital Construction / CC BY 2.0 / cropped", source: "pressure-photo.json" },
  { id: "promo-project-pressure", photograph: airPhoto, tag: "FREE PSYCHROMETRIC CALCULATOR", headline: ["Set the pressure.", "Check the air state."], support: ["Use project elevation or pressure.", "Then enter a supported air-state pair."], action: "Explore the free calculator", navigation: "anyhvac.net / Tools / Air Properties", limit: "Verify project inputs before using results in design.", credit: "Photo: Alf van Beem / Wikimedia Commons / CC0 / cropped", source: "air-handler-cc0" },
];
function promoSVG(p, height) {
  const vertical = height === 1920;
  const photoY = 162; const photoHeight = vertical ? 1040 : 725;
  const headlineY = vertical ? 888 : 656;
  const supportY = vertical ? 1278 : 1020;
  const ctaY = vertical ? 1420 : 1120;
  const content = `<rect width="1080" height="162" fill="#f6f8fb"/><image href="data:image/png;base64,${logo}" x="70" y="48" width="355" height="72"/>${text(1010, 96, 22, "INPUTS BEFORE CONCLUSIONS", "#0057b8", 700, 'text-anchor="end"')}${photo(p.photograph, 0, photoY, 1080, photoHeight)}<rect x="0" y="${photoY}" width="1080" height="${photoHeight}" fill="url(#shade)"/>${text(76, headlineY - 102, 24, p.tag, "#92c8ff", 700, 'letter-spacing="2"')}<rect x="76" y="${headlineY - 54}" width="7" height="176" rx="3" fill="#66b0ff"/>${p.headline.map((line, index) => text(106, headlineY + index * 83, 65, line)).join("")}${p.support.map((line, index) => text(76, supportY + index * 43, 31, line, "#d9e7f4", 400)).join("")}<rect x="76" y="${ctaY}" width="864" height="88" rx="14" fill="#0057b8"/>${text(112, ctaY + 56, 33, p.action)}${text(76, ctaY + 148, 28, p.navigation, "#8ac2ff")}${vertical ? text(76, 1690, 26, "Keep the system context in view.", "#e0e9f2", 400) : ""}${text(76, vertical ? 1750 : 1300, vertical ? 21 : 18, p.limit, "#c0d0e0", 400)}${text(76, vertical ? 1798 : 1333, vertical ? 17 : 14, p.credit, "#a9bbcd", 400)}`;
  return base(height, content);
}
function run(file, args, maxBuffer = 24 * 1024 * 1024) {
  const result = spawnSync(file, args, { encoding: "utf8", maxBuffer, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `${file} exited ${result.status}`);
  return result;
}
function loudness(path, filter = "") {
  const measured = run(ffmpeg, ["-hide_banner", "-i", path, "-vn", "-af", `${filter ? `${filter},` : ""}loudnorm=I=-18:TP=-2:LRA=7:print_format=json`, "-f", "null", "-"]);
  const matches = measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
  if (!matches?.length) throw new Error("Loudness measurement absent");
  return JSON.parse(matches.at(-1));
}
function makeMusic(name, start, duration) {
  const excerpt = resolve(review, `${name}-excerpt.wav`);
  const final = resolve(review, `${name}-music.wav`);
  const envelope = `atrim=duration=${duration},asetpts=PTS-STARTPTS,volume='if(isnan(t),0,if(lt(t,0.3),sin(t/0.3*PI/2),if(gt(t,${duration - 2.2}),sin(max(0,(${duration}-t)/2.2)*PI/2),1)))':eval=frame`;
  run(ffmpeg, ["-y", "-v", "error", "-ss", String(start), "-i", musicPath, "-t", String(duration), "-af", envelope, "-ar", "48000", "-ac", "2", excerpt]);
  const measured = loudness(excerpt);
  const norm = `loudnorm=I=-18:TP=-2:LRA=7:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
  run(ffmpeg, ["-y", "-v", "error", "-i", excerpt, "-af", norm, "-ar", "48000", "-ac", "2", final]);
  return { path: final, source_start_seconds: start, duration_seconds: duration, entry_fade_seconds: 0.3, exit_fade_seconds: 2.2, equalization: "No EQ applied; source recording preserved apart from trim/envelopes/normalization." };
}
const verification = { status: "OWNER REVIEW / LOCAL ONLY", date: "2026-10-06", artifacts: [], audio: [], main_claims: [], owner_listening_review: "Pending full playback of each new final mix; technical checks alone do not establish subjective comfort.", uploaded: false, deployed: false, scheduled: false };
async function register(path, id, role) {
  const bytes = await readFile(path); const metadata = await sharp(bytes).metadata();
  verification.artifacts.push({ package_id: id, role, path, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: hash(bytes), publication_approved: false });
}
for (let index = 0; index < promos.length; index++) {
  const p = promos[index];
  for (const [suffix, height] of [["social", 1350], ["vertical", 1920]]) {
    const svg = promoSVG(p, height); const path = resolve(output, `${p.id}-${suffix}.png`);
    await writeFile(resolve(review, `${p.id}-${suffix}.svg`), svg);
    await sharp(Buffer.from(svg)).png().toFile(path);
    await sharp(path).resize({ width: 360 }).png().toFile(resolve(review, `${p.id}-${suffix}-phone.png`));
    await register(path, p.id, suffix === "social" ? "LINKEDIN_INSTAGRAM" : "SHORT_ARTWORK_REVIEW");
  }
  const soundtrack = makeMusic(p.id, index === 0 ? 16 : 36, 16);
  const mp4 = resolve(output, `${p.id}-short.mp4`);
  run(ffmpeg, ["-y", "-v", "error", "-loop", "1", "-i", resolve(output, `${p.id}-vertical.png`), "-i", soundtrack.path, "-t", "16", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mp4]);
  await verifyVideo(mp4, p.id, soundtrack, true);
  console.log(`Rendered promotional artwork and static music Short: ${p.id}`);
}

const captureManifest = JSON.parse(await readFile(`${source}/calculator-capture-manifest.json`, "utf8"));
const screen = {};
for (const airflow of [3000, 5000]) {
  for (const part of ["inputs", "results", "wheel"]) {
    screen[`${airflow}-${part}`] = await readFile(resolve(generated, `inputs/calculator-${airflow}-${part}.png`));
  }
}
const crops = {
  input3000: await sharp(screen["3000-inputs"]).resize({ width: 820 }).png().toBuffer(),
  result3000: await sharp(screen["3000-results"]).resize({ width: 900 }).png().toBuffer(),
  result5000: await sharp(screen["5000-results"]).resize({ width: 900 }).png().toBuffer(),
  friction3000: await sharp(screen["3000-results"]).extract({ left: 252, top: 124, width: 133, height: 121 }).resize({ width: 470 }).png().toBuffer(),
  wheel: await sharp(screen["3000-wheel"]).resize({ width: 980 }).png().toBuffer(),
};
const pngImage = (bytes, x, y, w, h) => `<image href="data:image/png;base64,${bytes.toString("base64")}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const mainDuration = 28; const fps = 24;
const beats = [
  { start: 0, end: 3.5, type: "hook", lines: ["Nominal size", "changes the check."], caption: "A sizing result is a starting point." },
  { start: 3.5, end: 7.5, type: "input", lines: ["Start with a", "defined design point."], caption: "ILLUSTRATIVE: 3,000 CFM / 0.08 in. w.g./100 ft" },
  { start: 7.5, end: 11.5, type: "round", lines: ["Calculated diameter.", "Suggested nominal size."], caption: "Read both results before moving on." },
  { start: 11.5, end: 15.5, type: "friction", lines: ["At nominal size:", "check velocity + friction."], caption: "Derived output for this illustrative input." },
  { start: 15.5, end: 19.5, type: "change", lines: ["Change the airflow.", "Recheck the results."], caption: "ILLUSTRATIVE: 5,000 CFM / same design friction" },
  { start: 19.5, end: 23.5, type: "limits", lines: ["Fittings. Noise. Space.", "Project requirements."], caption: "Confirm the design beyond the calculator." },
  { start: 23.5, end: 28, type: "cta", lines: ["Make your next", "duct-sizing check."], caption: "Free HVAC Duct Calculator / anyhvac.net" },
];
function mainSVG(frame) {
  const t = frame / fps; const beat = beats.find((item) => t >= item.start && t < item.end) ?? beats.at(-1);
  const local = (t - beat.start) / (beat.end - beat.start);
  const drift = Math.sin(local * Math.PI) * 14;
  const textEntry = Math.max(0, 1 - (t - beat.start) / 0.35);
  let scene;
  if (["hook", "limits"].includes(beat.type)) {
    scene = photo(pressurePhoto, -40 - local * 30, 150 - local * 18, 1170 + local * 35, 1400 + local * 42) + `<rect y="150" width="1080" height="1430" fill="url(#shade)"/>`;
  } else {
    scene = pngImage(crops.wheel, -80 - local * 25, 435 + drift, 1260 + local * 30, 1260 + local * 30) + `<rect y="160" width="1080" height="1460" fill="#071827" opacity="0.82"/>`;
    if (beat.type === "input") scene += pngImage(crops.input3000, 130 - drift, 690 + drift, 820, 688);
    if (beat.type === "round") scene += pngImage(crops.result3000, 76 + drift, 720 - drift, 900, 573);
    if (beat.type === "friction") scene += pngImage(crops.friction3000, 298 - drift, 660 + drift, 470, 428) + text(140, 1250, 44, "Nominal velocity: 955 FPM", "#d5e9f9") + text(140, 1320, 30, "Same illustrative 3,000 CFM design point", "#a8c3d9", 400);
    if (beat.type === "change") scene += pngImage(crops.result5000, 76 - drift, 720 + drift, 900, 573);
    if (beat.type === "cta") scene += pngImage(crops.result5000, 98 + drift, 745 - drift, 860, 548) + `<rect x="96" y="1362" width="800" height="88" rx="14" fill="#0057b8"/>` + text(136, 1419, 36, "Tools / HVAC Duct Calculator");
  }
  const header = `<rect width="1080" height="158" fill="#f6f8fb"/><image href="data:image/png;base64,${logo}" x="72" y="44" width="355" height="72"/>${text(1006, 92, 22, "INPUTS BEFORE CONCLUSIONS", "#0057b8", 700, 'text-anchor="end"')}`;
  const title = `<g transform="translate(${textEntry * 45} 0)" opacity="${1 - textEntry}">${text(78, 310, 23, "FREE HVAC DUCT CALCULATOR", "#8dc6ff", 700, 'letter-spacing="2"')}${beat.lines.map((line, index) => text(78, 408 + index * 80, beat.type === "friction" ? 55 : 62, line)).join("")}</g>`;
  const footer = `<rect y="1560" width="1080" height="360" fill="#081b2c"/><rect x="76" y="1622" width="830" height="5" rx="2" fill="#17364e"/><rect x="76" y="1622" width="${830 * t / mainDuration}" height="5" rx="2" fill="#66b0ff"/>${text(76, 1688, 27, beat.caption, "#dfedf8", 400)}${text(76, 1760, 23, "Illustrative inputs and derived outputs. Verify project requirements.", "#adc2d5", 400)}${text(76, 1804, 20, "0.08 is an example input, not a universal design recommendation.", "#adc2d5", 400)}`;
  return base(1920, scene + header + title + footer);
}
const soundtrack = makeMusic("main-nominal-size", 16, mainDuration);
const main = resolve(output, "main-nominal-size.mp4");
const process = spawn(ffmpeg, ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "pipe:0", "-i", soundtrack.path, "-t", String(mainDuration), "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", main], { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
let errors = ""; process.stderr.on("data", (bytes) => { errors += bytes.toString(); });
const completed = once(process, "close");
const frameSamples = new Set([12, 48, 108, 204, 300, 396, 492, 588, 648]);
for (let frame = 0; frame < mainDuration * fps; frame++) {
  const png = await sharp(Buffer.from(mainSVG(frame))).png().toBuffer();
  if (frameSamples.has(frame)) {
    await writeFile(resolve(review, `main-frame-${String(frame).padStart(3, "0")}.png`), png);
    await sharp(png).resize({ width: 360 }).png().toFile(resolve(review, `main-frame-${String(frame).padStart(3, "0")}-phone.png`));
  }
  if (frame === 48) { await writeFile(resolve(output, "main-nominal-size-poster.png"), png); await register(resolve(output, "main-nominal-size-poster.png"), "main-nominal-size", "VIDEO_REVIEW_POSTER"); }
  if (!process.stdin.write(png)) await once(process.stdin, "drain");
  if (frame % 120 === 0) console.log(`Main video rendered ${frame}/${mainDuration * fps} frames`);
}
process.stdin.end(); const [exit] = await completed;
if (exit !== 0) throw new Error(errors);
await verifyVideo(main, "main-nominal-size", soundtrack, false);
verification.main_claims = captureManifest.outputs.map((state) => ({ classification: "DERIVED / ILLUSTRATIVE", values: state.values, source: `${source}/calculator-capture-manifest.json` }));
verification.main_beats = beats;
verification.audio_source = { path: musicPath, sha256: hash(music), title: "Sleepy Cat", artist: "Alejandro Magaña (A. M.)", license: "Mixkit Stock Music Free License", evidence: "growth/promotions/2026-10-05-platform-tests/audio-revision-v2/music-provenance.json", attribution_required: false, new_synthesis: false, standalone_hosting: false };
await writeFile(`${source}/media-verification.json`, JSON.stringify(verification, null, 2));
console.log(JSON.stringify({ finished_artifacts: verification.artifacts.length, videos: verification.audio.length, source_verification: `${source}/media-verification.json`, owner_listening_review: verification.owner_listening_review }));

async function verifyVideo(path, packageId, soundtrack, staticImage) {
  const metadata = JSON.parse(run(ffprobe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]).stdout);
  const measured = loudness(path);
  const decodedPath = resolve(review, `${packageId}-final-audio.wav`);
  run(ffmpeg, ["-y", "-v", "error", "-i", path, "-vn", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", decodedPath]);
  const wav = await readFile(decodedPath);
  let decoded;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const length = wav.readUInt32LE(offset + 4);
    if (wav.toString("ascii", offset, offset + 4) === "data") { decoded = wav.subarray(offset + 8, offset + 8 + length); break; }
    offset += 8 + length + length % 2;
  }
  if (!decoded) throw new Error("Audio decode data absent");
  let peak = 0; let clipped = 0;
  for (let offset = 0; offset < decoded.length; offset += 2) { const sample = decoded.readInt16LE(offset); peak = Math.max(peak, Math.abs(sample)); if (sample === 32767 || sample === -32768) clipped++; }
  const video = metadata.streams.find((stream) => stream.codec_type === "video"); const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  if (video.width !== 1080 || video.height !== 1920 || !audio || clipped || Number(measured.input_tp) > -1.5 || Math.abs(Number(metadata.format.duration) - soundtrack.duration_seconds) > 0.1) throw new Error("Video/audio safety verification failed");
  const bytes = await readFile(path);
  verification.artifacts.push({ package_id: packageId, role: staticImage ? "YOUTUBE_STATIC_SHORT" : "LINKEDIN_INSTAGRAM_YOUTUBE_MAIN", path, width: 1080, height: 1920, bytes: bytes.length, sha256: hash(bytes), duration_seconds: Number(metadata.format.duration), video_codec: video.codec_name, fps: video.r_frame_rate, publication_approved: false });
  verification.audio.push({ package_id: packageId, ...soundtrack, integrated_lufs: Number(measured.input_i), true_peak_dbtp: Number(measured.input_tp), decoded_sample_peak_dbfs: 20 * Math.log10(peak / 32768), clipped_pcm_samples: clipped, codec: audio.codec_name, sample_rate: audio.sample_rate, channels: audio.channels, listening_review: "Owner full-mix playback pending; reused licensed recorded music, not rejected synthesized notes.", static_image: staticImage });
}
