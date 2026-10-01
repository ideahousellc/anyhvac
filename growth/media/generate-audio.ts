import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const publicRoot = resolve(root, "growth/.generated/remotion-public");
const audioDirectory = resolve(publicRoot, "audio");
const output = resolve(audioDirectory, "002-pressure-field-soundscape.wav");
const sampleRate = 44_100;
const seconds = 42;
const samples = sampleRate * seconds;
const data = Buffer.alloc(samples * 2);
let seed = 0x41485641;

function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0xffffffff;
}

let filteredNoise = 0;
for (let index = 0; index < samples; index += 1) {
  const time = index / sampleRate;
  const fade = Math.min(1, time / 1.4, (seconds - time) / 1.8);
  filteredNoise = filteredNoise * 0.985 + (random() * 2 - 1) * 0.015;
  const hum = Math.sin(2 * Math.PI * 55 * time) * 0.11 + Math.sin(2 * Math.PI * 110 * time) * 0.025;
  const air = filteredNoise * 0.24;
  const transitions = [4, 13, 25, 37].reduce((sum, moment) => {
    const delta = time - moment;
    if (delta < 0 || delta >= 0.7) return sum;
    return sum + Math.sin(Math.PI * delta / 0.7) * Math.sin(2 * Math.PI * (180 + 140 * delta) * time) * 0.045;
  }, 0);
  const value = Math.max(-1, Math.min(1, (hum + air + transitions) * fade));
  data.writeInt16LE(Math.round(value * 32767), index * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(audioDirectory, { recursive: true });
writeFileSync(output, Buffer.concat([header, data]));
copyFileSync(resolve(root, "public/Compact AH logo.png"), resolve(publicRoot, "Compact AH logo.png"));
console.log(`Prepared original Campaign #002 audio and render-only brand asset at ${publicRoot}`);

function writeStereoWav(path: string, duration: number, sample: (time: number, channel: number) => number) {
  const frameCount = Math.round(sampleRate * duration);
  const pcm = Buffer.alloc(frameCount * 4);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    for (let channel = 0; channel < 2; channel += 1) {
      const value = Math.max(-1, Math.min(1, sample(time, channel)));
      pcm.writeInt16LE(Math.round(value * 32767), frame * 4 + channel * 2);
    }
  }
  const wav = Buffer.alloc(44);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([wav, pcm]));
}

const campaign003Seconds = 26;
const beat = 0.5; // 120 BPM
const notes = [55, 65.41, 49, 73.42];
writeStereoWav(resolve(audioDirectory, "003-duct-drive-music.wav"), campaign003Seconds, (time, channel) => {
  const beatIndex = Math.floor(time / beat);
  const beatPhase = time % beat;
  const eighthPhase = time % (beat / 2);
  const bar = Math.floor(beatIndex / 4);
  const rootNote = notes[bar % notes.length];
  const fade = Math.min(1, time / 0.06, (campaign003Seconds - time) / 0.34);
  const productDrop = time >= 13.72 && time < 14.12 ? 0.24 : 1;
  const ctaResolve = time > 22 ? 1 - Math.max(0, time - 25.5) / 0.5 : 1;
  const kick = Math.sin(2 * Math.PI * (48 + 72 * Math.exp(-beatPhase * 22)) * time) * Math.exp(-beatPhase * 11) * 0.34;
  const snareGate = beatIndex % 4 === 1 || beatIndex % 4 === 3;
  const snareNoise = (random() * 2 - 1) * 0.72 + Math.sin(2 * Math.PI * 185 * time) * 0.28;
  const snare = snareGate ? snareNoise * Math.exp(-beatPhase * 20) * 0.16 : 0;
  const hat = (random() * 2 - 1) * Math.exp(-eighthPhase * 52) * (time > 3 ? 0.058 : 0.03);
  const bassWave = Math.sin(2 * Math.PI * rootNote * time) + Math.sin(2 * Math.PI * rootNote * 2 * time) * 0.24;
  const bass = bassWave * Math.exp(-beatPhase * 3.2) * 0.13;
  const arpFrequency = rootNote * [2, 2.5, 3, 4][beatIndex % 4];
  const arp = Math.sin(2 * Math.PI * arpFrequency * time + channel * 0.24) * Math.exp(-eighthPhase * 8) * (time > 7 ? 0.078 : 0.05);
  const chordGate = Math.exp(-(time % 2) * 0.72);
  const chord = [1, 1.25, 1.5].reduce(
    (sum, ratio, index) => sum + Math.sin(2 * Math.PI * rootNote * ratio * 2 * time + channel * 0.14 * index),
    0,
  ) * chordGate * (time > 13.9 ? 0.024 : 0.014);
  const mechanicalTick = Math.sin(2 * Math.PI * 1220 * time) * Math.exp(-eighthPhase * 70) * 0.018;
  const productLift = time > 14 ? Math.sin(2 * Math.PI * rootNote * 4 * time + channel * 0.38) * 0.028 : 0;
  return (kick + snare + hat + bass + arp + chord + mechanicalTick + productLift) * fade * productDrop * Math.max(0, ctaResolve) * 0.72;
});

writeStereoWav(resolve(audioDirectory, "003-duct-transitions-sfx.wav"), campaign003Seconds, (time, channel) => {
  const moments = [0, 3, 4.5, 7, 11, 14, 15.5, 17.5, 20, 22, 25.5];
  const whoosh = moments.reduce((sum, moment) => {
    const delta = time - moment;
    if (delta < 0 || delta > 0.42) return sum;
    const envelope = Math.sin(Math.PI * delta / 0.42);
    return sum + ((random() * 2 - 1) * 0.062 + Math.sin(2 * Math.PI * (145 + delta * 680) * time) * 0.048) * envelope;
  }, 0);
  const clicks = [15.5, 17.5, 20].reduce((sum, moment) => {
    const delta = time - moment;
    if (delta < 0 || delta > 0.12) return sum;
    return sum + Math.sin(2 * Math.PI * 940 * time) * Math.exp(-delta * 42) * 0.09;
  }, 0);
  return (whoosh + clicks) * (channel === 0 ? 0.9 : 1);
});

const imageDirectory = resolve(publicRoot, "images");
mkdirSync(imageDirectory, { recursive: true });
const calculatorStateDirectory = resolve(root, "growth/.generated/campaigns/003-why-duct-size-matters/calculator-states");
for (const filename of [
  "01-airflow-3000-friction-008.png",
  "02-airflow-5000-friction-008.png",
  "03-airflow-5000-friction-010.png",
]) {
  copyFileSync(resolve(calculatorStateDirectory, filename), resolve(imageDirectory, `003-${filename}`));
}

const campaign003Directory = resolve(publicRoot, "campaign-003");
mkdirSync(campaign003Directory, { recursive: true });
copyFileSync(
  resolve(root, "growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/duct-opening-blender-0-3s-1080x1920.mp4"),
  resolve(campaign003Directory, "approved-opening-0-3s.mp4"),
);
copyFileSync(
  resolve(root, "growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/representative-frames/3.0s-frame-0089.png"),
  resolve(campaign003Directory, "approved-opening-end.png"),
);
console.log("Prepared Campaign #003 final music, SFX, approved opening, and authentic calculator states.");
