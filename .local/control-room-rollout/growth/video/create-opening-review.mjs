import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

import sharp from "sharp";

const [outputDirectory, ...sourceArguments] = process.argv.slice(2);

if (!outputDirectory || sourceArguments.length !== 4) {
  throw new Error(
    "Usage: node create-opening-review.mjs <output-directory> <0s.png> <0.5s.png> <1.5s.png> <3s.png>",
  );
}

const destination = resolve(outputDirectory);
const sources = sourceArguments.map((source) => resolve(source));
const labels = ["0.0 SEC", "0.5 SEC", "1.5 SEC", "3.0 SEC"];
const frameWidth = 250;
const frameHeight = 444;
const gap = 8;
const margin = 16;
const header = 64;
const canvasWidth = margin * 2 + frameWidth * 4 + gap * 3;
const canvasHeight = header + frameHeight + margin;

await mkdir(destination, { recursive: true });

const frames = await Promise.all(
  sources.map((source) =>
    sharp(source)
      .resize(frameWidth, frameHeight, { fit: "cover", position: "center" })
      .png()
      .toBuffer(),
  ),
);

const labelSvg = Buffer.from(`
  <svg width="${canvasWidth}" height="${header}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${canvasWidth}" height="${header}" fill="#09111a"/>
    ${labels
      .map(
        (label, index) => `
          <text x="${margin + frameWidth / 2 + index * (frameWidth + gap)}" y="40"
            text-anchor="middle" font-family="Arial, sans-serif" font-size="19"
            font-weight="700" letter-spacing="1.2" fill="#dce8ef">${label}</text>`,
      )
      .join("")}
  </svg>
`);

const outputPath = resolve(destination, "opening-sequence-contact-sheet.png");

await sharp({
  create: {
    width: canvasWidth,
    height: canvasHeight,
    channels: 3,
    background: "#09111a",
  },
})
  .composite([
    { input: labelSvg, left: 0, top: 0 },
    ...frames.map((input, index) => ({
      input,
      left: margin + index * (frameWidth + gap),
      top: header,
    })),
  ])
  .png()
  .toFile(outputPath);

console.log(`Contact sheet written to ${outputPath}`);
console.log(`Sources: ${sources.map((source) => basename(source)).join(", ")}`);
