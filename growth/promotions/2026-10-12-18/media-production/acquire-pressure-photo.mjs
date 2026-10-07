import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const source = "https://commons.wikimedia.org/wiki/File:Layout_and_installation_of_ducts_for_the_motor_fans_located_in_the_mechanical_room_of_a_ventilation_facility_in_Queens._(CS179,_02-13-2019)_(33228414918).jpg";
const download = "https://upload.wikimedia.org/wikipedia/commons/0/0e/Layout_and_installation_of_ducts_for_the_motor_fans_located_in_the_mechanical_room_of_a_ventilation_facility_in_Queens._%28CS179%2C_02-13-2019%29_%2833228414918%29.jpg";
const photoPath = "growth/.generated/weekly/2026-10-12-18/inputs/pressure-mechanical-room.jpg";
const provenancePath = "growth/promotions/2026-10-12-18/provenance";
await mkdir(resolve(provenancePath), { recursive: true });
const resources = [[source, `${provenancePath}/pressure-photo-commons.html`], ["https://creativecommons.org/licenses/by/2.0/", `${provenancePath}/cc-by-2.0.html`], [download, photoPath]];
let photo;
for (const [url, path] of resources) {
  const response = await fetch(url, { headers: { "User-Agent": "AnyHVAC local editorial preparation; no publishing" } });
  if (!response.ok) throw new Error(`Source retrieval failed ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(resolve(path), bytes);
  if (url === download) photo = bytes;
}
await writeFile(resolve(`${provenancePath}/pressure-photo.json`), JSON.stringify({
  asset_id: "pressure-mechanical-room-photo", source_title: "Layout and installation of ducts for motor fans in a ventilation-facility mechanical room in Queens (CS179, 02-13-2019)",
  author: "MTA Capital Construction Mega Projects", source_url: source, original_source: "https://www.flickr.com/photos/mtacc-esa/33228414918/", download_url: download,
  local_source: photoPath, source_sha256: createHash("sha256").update(photo).digest("hex"),
  license: "CC BY 2.0", license_url: "https://creativecommons.org/licenses/by/2.0/", commercial_use: true,
  attribution_required: true, attribution_text: "Photo: MTA Capital Construction Mega Projects / Wikimedia Commons, CC BY 2.0. Cropped and overlaid; no endorsement implied.",
  license_evidence: [`${provenancePath}/pressure-photo-commons.html`, `${provenancePath}/cc-by-2.0.html`],
  date_acquired: "2026-10-06", publication_approved: false,
  model_property_permission_notes: "Equipment and infrastructure illustration only; finished crop must contain no recognizable person. No operational condition, test procedure, endorsement or customer relationship asserted.",
  technical_review_notes: "Real ventilation-facility equipment photograph; not a pressure-tap-location diagram or a measured operating condition.",
}, null, 2));
console.log("Acquired pressure-reference photograph and license evidence locally.");
