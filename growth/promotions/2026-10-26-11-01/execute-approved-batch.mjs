// Batch-local adaptation of the October 19 executor. No deploy, runner or settings changes.
import fs from 'node:fs/promises';
import {openSync,appendFileSync,fsyncSync,closeSync} from 'node:fs';
import {bufferClient,loadKey,CREATE_POST} from '../../distribution/buffer/client.mjs';
import {operation,digest,sha256,duplicateReasons,readRecords,CHANNELS,easternTime} from '../../distribution/buffer/scheduler.mjs';
const dir='growth/promotions/2026-10-26-11-01',publicDir='public/social/2026-10-26-11-01';
const mode=process.argv[2];
const assert=(ok,m)=>{if(!ok)throw Error(m);};
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
assert(['preflight','schedule','verify'].includes(mode),'Expected preflight, schedule, verify');
const qa=await read(dir+'/qa-signoff.json');
for(const [file,hash]of Object.entries(qa.boundFiles))assert(sha256(await fs.readFile(dir+'/'+file))===hash,'Approved snapshot changed: '+file);
const calendar=await read(dir+'/calendar.json'),manifest=await read(dir+'/media-manifest.json'),slides=await read(dir+'/carousels.json');
assert(calendar.posts.length===13&&manifest.assets.length===20,'Wrong inventory');
for(const a of manifest.assets)assert(sha256(await fs.readFile(publicDir+'/'+a.file))===a.sha256,'Local media changed');
const key=loadKey();
let allowed=new Set();
const client=bufferClient(key,{authorizeCreate:input=>mode==='schedule'&&allowed.has(digest(input))});
const channels=await client.channels();
let packet;
try{packet=await read(dir+'/execution-package.json');}catch(e){if(e.code!=='ENOENT')throw e;}
if(!packet){
 assert(mode==='preflight','Run preflight to prepare immutable execution package');
 const posts=calendar.posts.map(p=>({post_id:p.id,package_id:p.packageId,platform:p.platform,channel_id:p.channelId,caption:p.caption,destination_url:p.destination,scheduled_at:p.proposedAt,original_scheduled_at:p.proposedAt,ai_assisted:true,technical_review:'PASS',rights_review:'PASS',
 ...(p.platform==='instagram'?{instagram:{type:p.media[0].endsWith('.mp4')?'reel':'post',shouldShareToFeed:true,isAiGenerated:false}}:{}),
 ...(p.platform==='youtube'?{youtube:{title:p.title,categoryId:'28',privacy:'public',madeForKids:false,notifySubscribers:false,embeddable:true,license:'youtube',isAiGenerated:false}}:{}),
 media:p.media.map(file=>{const a=manifest.assets.find(a=>a.file===file);assert(a,'Unknown media');const slide=slides.carousels.flatMap(c=>c.slides).find(s=>s.file===file);return {kind:a.type==='image/png'?'image':'video',path:publicDir+'/'+file,url:'https://www.anyhvac.net/social/2026-10-26-11-01/'+file,sha256:a.sha256,...(a.type==='image/png'?{alt_text:slide?.alt??p.alt}:{}),preview_review:'Exact owner-approved October 26 revision 1 media and caption; sampled QA and owner creative approval.'};})}));
 const adjustments=[];
 for(const p of posts){
  const c=channels.find(c=>c.id===p.channel_id);assert(c,'Missing target channel');
  if(Date.parse(p.scheduled_at)<=Date.now()+300000){
   const queue=await client.posts(c);let at=Math.ceil((Date.now()+3600000)/1800000)*1800000;
   while(queue.some(q=>q.dueAt&&Math.abs(Date.parse(q.dueAt)-at)<3600000)||posts.some(q=>q!==p&&q.channel_id===p.channel_id&&Math.abs(Date.parse(q.scheduled_at)-at)<3600000))at+=1800000;
   p.scheduled_at=easternTime(at);adjustments.push({postId:p.post_id,from:p.original_scheduled_at,to:p.scheduled_at,reason:'Expired or less than five minutes away; next free slot with at least one-hour lead and spacing.'});
  }
 }
 const approved={batch_id:'anyhvac-week-2026-10-26',batch_version:'v1-revision-1',timezone:'America/New_York',posts};
 packet={approved,approval:{owner:'Cesar',decision:'APPROVED AND AUTHORIZED FOR SCHEDULING',recorded_at:new Date().toISOString(),evidence:'Owner instruction: ANYHVAC — COMPLETE APPROVED BUFFER SCHEDULING. Schedule all 13 approved posts; owner confirms media-only commit pushed and Vercel Ready; move expired times to suitable future slots.',sourceCalendarSha256:sha256(await fs.readFile(dir+'/calendar.json')),approvedContentDigest:digest(approved),platformSettings:'Existing October 19 proven settings; YouTube category28 public, not made for kids, notifySubscribers=false; Instagram post/reel shares to feed.',adjustments}};
 await fs.writeFile(dir+'/execution-package.json',JSON.stringify(packet,null,2),{flag:'wx'});
}
const {approved,approval}=packet;
assert(digest(approved)===approval.approvedContentDigest,'Execution package changed');
for(const p of approved.posts){
 const source=calendar.posts.find(s=>s.id===p.post_id);
 assert(source&&p.caption===source.caption&&p.channel_id===source.channelId&&p.destination_url===source.destination&&p.original_scheduled_at===source.proposedAt,'Approved post changed');
 assert(p.media.length===source.media.length&&p.media.every((m,i)=>m.path===publicDir+'/'+source.media[i]&&m.sha256===manifest.assets.find(a=>a.file===source.media[i]).sha256),'Media order drift');
 assert(p.channel_id===CHANNELS[p.platform],'Wrong channel');
 const c=channels.find(c=>c.id===p.channel_id&&c.service===p.platform);
 assert(c&&c.timezone==='America/New_York'&&!c.isDisconnected&&!c.isLocked&&!c.isQueuePaused,'Channel unavailable');
 operation(p);
}
allowed=new Set(approved.posts.map(p=>digest(operation(p).variables.input)));
const journalPath='growth/distribution/buffer/records.jsonl';
const journal=r=>{const fd=openSync(journalPath,'a');try{appendFileSync(fd,JSON.stringify(r)+'\n');fsyncSync(fd);}finally{closeSync(fd);}};
async function hosted(){
 const results=[];
 for(const a of manifest.assets){const url='https://www.anyhvac.net/social/2026-10-26-11-01/'+a.file;const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});const b=Buffer.from(await r.arrayBuffer()),type=r.headers.get('content-type')?.split(';')[0];assert(r.status===200&&type===a.type&&b.length===a.bytes&&sha256(b)===a.sha256,'Hosted verification failed: '+a.file);results.push({url,status:r.status,contentType:type,bytes:b.length,sha256:sha256(b),matches:true});}
 await fs.writeFile(dir+'/hosted-media-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),productionOrigin:'https://www.anyhvac.net',ownerConfirmedReady:true,all20Verified:true,results},null,2));
 await fs.writeFile(dir+'/deployment-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),state:'READY',verificationSource:'Owner Vercel Ready confirmation plus independent production media byte verification',alias:'www.anyhvac.net',all20ProductionAssetsMatch:true,commit:null,limitation:'Owner confirmed pushed media commit; commit ID not independently established. Exact approved bytes verified on canonical production host.'},null,2));
}
async function check(p,queue){assert(Date.parse(p.scheduled_at)>Date.now()+300000,'Slot expired/too close; stop without publishing');const reasons=duplicateReasons(p,queue,readRecords());assert(!reasons.length,reasons.join(' '));}
async function preflight(){
 await hosted();const queues=[];
 for(const platform of ['linkedin','instagram','youtube']){const c=channels.find(c=>c.id===CHANNELS[platform]),queue=await client.posts(c),posts=approved.posts.filter(p=>p.platform===platform);for(const p of posts)await check(p,queue);const pending=queue.filter(p=>p.status!=='sent').length;assert(pending+posts.length<=10,'Queue capacity insufficient');queues.push({platform,channel:c,posts:queue});console.log(JSON.stringify({platform,pending,toAdd:posts.length,duplicates:'PASS',slots:'PASS'}));}
 await fs.writeFile(dir+'/execution-preflight.json',JSON.stringify({checkedAt:new Date().toISOString(),queues,adjustments:approval.adjustments},null,2));
}
async function verifyOne(p,id){const fresh=await client.posts(channels.find(c=>c.id===p.channel_id)),a=fresh.find(q=>q.id===id);assert(a?.status==='scheduled'&&a.channelId===p.channel_id&&a.text===p.caption&&Date.parse(a.dueAt)===Date.parse(p.scheduled_at),'Independent verification failed: '+id);assert(a.assets.length===p.media.length&&a.assets.every((m,i)=>m.source===p.media[i].url),'Media verification failed: '+id);return {post_id:p.post_id,platform:p.platform,package_id:p.package_id,id,scheduledAt:p.scheduled_at,status:a.status,captionExact:true,channelExact:true,timeExact:true,mediaOrderExact:true};}
if(mode==='preflight')await preflight();
if(mode==='schedule'){
 const lockPath=journalPath+'.lock';const lock=await fs.open(lockPath,'wx');await lock.writeFile(JSON.stringify({batch:approved.batch_id,at:new Date().toISOString()}));await lock.close();
 const complete=[];
 try{
  await preflight();
  for(const p of approved.posts){
   const queue=await client.posts(channels.find(c=>c.id===p.channel_id));await check(p,queue);assert(queue.filter(q=>q.status!=='sent').length<10,'Queue full');
   const op=operation(p),record={post_id:p.post_id,batch_id:approved.batch_id,batch_version:approved.batch_version,platform:p.platform,destination_channel_id:p.channel_id,destination_channel_name:'AnyHVAC',approved_media_references:p.media,caption:p.caption,approved_caption_reference:sha256(p.caption),canonical_destination_url:p.destination_url,scheduled_at:p.scheduled_at,timezone:'America/New_York',publication_status:'ATTEMPTING',buffer_post_id:null,published_at:null,public_url:null,owner_approval_evidence:approval.evidence,owner_approval_recorded_at:approval.recorded_at,package_sha256:approval.approvedContentDigest,operation_sha256:digest(op),queue_checked_at:new Date().toISOString(),duplicate_check:'PASS'};
   journal(record);let created;
   try{const data=await client.request(CREATE_POST,op.variables),result=data.createPost;created=result?.post;assert(result?.__typename==='PostActionSuccess'&&created?.id&&created.status==='scheduled'&&created.channelId===p.channel_id&&created.text===p.caption&&Date.parse(created.dueAt)===Date.parse(p.scheduled_at),'Unconfirmed create result; no retry');journal({...record,buffer_post_id:created.id,publication_status:'SCHEDULED'});await verifyOne(p,created.id);}catch(e){journal({...record,buffer_post_id:created?.id??null,publication_status:'RECONCILIATION REQUIRED',reason:client.redact(e.message)});throw e;}
   const final={...record,buffer_post_id:created.id,publication_status:'SCHEDULED',provider_status:'scheduled',queue_verified:true,provider_checked_at:new Date().toISOString(),create_attempts:1};journal(final);complete.push(final);
   await fs.writeFile(dir+'/publication-record.json',JSON.stringify({batch_id:approved.batch_id,approval,platform_publications:complete,notYetScheduled:approved.posts.filter(p=>!complete.some(r=>r.post_id===p.post_id)).map(p=>p.post_id),publication_status:'SCHEDULED IS NOT PUBLISHED'},null,2));
   console.log(JSON.stringify({platform:p.platform,id:created.id,at:p.scheduled_at,status:'scheduled',independentlyVerified:true}));
  }
 }finally{await fs.unlink(lockPath);}
}
if(mode==='verify'){
 const saved=await read(dir+'/publication-record.json');assert(saved.platform_publications.length===13&&!saved.notYetScheduled.length,'Incomplete scheduling');const results=[];
 for(const p of approved.posts){const r=saved.platform_publications.find(r=>r.post_id===p.post_id);assert(r?.buffer_post_id,'Missing ID');results.push(await verifyOne(p,r.buffer_post_id));}
 await fs.writeFile(dir+'/scheduling-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),all13Verified:true,results,publicationVerified:false},null,2));
 const lines=(await fs.readFile(journalPath,'utf8')).split(/\r?\n/).filter(line=>line&&JSON.parse(line).batch_id===approved.batch_id);await fs.writeFile(dir+'/scheduling-journal-backup.jsonl',lines.join('\n')+'\n');
 console.log(JSON.stringify({verified:results.length,adjustments:approval.adjustments,results},null,2));
}
