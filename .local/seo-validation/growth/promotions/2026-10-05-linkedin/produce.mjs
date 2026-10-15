import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./', import.meta.url));
const logo = await sharp('public/Horizontal Logo.png').resize({ width: 330 }).png().toBuffer();
// Use the upper equipment portion of the real photograph. No people or
// equipment geometry are synthesized, and this is not an installation guide.
const source = await sharp(dir + 'source-chiller-ductwork.jpg').autoOrient().toBuffer();
const metadata = await sharp(source).metadata();
const photo = await sharp(source).extract({ left: 0, top: 0, width: metadata.width, height: Math.round(metadata.height * 0.60) })
  .resize(1080, 680, { fit: 'cover', position: 'north' }).png().toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081c32" stop-opacity="0"/><stop offset="1" stop-color="#081c32" stop-opacity="0.95"/></linearGradient></defs>
<rect width="1080" height="1350" fill="#ffffff"/>
<image href="data:image/png;base64,${logo.toString('base64')}" x="64" y="34" width="330" height="76" preserveAspectRatio="xMinYMid meet"/>
<text x="1016" y="81" text-anchor="end" font-family="Arial" font-size="22" font-weight="700" letter-spacing="2" fill="#0057b8">FREE HVAC TOOLS</text>
<image href="data:image/png;base64,${photo.toString('base64')}" x="0" y="140" width="1080" height="680"/>
<rect x="0" y="445" width="1080" height="375" fill="url(#shade)"/>
<g font-family="Arial, sans-serif">
<rect x="64" y="600" width="8" height="150" fill="#66b0ff"/>
<text x="98" y="656" font-size="65" font-weight="700" fill="#fff">Start your next</text>
<text x="98" y="731" font-size="65" font-weight="700" fill="#fff">duct design here.</text>
<text x="64" y="904" font-size="43" font-weight="700" fill="#1f2a37">HVAC Duct Calculator</text>
<text x="64" y="962" font-size="30" fill="#4b5563">Explore round and rectangular sizing.</text>
<rect x="64" y="1007" width="952" height="94" rx="10" fill="#0057b8"/>
<text x="100" y="1067" font-size="33" font-weight="700" fill="#fff">Try the free calculator</text>
<path d="M939 1054h36m-14-14 14 14-14 14" stroke="#fff" stroke-width="4" fill="none"/>
<text x="64" y="1154" font-size="29" font-weight="700" fill="#0057b8">anyhvac.net/tools/duct-calculator</text>
<text x="64" y="1215" font-size="24" fill="#4b5563">A starting point. Verify project requirements before final design.</text>
<path d="M64 1252H1016" stroke="#dbe3eb"/>
<text x="64" y="1278" font-size="16" fill="#64748b">Photo: HVAC ductwork in the chiller plant room of the future LIRR passenger concourse.</text>
<text x="64" y="1303" font-size="16" fill="#64748b">MTA Capital Construction Mega Projects · creativecommons.org/licenses/by/2.0/</text>
<text x="64" y="1328" font-size="16" fill="#64748b">flickr.com/photos/mtacc-esa/31760231797 · cropped + text overlay · CM014B, 01-09-2019</text>
</g></svg>`;
await writeFile(dir + 'duct-calculator-linkedin-v2.svg', svg);
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(dir + 'duct-calculator-linkedin-v2.png', png);
await sharp(png).resize(360).png().toFile(dir + 'phone-preview.png');
const hash = b => createHash('sha256').update(b).digest('hex');
const provenance = {
  status: 'OWNER REVIEW — NOT APPROVED', date_acquired: '2026-10-02',
  source_title: 'HVAC ductwork in the chiller plant room of the future LIRR passenger concourse. (CM014B, 01-09-2019)',
  author: 'MTA Capital Construction Mega Projects',
  source_url: 'https://www.flickr.com/photos/mtacc-esa/31760231797/',
  source_download: 'https://live.staticflickr.com/7800/31760231797_7829ccb792_o.jpg',
  source_sha256: hash(await readFile(dir + 'source-chiller-ductwork.jpg')),
  license: 'CC BY 2.0', license_url: 'https://creativecommons.org/licenses/by/2.0/',
  evidence: ['source-license-evidence.html', 'cc-by-2.0-evidence.html'],
  commercial_use: true, attribution_required: true,
  alterations: 'Equipment-area crop, resize, gradient and promotional text overlay.',
  people: 'No recognizable person appears in the finished equipment crop. No endorsement or customer relationship claimed.',
  branding: 'Existing public/Horizontal Logo.png; AnyHVAC internal brand asset.',
  output: 'duct-calculator-linkedin-v2.png', output_sha256: hash(png), width: 1080, height: 1350,
  public_media_url: null, hosting_status: 'BLOCKED — no upload or deployment authorized',
};
await writeFile(dir + 'media-provenance.json', JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ output: provenance.output, dimensions: [1080, 1350], sha256: provenance.output_sha256 }));
