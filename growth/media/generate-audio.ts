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

const campaign003Seconds = 28;
const beat = 0.5; // 120 BPM
const notes = [55, 65.41, 49, 73.42];
writeStereoWav(resolve(audioDirectory, "003-duct-drive-music.wav"), campaign003Seconds, (time, channel) => {
  const beatIndex = Math.floor(time / beat);
  const beatPhase = time % beat;
  const eighthPhase = time % (beat / 2);
  const bar = Math.floor(beatIndex / 4);
  const rootNote = notes[bar % notes.length];
  const fade = Math.min(1, time / 0.15, (campaign003Seconds - time) / 0.45);
  const kick = Math.sin(2 * Math.PI * (52 + 55 * Math.exp(-beatPhase * 18)) * time) * Math.exp(-beatPhase * 10) * 0.34;
  const snareGate = beatIndex % 4 === 1 || beatIndex % 4 === 3;
  const snare = snareGate ? (random() * 2 - 1) * Math.exp(-beatPhase * 18) * 0.16 : 0;
  const hat = (random() * 2 - 1) * Math.exp(-eighthPhase * 46) * (time > 3 ? 0.065 : 0.035);
  const bass = Math.sin(2 * Math.PI * rootNote * time) * Math.exp(-beatPhase * 2.7) * 0.14;
  const arpFrequency = rootNote * [2, 2.5, 3, 4][beatIndex % 4];
  const arp = Math.sin(2 * Math.PI * arpFrequency * time + channel * 0.22) * Math.exp(-eighthPhase * 7) * (time > 7 ? 0.085 : 0.055);
  const lift = time > 15 ? Math.sin(2 * Math.PI * rootNote * 4 * time + channel * 0.35) * 0.035 : 0;
  return (kick + snare + hat + bass + arp + lift) * fade * 0.72;
});

writeStereoWav(resolve(audioDirectory, "003-duct-transitions-sfx.wav"), campaign003Seconds, (time, channel) => {
  const moments = [0, 3, 7, 11, 15, 20, 25];
  const whoosh = moments.reduce((sum, moment) => {
    const delta = time - moment;
    if (delta < 0 || delta > 0.55) return sum;
    const envelope = Math.sin(Math.PI * delta / 0.55);
    return sum + ((random() * 2 - 1) * 0.08 + Math.sin(2 * Math.PI * (180 + delta * 520) * time) * 0.055) * envelope;
  }, 0);
  return whoosh * (channel === 0 ? 0.9 : 1);
});

const calculatorCapture = resolve(root, "growth/.generated/campaigns/003-why-duct-size-matters/images/duct-calculator-page.png");
const imageDirectory = resolve(publicRoot, "images");
mkdirSync(imageDirectory, { recursive: true });
copyFileSync(calculatorCapture, resolve(imageDirectory, "003-duct-calculator-page.png"));
console.log("Prepared original Campaign #003 music, SFX, and authentic calculator capture.");
