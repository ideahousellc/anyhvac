// Batch-specific adaptation of the successful October 12 executor; local only.
import fs from 'node:fs/promises';
import {openSync,appendFileSync,fsyncSync,closeSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bufferClient,loadKey,CREATE_POST} from '../../distribution/buffer/client.mjs';
import {operation,digest,sha256,duplicateReasons,readRecords,CHANNELS} from '../../distribution/buffer/scheduler.mjs';
const dir='growth/promotions/2026-10-19-25-approved';
const commit='cdfb67923dda5d9d7e93ffc18fe2c8b9a13c2ab0';
const mode=process.argv[2];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
assert(['preflight','schedule','verify'].includes(mode),'Expected preflight, schedule or verify');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const content=await read(`${dir}/approved-content.json`),state=await read(`${dir}/approved-review-state.json`);
const manifest=await read(`${dir}/final-media-manifest.json`),{approved,approval}=await read(`${dir}/execution-package.json`);
assert(digest(content)==='bf8488e8273cb40ca0456c632f1680ebcea7a23d4dc112a17e8109539c694975','Approved content changed');
assert(digest(state)==='70b3a29f3733d40a806c4caa87e4746a39d5b46a86683703ad6a64d4e670d397','Approval history changed');
assert(digest(approved)==='18d1bf24fd5ad9e4ca795294979bce4007b6cf7ef3bf0483a1316c8ebb5de6ec'&&approval.approvedContentDigest===digest(approved),'Execution package changed');
assert(sha256(await fs.readFile(`${dir}/final-media-manifest.json`))===approval.reviewManifestSha256,'Manifest changed');
assert(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===commit,'Unexpected checkout commit');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],{encoding:'utf8'}).trim().split(/\r?\n/);
assert(changed.length===20&&changed.every(f=>manifest.assets.some(a=>f===`public/social/2026-10-19-25/${a.file}`)),'Deployment commit not media-only');
assert(approved.posts.length===13&&manifest.assets.length===20,'Wrong inventory');
for(const p of approved.posts){
 const s=content.posts.find(s=>s.id===p.post_id);
 assert(s&&p.caption===s.caption&&p.channel_id===s.channelId&&p.scheduled_at===s.scheduledAt&&p.destination_url===s.destination,'Approved post drift');
 assert(p.media.length===s.media.length&&p.media.every((m,i)=>m.sha256===s.media[i]&&(m.kind!=='image'||m.alt_text===s.alt[i])),'Media/order/alt drift');
 if(s.settings.instagram)assert(p.instagram.type===s.settings.instagram.postType&&p.instagram.shouldShareToFeed===s.settings.instagram.shareToFeed,'Instagram settings drift');
 if(s.settings.youtube)for(const [key,value] of Object.entries(s.settings.youtube))assert(p.youtube[key]===value,'YouTube settings drift');
 if(s.packageId==='main-airflow-area')assert(p.media.length===1&&p.media[0].sha256==='296114e1c4489c48e7e60169f4060af5ee2242ff575b7ce5db761341f00ef409','Wrong music video');
 for(const m of p.media)assert(sha256(await fs.readFile(m.path))===m.sha256,'Local media changed');
}
const inputs=new Set(approved.posts.map(p=>digest(operation(p).variables.input)));
const client=bufferClient(loadKey(),{authorizeCreate:input=>mode==='schedule'&&inputs.has(digest(input))});
const channels=await client.channels();
const journalPath='growth/distribution/buffer/records.jsonl';
const journal=r=>{const fd=openSync(journalPath,'a');try{appendFileSync(fd,JSON.stringify(r)+'\n');fsyncSync(fd);}finally{closeSync(fd);}};
async function check(p,queue){
 const c=channels.find(c=>c.id===p.channel_id&&c.service===p.platform);
 assert(c&&CHANNELS[p.platform]===c.id&&c.timezone==='America/New_York'&&!c.isDisconnected&&!c.isLocked&&!c.isQueuePaused,'Channel unavailable');
 assert(Date.parse(p.scheduled_at)>Date.now()+300000,'Approved slot expired or too close');
 const duplicates=duplicateReasons(p,queue,readRecords());assert(!duplicates.length,duplicates.join(' '));
 return c;
}
async function hosted(){
 const results=[];
 for(const a of manifest.assets){
  const url=`https://www.anyhvac.net/social/2026-10-19-25/${a.file}`;
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)}),type=r.headers.get('content-type')?.split(';')[0];
  const b=Buffer.from(await r.arrayBuffer());
  assert(r.status===200&&type===a.type&&b.length===a.bytes&&sha256(b)===a.sha256,`Public media failed: ${a.file}`);
  results.push({url,status:r.status,contentType:type,bytes:b.length,sha256:a.sha256});
 }
 await fs.writeFile(`${dir}/hosted-media-verification.json`,JSON.stringify({checkedAt:new Date().toISOString(),commit,results},null,2));
 console.log('Public media hashes: 20/20 PASS');
}
async function preflight(){
 await hosted();
 const queues=[];
 for(const platform of ['linkedin','instagram','youtube']){
  const c=channels.find(c=>c.id===CHANNELS[platform]);assert(c,'Missing channel');
  const queue=await client.posts(c),posts=approved.posts.filter(p=>p.platform===platform);
  for(const p of posts)await check(p,queue);
  const pending=queue.filter(p=>p.status!=='sent').length;
  assert(pending+posts.length<=10,'Insufficient free-plan capacity');
  queues.push({platform,channel:c,posts:queue});
  console.log(JSON.stringify({platform,pending,approvedToAdd:posts.length,duplicates:'PASS',slots:'PASS'}));
 }
 for(const url of new Set(approved.posts.map(p=>p.destination_url))){const r=await fetch(url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(20000)});assert(r.ok,'Destination unavailable');}
 await fs.writeFile(`${dir}/execution-preflight.json`,JSON.stringify({checkedAt:new Date().toISOString(),commit,queues},null,2));
}
async function verifyOne(p,id){
 const c=channels.find(c=>c.id===p.channel_id),fresh=await client.posts(c),a=fresh.find(x=>x.id===id);
 assert(a?.status==='scheduled'&&a.channelId===p.channel_id&&a.text===p.caption&&Date.parse(a.dueAt)===Date.parse(p.scheduled_at),`Independent post verification failed: ${id}`);
 assert(a.assets.length===p.media.length&&a.assets.every((m,i)=>m.source===p.media[i].url),`Media order failed: ${id}`);
 return {post_id:p.post_id,platform:p.platform,package_id:p.package_id,id,scheduledAt:p.scheduled_at,status:a.status,captionExact:true,channelExact:true,timeExact:true,mediaOrderExact:true};
}
if(mode==='preflight')await preflight();
if(mode==='schedule'){
 const deployment=await read(`${dir}/deployment-verification.json`);
 assert(deployment.commit===commit&&deployment.state==='READY'&&deployment.verificationSource==='Owner Vercel dashboard confirmation','Dashboard deployment gate missing');
 const lockPath=journalPath+'.lock',lock=await fs.open(lockPath,'wx');await lock.writeFile(JSON.stringify({batch:approved.batch_id,started:new Date().toISOString()}));await lock.close();
 const complete=[];
 try{
  await preflight();
  for(const post of approved.posts){
   const channel=channels.find(c=>c.id===post.channel_id),queue=await client.posts(channel);await check(post,queue);
   assert(queue.filter(p=>p.status!=='sent').length<10,'Queue full');
   const op=operation(post),record={post_id:post.post_id,batch_id:approved.batch_id,batch_version:approved.batch_version,platform:post.platform,destination_channel_id:post.channel_id,destination_channel_name:'AnyHVAC',approved_media_references:post.media,caption:post.caption,approved_caption_reference:sha256(post.caption),canonical_destination_url:post.destination_url,scheduled_at:post.scheduled_at,timezone:'America/New_York',publication_status:'ATTEMPTING',buffer_post_id:null,published_at:null,public_url:null,owner_approval_evidence:approval.evidence,owner_approval_recorded_at:approval.recorded_at,package_sha256:approval.approvedContentDigest,operation_sha256:digest(op),queue_checked_at:new Date().toISOString(),duplicate_check:'PASS',media_deployment_commit:commit};
   journal(record);
   let created;
   try{
    const data=await client.request(CREATE_POST,op.variables),result=data.createPost;created=result?.post;
    assert(result?.__typename==='PostActionSuccess'&&created?.id&&created.status==='scheduled'&&created.channelId===post.channel_id&&created.text===post.caption&&Date.parse(created.dueAt)===Date.parse(post.scheduled_at),'Unconfirmed provider result; no retry');
    journal({...record,buffer_post_id:created.id,publication_status:'SCHEDULED',provider_checked_at:new Date().toISOString()});
    await verifyOne(post,created.id);
   }catch(error){journal({...record,buffer_post_id:created?.id||null,publication_status:'RECONCILIATION REQUIRED',reason:client.redact(error.message)});throw error;}
   const final={...record,buffer_post_id:created.id,publication_status:'SCHEDULED',provider_status:'scheduled',queue_verified:true,provider_checked_at:new Date().toISOString(),create_attempts:1};journal(final);complete.push(final);
   await fs.writeFile(`${dir}/publication-record.json`,JSON.stringify({batch_id:approved.batch_id,version:approved.batch_version,approval,platform_publications:complete,notYetScheduled:approved.posts.filter(p=>!complete.some(r=>r.post_id===p.post_id)).map(p=>p.post_id),publication_status:'SCHEDULED IS NOT PUBLISHED'},null,2));
   console.log(JSON.stringify({platform:post.platform,id:created.id,at:post.scheduled_at,status:'scheduled',independentlyVerified:true}));
  }
 }finally{await fs.unlink(lockPath);}
}
if(mode==='verify'){
 const saved=await read(`${dir}/publication-record.json`);assert(saved.platform_publications.length===13&&!saved.notYetScheduled.length,'Incomplete scheduling');
 const results=[];for(const p of approved.posts){const record=saved.platform_publications.find(r=>r.post_id===p.post_id);assert(record?.buffer_post_id,'Missing post ID');results.push(await verifyOne(p,record.buffer_post_id));}
 await fs.writeFile(`${dir}/scheduling-verification.json`,JSON.stringify({checkedAt:new Date().toISOString(),commit,all13Verified:true,results,publicationVerified:false},null,2));
 const lines=(await fs.readFile(journalPath,'utf8')).split(/\r?\n/).filter(line=>line&&JSON.parse(line).batch_id===approved.batch_id);
 await fs.writeFile(`${dir}/scheduling-journal-backup.jsonl`,lines.join('\n')+'\n');
 console.log(JSON.stringify({verified:results.length,results}));
}
