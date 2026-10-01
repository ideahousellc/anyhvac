import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const [threePath, blenderPath, outputDirectory] = process.argv.slice(2).map((value) =>
  resolve(value),
);

if (!threePath || !blenderPath || !outputDirectory) {
  throw new Error(
    "Usage: node compare-hero-frames.mjs <three.png> <blender.png> <output-directory>",
  );
}

await mkdir(outputDirectory, { recursive: true });

const colors = {
  background: "#09111a",
  label: "#dce8ef",
  muted: "#8da4b3",
  divider: "#263846",
};

const labelSvg = (width, height, left, right, fontSize) =>
  Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.background}"/>
      <text x="${width * 0.25}" y="${height * 0.63}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700"
        letter-spacing="${fontSize * 0.06}" fill="${colors.label}">${left}</text>
      <text x="${width * 0.75}" y="${height * 0.63}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700"
        letter-spacing="${fontSize * 0.06}" fill="${colors.label}">${right}</text>
      <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}"
        stroke="${colors.divider}" stroke-width="2"/>
    </svg>
  `);

async function renderComparison({
  frameWidth,
  frameHeight,
  gap,
  margin,
  header,
  filename,
  fontSize,
}) {
  const canvasWidth = margin * 2 + frameWidth * 2 + gap;
  const canvasHeight = header + frameHeight + margin;
  const [three, blender] = await Promise.all([
    sharp(threePath).resize(frameWidth, frameHeight, { fit: "fill" }).png().toBuffer(),
    sharp(blenderPath).resize(frameWidth, frameHeight, { fit: "fill" }).png().toBuffer(),
  ]);

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: colors.background,
    },
  })
    .composite([
      { input: labelSvg(canvasWidth, header, "THREE.JS", "BLENDER", fontSize), left: 0, top: 0 },
      { input: three, left: margin, top: header },
      { input: blender, left: margin + frameWidth + gap, top: header },
    ])
    .png()
    .toFile(resolve(outputDirectory, filename));
}

await sharp(blenderPath)
  .resize(360, 640, { fit: "fill" })
  .png()
  .toFile(resolve(outputDirectory, "duct-hero-frame-blender-phone-360x640.png"));

await renderComparison({
  frameWidth: 1080,
  frameHeight: 1920,
  gap: 32,
  margin: 32,
  header: 88,
  filename: "three-vs-blender-full.png",
  fontSize: 32,
});

await renderComparison({
  frameWidth: 360,
  frameHeight: 640,
  gap: 20,
  margin: 20,
  header: 58,
  filename: "three-vs-blender-phone.png",
  fontSize: 20,
});

console.log(`Comparison assets written to ${outputDirectory}`);
