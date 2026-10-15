import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sources = [
  { path: "growth/.generated/remotion-public/audio/003-duct-drive-music.wav", gain: 0.78 },
  { path: "growth/.generated/remotion-public/audio/003-duct-transitions-sfx.wav", gain: 0.6 },
];

async function readWav(source) {
  const buffer = await readFile(resolve(source.path));
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${source.path} is not a PCM WAV file`);
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);
  if (channels !== 2 || bits !== 16) throw new Error(`${source.path} must be stereo 16-bit PCM`);
  let offset = 12;
  let dataOffset = -1;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      dataOffset = offset + 8;
      dataLength = length;
      break;
    }
    offset += 8 + length + (length % 2);
  }
  if (dataOffset < 0) throw new Error(`${source.path} has no data chunk`);
  const frames = dataLength / 4;
  return {
    gain: source.gain,
    sampleRate,
    frames,
    sample(frame, channel) {
      return buffer.readInt16LE(dataOffset + frame * 4 + channel * 2) / 32768;
    },
  };
}

const waves = await Promise.all(sources.map(readWav));
if (!waves.every((wave) => wave.sampleRate === waves[0].sampleRate && wave.frames === waves[0].frames)) {
  throw new Error("Campaign #003 audio sources do not share duration and sample rate");
}

const sampleRate = waves[0].sampleRate;
const frames = waves[0].frames;
let peak = 0;
let sumSquares = 0;
let silentFrames = 0;
let longestSilentFrames = 0;
const silenceThreshold = 10 ** (-45 / 20);
const sections = [
  ["opening", 0, 3],
  ["consequence", 3, 7],
  ["implications", 7, 14],
  ["calculator", 14, 22],
  ["cta", 22, 26],
].map(([name, start, end]) => ({ name, start, end, sum: 0, count: 0 }));

for (let frame = 0; frame < frames; frame += 1) {
  let framePeak = 0;
  for (let channel = 0; channel < 2; channel += 1) {
    const mixed = waves.reduce((sum, wave) => sum + wave.sample(frame, channel) * wave.gain, 0);
    peak = Math.max(peak, Math.abs(mixed));
    framePeak = Math.max(framePeak, Math.abs(mixed));
    sumSquares += mixed * mixed;
    const time = frame / sampleRate;
    const section = sections.find((candidate) => time >= candidate.start && time < candidate.end);
    if (section) {
      section.sum += mixed * mixed;
      section.count += 1;
    }
  }
  if (framePeak < silenceThreshold) {
    silentFrames += 1;
    longestSilentFrames = Math.max(longestSilentFrames, silentFrames);
  } else {
    silentFrames = 0;
  }
}

const db = (value) => 20 * Math.log10(Math.max(value, Number.EPSILON));
const report = {
  durationSeconds: frames / sampleRate,
  sampleRate,
  channels: 2,
  mixedPeak: peak,
  mixedPeakDbfs: db(peak),
  mixedRmsDbfs: db(Math.sqrt(sumSquares / (frames * 2))),
  longestBelowMinus45DbSeconds: longestSilentFrames / sampleRate,
  sections: sections.map((section) => ({
    name: section.name,
    rmsDbfs: db(Math.sqrt(section.sum / section.count)),
  })),
};

console.log(JSON.stringify(report, null, 2));
if (peak >= 1) throw new Error("The authored audio mix clips before AAC encoding");
if (report.longestBelowMinus45DbSeconds >= 0.4) throw new Error("The authored mix contains an unintended silence");
