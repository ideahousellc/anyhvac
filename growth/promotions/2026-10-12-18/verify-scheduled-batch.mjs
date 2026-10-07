import fs from 'node:fs/promises';
import {bufferClient,loadKey} from '../../distribution/buffer/client.mjs';
const dir='growth/promotions/2026-10-12-18';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const {approved}=await read(`${dir}/execution-package.json`),publication=await read(`${dir}/publication-record.json`),before=await read('growth/.generated/weekly/2026-10-12-18/buffer-snapshot.json');
const client=bufferClient(loadKey()),channels=await client.channels(),results=[],counts=[],preserved=[];
if(publication.platform_publications.length!==13||publication.notYetScheduled.length)throw Error('Incomplete scheduling records');
for(const platform of ['linkedin','instagram','youtube']){
 const ch=channels.find(c=>c.service===platform),queue=await client.posts(ch),records=publication.platform_publications.filter(r=>r.platform===platform);
 for(const record of records){const source=approved.posts.find(p=>p.post_id===record.post_id),actual=queue.find(p=>p.id===record.buffer_post_id);if(!actual||actual.status!=='scheduled'||actual.channelId!==source.channel_id||actual.text!==source.caption||Date.parse(actual.dueAt)!==Date.parse(source.scheduled_at)||JSON.stringify(actual.assets.map(a=>a.source))!==JSON.stringify(source.media.map(a=>a.url)))throw Error('Final queue mismatch');results.push({platform,id:actual.id,scheduledAt:source.scheduled_at,status:actual.status,package:source.package_id,captionExact:true,mediaOrderExact:true});}
 for(const old of before.channels.find(c=>c.channel.service===platform).posts){const current=queue.find(p=>p.id===old.id);if(JSON.stringify(current)!==JSON.stringify(old))throw Error('Previously existing Buffer record changed');preserved.push(old.id);}
 counts.push({platform,scheduled:queue.filter(p=>p.status==='scheduled').length,freePlanLimit:10});
}
const result={checkedAt:new Date().toISOString(),all13Verified:true,results,counts,previousRecordsUnchanged:preserved,remaining:[],publicationVerified:false};
await fs.writeFile(`${dir}/scheduling-verification.json`,JSON.stringify(result,null,2));
await fs.writeFile(`${dir}/scheduling-journal-backup.jsonl`,(await fs.readFile('growth/distribution/buffer/records.jsonl','utf8')).split(/\r?\n/).filter(line=>line&&JSON.parse(line).batch_id===approved.batch_id).join('\n')+'\n');
console.log(JSON.stringify({verified:results.length,counts,previousRecordsUnchanged:preserved.length,remaining:0}));
