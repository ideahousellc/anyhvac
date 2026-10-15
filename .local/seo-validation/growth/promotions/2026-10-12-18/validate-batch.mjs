import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import sharp from 'sharp';
const dir='growth/promotions/2026-10-12-18',media='growth/.generated/weekly/2026-10-12-18/media';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const {packages}=await read(`${dir}/packages.json`),{posts,checkedAt}=await read(`${dir}/calendar.json`),manifest=await read(`${dir}/media-manifest.json`),snapshot=await read('growth/.generated/weekly/2026-10-12-18/buffer-snapshot.json');
const checks=[];function check(name,ok){if(!ok)throw Error(name);checks.push(name);}
check('Five packages and 13 posts',packages.length===5&&posts.length===13);
check('Platform distribution 5/5/3',['linkedin','instagram','youtube'].every((x,i)=>posts.filter(p=>p.platform===x).length===[5,5,3][i]));
check('Two six-slide carousels',packages.filter(p=>p.slides?.length===6).length===2);
check('20 unique media exports',manifest.assets.length===20&&new Set(manifest.assets.map(a=>a.sha256)).size===20);
const keys=new Set();
for(const p of posts){
 const date=new Date(p.proposedSlot),channel=snapshot.channels.find(c=>c.channel.service===p.platform),weekday=['sun','mon','tue','wed','thu','fri','sat'][date.getUTCDay()];
 const key=p.platform+p.proposedSlot;check(`Unique slot ${key}`,!keys.has(key));keys.add(key);
 check(`Established schedule ${key}`,channel.channel.postingSchedule.some(s=>s.day===weekday&&!s.paused&&s.times.includes(p.proposedSlot.slice(11,16))));
 check(`No queued conflict ${key}`,!channel.posts.some(x=>x.status!=='sent'&&Date.parse(x.dueAt)===date.getTime()));
 check(`Distinct copy ${key}`,!snapshot.channels.some(c=>c.posts.some(x=>x.text.trim()===p.caption.trim())));
 check(`Caption length ${key}`,p.caption.length<=({instagram:2200,linkedin:3000,youtube:5000}[p.platform]));
 if(p.platform==='youtube')check(`YouTube title length ${key}`,p.title.length<=100);
 check(`Existing destination ${key}`,p.destination.startsWith('https://www.anyhvac.net/')&&!p.destination.includes('duct-design-quick-reference'));
 await fs.access('app/'+new URL(p.destination).pathname.slice(1)+'/page.tsx');
 for(const f of p.media)await fs.access(`${media}/${f}`);
}
const videos=[];
for(const a of manifest.assets){const bytes=await fs.readFile(`${media}/${a.file}`);check(`Hash ${a.file}`,createHash('sha256').update(bytes).digest('hex')===a.sha256);
 if(a.file.endsWith('.png')){const m=await sharp(bytes).metadata();check(`PNG dimensions ${a.file}`,m.width===1080&&[1350,1920].includes(m.height));}
 else{const r=spawnSync(resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe'),['-v','error','-show_streams','-show_format','-of','json',`${media}/${a.file}`],{encoding:'utf8',windowsHide:true});check(`Probe ${a.file}`,r.status===0);const m=JSON.parse(r.stdout),v=m.streams.find(s=>s.codec_type==='video'),audio=m.streams.find(s=>s.codec_type==='audio'),duration=Number(m.format.duration);check(`Video format ${a.file}`,v.width===1080&&v.height===1920&&v.codec_name==='h264'&&audio.codec_name==='aac'&&Math.abs(duration-(a.file.startsWith('main')?28:16))<0.1);videos.push({file:a.file,duration});}
}
const verification=await read(`${dir}/media-production/media-verification.json`);
check('Three unclipped rounded recorded-music mixes',verification.audio.length===3&&verification.audio.every(a=>a.clipped_pcm_samples===0&&a.true_peak_dbtp<-6&&Math.abs(a.integrated_lufs+18)<.2&&a.equalization.includes('6.5 kHz')));
check('No publication or hosting',manifest.uploaded===false&&posts.every(p=>p.hostedUrls===null&&p.status.startsWith('PROPOSED')));
const result={checkedAt:new Date().toISOString(),status:'PASS',checksPassed:checks.length,checks,queueSnapshot:checkedAt,videos,subjectiveListening:'Owner review pending',applicationFilesChanged:false};
await fs.writeFile(`${dir}/batch-validation.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,checks:checks.length,videos}));
