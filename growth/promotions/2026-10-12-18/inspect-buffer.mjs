import {writeFile} from 'node:fs/promises';
import {bufferClient,loadKey} from '../../distribution/buffer/client.mjs';
const client=bufferClient(loadKey());
const channels=(await client.channels()).filter(c=>['linkedin','instagram','youtube'].includes(c.service));
if(channels.length!==3)throw Error('Expected three established channels');
const snapshots=[];
for(const channel of channels){const posts=await client.posts(channel);snapshots.push({channel,posts});}
const snapshot={checkedAt:new Date().toISOString(),mode:'READ ONLY; no mutations',channels:snapshots};
await writeFile('growth/.generated/weekly/2026-10-12-18/buffer-snapshot.json',JSON.stringify(snapshot,null,2));
console.log(JSON.stringify({checkedAt:snapshot.checkedAt,channels:snapshots.map(({channel,posts})=>({service:channel.service,id:channel.id,timezone:channel.timezone,disconnected:channel.isDisconnected,locked:channel.isLocked,paused:channel.isQueuePaused,postingSchedule:channel.postingSchedule,posts:posts.map(p=>({id:p.id,dueAt:p.dueAt,status:p.status,text:p.text,assets:p.assets}))}))},null,2));
