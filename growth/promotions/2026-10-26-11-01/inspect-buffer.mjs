import fs from 'node:fs/promises';
import {bufferClient,loadKey} from '../../distribution/buffer/client.mjs';
const dir='growth/promotions/2026-10-26-11-01';
try {
const client=bufferClient(loadKey());const channels=(await client.channels()).filter(c=>['linkedin','instagram','youtube'].includes(c.service));
const prior=JSON.parse(await fs.readFile('growth/promotions/2026-10-19-25-approved/publication-record.json','utf8')).platform_publications;
const snapshots=[];for(const channel of channels){const posts=await client.posts(channel); snapshots.push({service:channel.service,channelId:channel.id,disconnected:channel.isDisconnected,locked:channel.isLocked,paused:channel.isQueuePaused,posts});}
const result={checkedAt:new Date().toISOString(),mode:'READ ONLY; query client, no mutations',channels:snapshots,previousWeek:prior.map(p=>{const live=snapshots.flatMap(c=>c.posts).find(x=>x.id===p.buffer_post_id);return {platform:p.platform,id:p.buffer_post_id,scheduledAt:p.scheduled_at,status:live?.status??'NOT RETURNED',caption:live?.text??null};})};
await fs.writeFile(dir+'/buffer-status.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checkedAt:result.checkedAt,channels:snapshots.map(c=>({service:c.service,count:c.posts.length,disconnected:c.disconnected,locked:c.locked,paused:c.paused})),previousWeek:result.previousWeek.map(p=>({platform:p.platform,id:p.id,scheduledAt:p.scheduledAt,status:p.status}))},null,2));
}catch(e){const result={checkedAt:new Date().toISOString(),mode:'READ ONLY',error:e.message};await fs.writeFile(dir+'/buffer-status.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
