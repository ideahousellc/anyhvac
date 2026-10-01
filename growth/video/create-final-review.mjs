import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const [framesDirectory, outputDirectory] = process.argv.slice(2).map((value) => resolve(value));
if (!framesDirectory || !outputDirectory) {
  throw new Error("Usage: node create-final-review.mjs <frames-directory> <output-directory>");
}

const moments = [
  ["00.5", "0.5 SEC"],
  ["03.5", "3.5 SEC"],
  ["05.5", "5.5 SEC"],
  ["08.5", "8.5 SEC"],
  ["12.5", "12.5 SEC"],
  ["14.5", "14.5 SEC"],
  ["15.8", "15.8 SEC"],
  ["17.8", "17.8 SEC"],
  ["20.5", "20.5 SEC"],
  ["22.5", "22.5 SEC"],
  ["24.5", "24.5 SEC"],
  ["25.8", "25.8 SEC"],
];

const frameWidth = 270;
const frameHeight = 480;
const labelHeight = 46;
const columns = 4;
const rows = 3;
const gap = 8;
const margin = 12;
const cellHeight = labelHeight + frameHeight;
const canvasWidth = margin * 2 + columns * frameWidth + (columns - 1) * gap;
const canvasHeight = margin * 2 + rows * cellHeight + (rows - 1) * gap;

await mkdir(outputDirectory, { recursive: true });
const composites = [];

for (const [filename, label] of moments) {
  const index = moments.findIndex(([candidate]) => candidate === filename);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const left = margin + column * (frameWidth + gap);
  const top = margin + row * (cellHeight + gap);
  const frame = await sharp(resolve(framesDirectory, `t-${filename}.png`))
    .resize(frameWidth, frameHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const labelImage = Buffer.from(`
    <svg width="${frameWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${frameWidth}" height="${labelHeight}" fill="#07111b"/>
      <text x="${frameWidth / 2}" y="30" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="18" font-weight="700"
        letter-spacing="1.2" fill="#e7f0f5">${label}</text>
    </svg>
  `);
  composites.push({ input: labelImage, left, top });
  composites.push({ input: frame, left, top: top + labelHeight });
}

const output = resolve(outputDirectory, "final-campaign-contact-sheet.png");
await sharp({
  create: { width: canvasWidth, height: canvasHeight, channels: 3, background: "#07111b" },
})
  .composite(composites)
  .png()
  .toFile(output);

console.log(`Final campaign contact sheet written to ${output}`);
