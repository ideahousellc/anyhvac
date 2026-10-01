import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory='growth/promotions/2026-10-02-03';
const media='growth/.generated/promotions/2026-10-02-03';
const hash=value=>createHash('sha256').update(value).digest('hex');
const original=await readFile(`${directory}/owner-review.md`,'utf8');
const captionSection=original.slice(original.indexOf('## LinkedIn'),original.indexOf('## Buffer inspection'));
const files=['friday-duct-reference.png','saturday-discover-anyhvac.png','saturday-discover-anyhvac.mp4','saturday-original-instrumental.wav'];
const retained=[];
for(const file of files) retained.push({path:`${media}/${file}`,sha256:hash(await readFile(`${media}/${file}`)),temporary:false,publication_confirmed:false,lifecycle_state:'QUEUED',publishing_system_requires_local_file:true});
const posts=[
 {platform:'linkedin',scheduled_at:'2026-10-02T15:00:00-04:00',asset:'friday-duct-reference.png'},
 {platform:'instagram',scheduled_at:'2026-10-02T18:00:00-04:00',asset:'friday-duct-reference.png'},
 {platform:'youtube-short',scheduled_at:'2026-10-03T19:00:00-04:00',asset:'saturday-discover-anyhvac.mp4'},
].map(post=>({...post,publication_status:'SCHEDULED',published_at:null,post_url:null,buffer_post_id:null,confirmation_source:'Owner confirmed manual scheduling in Buffer; provider publication not yet confirmed'}));
await writeFile(`${directory}/publication-record.json`,JSON.stringify({package_id:'2026-10-02-03',status:'SCHEDULED',publication_status:'SCHEDULED',owner_approval:{confirmed:true,confirmed_date:'2026-10-01',source:'Owner message: OWNER APPROVAL CONFIRMED'},timezone:'America/New_York',scheduling_source:'Owner-confirmed manual Buffer scheduling',buffer_queue_independently_verified:false,published_at:null,platform_publications:posts,media_retention:retained,approved_caption_section_sha256:hash(captionSection),caption_source:`${directory}/owner-review.md`,notes:'Record scheduled times from previously proposed slots and owner confirmation of all three posts. No external action performed by George. Remain SCHEDULED until successful publication is confirmed by Buffer per platform. Exact scheduling action time and Buffer IDs not supplied.'},null,2)+'\n');
let updated=original.replace('Status: OWNER REVIEW.','Status: SCHEDULED. Owner approval and manual Buffer scheduling confirmed October 1, 2026.');
updated=updated.replace('Nothing uploaded, scheduled, published, committed, pushed or deployed.','The owner manually scheduled all three posts in Buffer. George performed no upload, scheduling, publication, commit, push or deployment. Successful publication remains unconfirmed.');
updated=updated.replace('## Finished media and proposed schedule','## Approved media and owner-confirmed schedule').replace('Slots are proposed, not verified against the live Buffer queue.','The owner confirmed all three posts manually scheduled for these slots. The live queue has not been independently inspected.').replace('| Proposed date/time |','| Scheduled date/time |');
updated=updated.slice(0,updated.indexOf('## Owner decision'))+`## Owner decision\n\nAPPROVED by the owner; all three posts manually scheduled in Buffer. Status remains SCHEDULED, not PUBLISHED. Approved media and platform captions are preserved byte-for-byte. See publication-record.json for per-platform times, retention hashes and pending publication confirmations. No further approval is needed for this administrative recording; future external actions require separate authorization.\n`;
if(hash(updated.slice(updated.indexOf('## LinkedIn'),updated.indexOf('## Buffer inspection')))!==hash(captionSection)) throw new Error('Caption preservation check failed');
await writeFile(`${directory}/owner-review.md`,updated);
console.log('Recorded 3 SCHEDULED posts; captions unchanged; 4 media hashes retained.');
