// Local-only import of historical scheduling records; no provider client is imported.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {digest,validate} from '../../lib/weekly/domain.ts';
const root=process.cwd(),source='growth/promotions/2026-10-12-18/';
const read=name=>fs.readFile(source+name,'utf8');
const packages=JSON.parse(await read('packages.json')),calendar=JSON.parse(await read('calendar.json'));
const execution=JSON.parse(await read('execution-package.json')),manifest=JSON.parse(await read('media-manifest.json'));
const publication=JSON.parse(await read('publication-record.json')),qa=JSON.parse(await read('batch-validation.json'));
if(qa.status!=='PASS'||publication.platform_publications.length!==13)throw Error('Historical fixture incomplete');
const config=JSON.parse(await fs.readFile('.local/agent-inbox/review-config.json','utf8'));
const owner=createHash('sha256').update('anyhvac-agent-owner:'+config.username).digest('hex');
const directory=path.join(root,'.local/agent-inbox/weekly',owner);
try{await fs.access(path.join(directory,'state.json'));throw Error('Existing review preserved; import refused.');}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const evidence=await Promise.all(['packages.json','batch-validation.json','execution-package.json','media-manifest.json'].map(async name=>hash(await read(name))));
const media=[];
await fs.mkdir(path.join(directory,'media'),{recursive:true});
for(const asset of manifest.assets){
 if(!/^[a-z0-9-]+\.(png|mp4)$/.test(asset.file))throw Error('Invalid fixture filename');
 const bytes=await fs.readFile(path.join(root,'public',asset.futureBatchPath));
 if(hash(bytes)!==asset.sha256||bytes.length!==asset.bytes)throw Error('Historical media hash changed');
 await fs.writeFile(path.join(directory,'media',asset.sha256),bytes,{mode:0o600});
 media.push({id:asset.sha256,sha256:asset.sha256,file:asset.file,bytes:bytes.length,type:asset.file.endsWith('.mp4')?'video/mp4':'image/png'});
}
const content={batchId:'anyhvac-week-2026-10-12',agentId:'anyhvac.george',theme:packages.theme,timezone:'America/New_York',fixture:true,
 packages:packages.packages.map(p=>({id:p.id,title:p.title,purpose:p.purpose,primaryMetric:p.primaryMetric,technicalBoundary:p.technicalBoundary,
 provenance:[p.photoProvenance,p.musicProvenance].filter(Boolean).map(r=>({source:r.source_url??r.page??r.source??r.catalog_url??'Original AnyHVAC diagram/site capture',license:r.license??r.license_name??'',credit:r.attribution_text??r.credit??r.optional_credit??r.author??'',evidence:[evidence[0]],notes:r.rights??r.modifications??r.model_property_permission_notes??r.releases??''}))})),
 posts:execution.approved.posts.map(p=>{const original=calendar.posts.find(x=>x.platform===p.platform&&x.package===p.package_id);if(!original||original.caption!==p.caption)throw Error('Historical caption drift');
 const actual=publication.platform_publications.find(x=>x.post_id===p.post_id);if(!actual||actual.scheduled_at!==p.scheduled_at)throw Error('Historical scheduling record drift');
 return{id:p.post_id,packageId:p.package_id,platform:p.platform,title:original.title,caption:p.caption,destination:p.destination_url,scheduledAt:p.scheduled_at,channelId:p.channel_id,media:p.media.map(m=>m.sha256),settings:{...(p.instagram?{instagram:p.instagram}:{}),...(p.youtube?{youtube:p.youtube}:{}),ai_assisted:p.ai_assisted},alt:p.media.map(m=>m.alt_text??''),historicalStatus:actual.publication_status};}),
 media,qa:{technical:'PASS',rights:'PASS',media:'PASS',evidence}};
validate(content);
const state={versions:[{number:1,digest:digest(content),createdAt:new Date().toISOString(),reason:'Historical October 12–17 schedule imported from October 12–18 source folder; local review fixture only, never reschedule.',content}],actions:[]};
await fs.writeFile(path.join(directory,'state.json'),JSON.stringify(state),{flag:'wx',mode:0o600});
console.log(JSON.stringify({packages:5,posts:13,assets:media.length,totalBytes:media.reduce((s,m)=>s+m.bytes,0),digest:state.versions[0].digest,sourceDatesPreserved:true,providerActions:0}));
