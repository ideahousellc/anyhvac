import fs from 'node:fs/promises';
import {openSync,appendFileSync,fsyncSync,closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {bufferClient,loadKey,CREATE_POST} from '../../distribution/buffer/client.mjs';
import {operation,digest,sha256,duplicateReasons,readRecords,CHANNELS} from '../../distribution/buffer/scheduler.mjs';
const dir='growth/promotions/2026-10-12-18',generated='growth/.generated/weekly/2026-10-12-18';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const mode=process.argv[2];
const journalPath='growth/distribution/buffer/records.jsonl';
const journal=record=>{const fd=openSync(journalPath,'a');try{appendFileSync(fd,JSON.stringify(record)+'\n');fsyncSync(fd);}finally{closeSync(fd);}};
if(mode==='prepare'){
 const calendar=await read(`${dir}/calendar.json`),pkg=await read(`${dir}/packages.json`),manifest=await read(`${dir}/media-manifest.json`);
 assert(pkg.version==='anyhvac-week-2026-10-12-v1','Wrong approved version');
 const posts=calendar.posts.map((p,i)=>{
  const source=pkg.packages.find(x=>x.id===p.package);
  assert(p.caption===source[p.platform],'Caption drift');assert(p.destination===source.destination,'Destination drift');
  return {post_id:`anyhvac-week-2026-10-12-v1-${p.platform}-${p.package}`,package_id:p.package,platform:p.platform,channel_id:p.channelId,caption:p.caption,destination_url:p.destination,scheduled_at:p.proposedSlot,ai_assisted:true,technical_review:'PASS',rights_review:'PASS',
   ...(p.platform==='instagram'?{instagram:{type:p.media[0].endsWith('.mp4')?'reel':'post',shouldShareToFeed:true,isAiGenerated:false}}:{}),
   ...(p.platform==='youtube'?{youtube:{title:p.title,categoryId:'28',privacy:'public',madeForKids:false,notifySubscribers:true,embeddable:true,license:'youtube',isAiGenerated:false}}:{}),
   media:p.media.map((file,index)=>{const a=manifest.assets.find(x=>x.file===file);assert(a,'Unapproved file');return {kind:file.endsWith('.mp4')?'video':'image',path:`public${a.futureBatchPath}`,url:`https://www.anyhvac.net${a.futureBatchPath}`,sha256:a.sha256,...(file.endsWith('.png')?{alt_text:source.slides?.[index]?.alt||source.alt}:{}),preview_review:'Owner explicitly approved complete finished weekly batch including media, captions/titles, destinations and schedule in this conversation; unchanged approved SHA-256.'};})};
 });
 const approved={batch_id:'anyhvac-week-2026-10-12',batch_version:'v1',timezone:'America/New_York',posts};
 const approval={decision:'APPROVED AND AUTHORIZED FOR EXECUTION',owner:'Cesar',recorded_at:new Date().toISOString(),evidence:'Conversation: GEORGE — WEEKLY CONTENT BATCH APPROVED FOR EXECUTION. Owner approved complete reviewed batch, public-media-only commit/push/deployment, exact Buffer adaptations and schedule.',approvedContentDigest:digest(approved),reviewManifestSha256:sha256(await fs.readFile(`${dir}/media-manifest.json`)),reviewCalendarSha256:sha256(await fs.readFile(`${dir}/calendar.json`)),reviewPackagesSha256:sha256(await fs.readFile(`${dir}/packages.json`)),platformSettings:'Reuse existing established Instagram post/reel and YouTube public Science & Technology settings; no generated-image disclosure because media is real photographs, original diagrams and authentic UI.'};
 for(const a of manifest.assets){const bytes=await fs.readFile(`${generated}/media/${a.file}`);assert(sha256(bytes)===a.sha256,'Approved asset changed');const target=`public${a.futureBatchPath}`;try{await fs.access(target);throw Error('Public destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}await fs.mkdir(resolve(target,'..'),{recursive:true});await fs.writeFile(target,bytes);}
 await fs.writeFile(`${dir}/execution-package.json`,JSON.stringify({approved,approval},null,2));
 console.log(JSON.stringify({copied:manifest.assets.length,totalBytes:manifest.assets.reduce((s,a)=>s+a.bytes,0),posts:posts.length,approvalDigest:approval.approvedContentDigest}));
}else{
 const packet=await read(`${dir}/execution-package.json`),{approved,approval}=packet;
 assert(digest(approved)===approval.approvedContentDigest,'Execution package changed');
 for(const [file,key] of [['media-manifest.json','reviewManifestSha256'],['calendar.json','reviewCalendarSha256'],['packages.json','reviewPackagesSha256']])assert(sha256(await fs.readFile(`${dir}/${file}`))===approval[key],'Owner-approved source changed');
 const inputs=new Set(approved.posts.map(p=>digest(operation(p).variables.input)));
 const client=bufferClient(loadKey(),{authorizeCreate:input=>mode==='schedule'&&inputs.has(digest(input))});
 const channels=await client.channels();
 async function checkPost(post,queue){const ch=channels.find(c=>c.id===post.channel_id&&c.service===post.platform);assert(ch&&CHANNELS[post.platform]===ch.id&&ch.timezone==='America/New_York'&&!ch.isDisconnected&&!ch.isLocked&&!ch.isQueuePaused,'Channel readiness failed');assert(Date.parse(post.scheduled_at)>Date.now()+300000,'Approved time passed');assert(duplicateReasons(post,queue,readRecords()).length===0,'Duplicate or slot collision');for(const asset of post.media)assert(sha256(await fs.readFile(asset.path))===asset.sha256,'Local asset changed');return ch;}
 async function hosted(){const manifest=await read(`${dir}/media-manifest.json`),results=[];for(const a of manifest.assets){const url=`https://www.anyhvac.net${a.futureBatchPath}`,r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)}),type=r.headers.get('content-type')?.split(';')[0],bytes=Buffer.from(await r.arrayBuffer());assert(r.status===200&&type===(a.file.endsWith('.png')?'image/png':'video/mp4')&&sha256(bytes)===a.sha256,`Hosted media failed: ${a.file}`);results.push({url,status:r.status,contentType:type,sha256:a.sha256,bytes:bytes.length});}await fs.writeFile(`${dir}/hosted-media-verification.json`,JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));return results;}
 if(mode==='preflight'||mode==='hosted'){
  const result=[];
  for(const platform of ['linkedin','instagram','youtube']){const ch=channels.find(c=>c.service===platform&&c.id===CHANNELS[platform]),queue=await client.posts(ch),plans=approved.posts.filter(p=>p.platform===platform);for(const p of plans)await checkPost(p,queue);const pending=queue.filter(p=>p.status!=='sent').length;assert(pending+plans.length<=10,'Capacity insufficient');result.push({platform,queued:pending,approvedToAdd:plans.length,after:pending+plans.length,limit:10});}
  if(mode==='hosted'){await hosted();for(const url of [...new Set(approved.posts.map(p=>p.destination_url))]){const r=await fetch(url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(20000)});assert(r.ok,'Destination unavailable');}}
  await fs.writeFile(`${dir}/execution-preflight.json`,JSON.stringify({checkedAt:new Date().toISOString(),mode,result,duplicates:'PASS',slots:'PASS',hostedVerified:mode==='hosted'},null,2));console.log(JSON.stringify(result));
 }else if(mode==='schedule'){
  const hostedEvidence=await read(`${dir}/hosted-media-verification.json`),deployment=await read(`${dir}/deployment-verification.json`);assert(deployment.state==='READY'&&deployment.commit&&hostedEvidence.results.length===20,'Deployment gate not verified');
  const lockPath=journalPath+'.lock';const lock=await fs.open(lockPath,'wx');await lock.writeFile(JSON.stringify({batch:approved.batch_id,started:new Date().toISOString()}));await lock.close();
  const complete=[];
  try{
   for(const post of approved.posts){const channel=channels.find(c=>c.id===post.channel_id),queue=await client.posts(channel);await checkPost(post,queue);assert(queue.filter(p=>p.status!=='sent').length<10,'Queue full; stop without touching existing posts');
    const op=operation(post),record={post_id:post.post_id,batch_id:approved.batch_id,batch_version:approved.batch_version,platform:post.platform,destination_channel_id:post.channel_id,destination_channel_name:'AnyHVAC',approved_media_references:post.media,caption:post.caption,approved_caption_reference:sha256(post.caption),canonical_destination_url:post.destination_url,scheduled_at:post.scheduled_at,timezone:'America/New_York',publication_status:'ATTEMPTING',buffer_post_id:null,published_at:null,public_url:null,owner_approval_evidence:approval.evidence,owner_approval_recorded_at:approval.recorded_at,package_sha256:approval.approvedContentDigest,operation_sha256:digest(op),queue_checked_at:new Date().toISOString(),duplicate_check:'PASS',media_deployment_commit:deployment.commit};
    journal(record);
    let data;try{data=await client.request(CREATE_POST,op.variables);}catch(e){journal({...record,publication_status:'RECONCILIATION REQUIRED',reason:String(e.message)});throw e;}
    const result=data.createPost,created=result?.post;
    if(result?.__typename!=='PostActionSuccess'||!created?.id||created.status!=='scheduled'||created.channelId!==post.channel_id||created.text!==post.caption||Date.parse(created.dueAt)!==Date.parse(post.scheduled_at)){journal({...record,buffer_post_id:created?.id||null,publication_status:'RECONCILIATION REQUIRED',provider_result:result});throw Error('Provider result not exactly scheduled; no retry');}
    journal({...record,buffer_post_id:created.id,publication_status:'SCHEDULED',provider_status:created.status,provider_checked_at:new Date().toISOString()});
    const fresh=await client.posts(channel),verified=fresh.find(p=>p.id===created.id);
    assert(verified?.status==='scheduled'&&verified.text===post.caption&&verified.channelId===post.channel_id&&Date.parse(verified.dueAt)===Date.parse(post.scheduled_at),'Queue confirmation failed; stop');
    assert(verified.assets.length===post.media.length&&verified.assets.every((a,i)=>a.source===post.media[i].url),'Scheduled media mismatch; stop');
    const final={...record,buffer_post_id:created.id,publication_status:'SCHEDULED',provider_status:'scheduled',queue_verified:true,provider_checked_at:new Date().toISOString(),create_attempts:1};journal(final);complete.push(final);
    await fs.writeFile(`${dir}/publication-record.json`,JSON.stringify({batch_id:approved.batch_id,version:approved.batch_version,approval,platform_publications:complete,notYetScheduled:approved.posts.filter(p=>!complete.some(r=>r.post_id===p.post_id)).map(p=>p.post_id),publication_status:'SCHEDULED IS NOT PUBLISHED'},null,2));console.log(JSON.stringify({platform:post.platform,id:created.id,at:post.scheduled_at,status:'scheduled'}));
   }
  }finally{await fs.unlink(lockPath);}
 }else throw Error('Expected prepare, preflight, hosted or schedule');
}
