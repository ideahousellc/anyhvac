import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import sharp from 'sharp';

const source='growth/promotions/2026-10-05-11';
const output=resolve('growth/.generated/promotions/2026-10-05-11');
const packages=JSON.parse(await readFile(`${source}/packages.json`,'utf8'));
await mkdir(output,{recursive:true});
const logo=(await sharp('public/Horizontal Logo.png').resize(390).png().toBuffer()).toString('base64');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const txt=(x,y,size,value,fill='#1f2a37',weight=700)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(value)}</text>`;
const fit=(value,max=73)=>Math.min(max,Math.floor(790/(value.length*0.64)));
const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#66b0ff" stroke-width="5"/>`;
const node=(x,y,w,label,active=false)=>`<rect x="${x}" y="${y}" width="${w}" height="78" rx="20" fill="${active?'#0057b8':'#fff'}" stroke="#c9d7e8" stroke-width="2"/>${txt(x+22,y+49,27,label,active?'#fff':'#1f2a37')}`;
function diagram(kind,phase=0,animated=false) {
 const glow=1+0.08*Math.sin(phase*2*Math.PI);
 if(kind==='duct') return `<circle cx="290" cy="160" r="95" fill="#e6eef8" stroke="#0057b8" stroke-width="7"/><rect x="505" y="65" width="240" height="190" rx="8" fill="#e6eef8" stroke="#0057b8" stroke-width="7"/>${txt(234,300,27,'ROUND')}${txt(522,300,27,'RECTANGULAR')}`;
 if(kind==='properties') return line(270,120,520,120)+line(420,155,420,250)+node(80,82,310,'Temperature',animated&&phase<0.34)+node(530,82,255,'Moisture',animated&&phase>=0.34&&phase<0.67)+node(275,235,290,'Enthalpy',animated&&phase>=0.67)+`<circle cx="420" cy="${155+85*phase}" r="10" fill="#0057b8"/>`;
 if(kind==='mixing') return line(380,78,545,197)+line(380,300,545,197)+line(545,197,650,197)+node(25,35,340,'Outdoor air')+node(25,257,340,'Return air')+node(555,157,282,'Mixed state',animated)+`<circle cx="${390+155*phase}" cy="${83+114*phase}" r="10" fill="#0057b8"/><circle cx="${390+155*phase}" cy="${296-99*phase}" r="10" fill="#647184"/>`;
 if(kind==='checks') return node(40,40,340,'Airflow / velocity')+node(460,40,340,'Air changes')+line(210,118,210,235)+line(630,118,630,235)+node(40,235,340,'Actual duct area')+node(460,235,340,'Room volume');
 return `<rect x="75" y="35" width="680" height="265" rx="24" fill="#fff" stroke="#c9d7e8" stroke-width="2"/>${txt(108,100,30,'TESP', '#0057b8')}${txt(108,155,30,'AIRFLOW', '#647184')}${txt(108,224,27,'Related. Not interchangeable.')}<path d="M555 84H702M555 145H702" stroke="#0057b8" stroke-width="8"/><path d="M614 62L649 164" stroke="#1f2a37" stroke-width="8"/><circle cx="${150+500*phase}" cy="282" r="${8*glow}" fill="#0057b8"/>`;
}
function svg(p,portrait=false,frame=0) {
 const height=portrait?1920:1350;
 const t=frame/24;
 const phase=portrait?(t%2.5)/2.5:0.5;
 const labels=p.visual==='properties'?['Set project pressure','Enter a supported input pair','Explore the air-state properties','Open the free calculator']:p.visual==='mixing'?['Define both streams','Set common project pressure','Use a dry-air mass basis','Open the free calculator']:['Keep the equipment context','TESP alone is not airflow','Measured TESP is not design ASP','Read the existing free guide'];
 const stage=Math.min(3,Math.floor(t/3));
 const panelY=portrait?770:685;
 const diagramY=panelY+70;
 const bottom=portrait?1310:1180;
 const maxSize=portrait?68:70;
 const headline=p.headline.map((s,i)=>txt(80,portrait?360+i*100:315+i*90,fit(s,maxSize),s,i===0?'#1f2a37':'#0057b8')).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}"><rect width="1080" height="${height}" fill="#f3f5f8"/><rect width="16" height="${height}" fill="#0057b8"/><g font-family="Arial,sans-serif"><image x="80" y="70" width="390" height="80" href="data:image/png;base64,${logo}"/>${txt(80,215,23,'FREE ANYHVAC TOOL / RESOURCE','#0057b8')}${headline}${p.support.map((s,i)=>txt(80,portrait?665+i*53:590+i*49,fit(s,32),s,'#647184',400)).join('')}<rect x="55" y="${panelY}" width="865" height="425" rx="28" fill="#e9eef4"/><g transform="translate(65 ${diagramY})">${diagram(p.visual,phase,portrait)}</g>${txt(88,panelY+397,19,'CONCEPTUAL — NO OPERATING VALUES','#647184',400)}${portrait?txt(80,bottom,fit(labels[stage],34),labels[stage],'#0057b8'):txt(80,bottom,34,'Explore the free tool / reference','#0057b8')}${txt(80,bottom+75,portrait?53:35,'anyhvac.net','#0057b8')}${portrait?txt(80,bottom+133,22,'Verify inputs and project requirements.','#647184',400):''}</g></svg>`;
}

const audioSource='growth/.generated/promotions/2026-10-02-03/saturday-original-instrumental.wav';
const approvedAudio=await readFile(audioSource);
const rate=48000,seconds=12,pcm=Buffer.from(approvedAudio.subarray(44,44+rate*4*seconds));
for(let i=0;i<rate*seconds;i++) {const fade=Math.min(1,(seconds-i/rate)/1.4);for(let c=0;c<2;c++){const k=i*4+c*2;pcm.writeInt16LE(Math.round(pcm.readInt16LE(k)*fade),k);}}
const header=Buffer.from(approvedAudio.subarray(0,44));header.writeUInt32LE(pcm.length+36,4);header.writeUInt32LE(pcm.length,40);
await writeFile(resolve(output,'approved-instrumental-12s.wav'),Buffer.concat([header,pcm]));
const bin=resolve('node_modules/@remotion/compositor-win32-x64-msvc');
const assets=[],posts=[];
for(const p of packages) {
 const dir=resolve(output,p.id);await mkdir(dir,{recursive:true});
 const slides=[p,...(p.slides??[])];
 for(let i=0;i<slides.length;i++) {
  const design=svg(slides[i]);const name=`social-${String(i+1).padStart(2,'0')}`;
  await writeFile(resolve(dir,`${name}.svg`),design);
  await sharp(Buffer.from(design)).png().toFile(resolve(dir,`${name}.png`));
  assets.push({path:`${dir}/${name}.png`,package_id:p.id,platforms:['linkedin','instagram']});
 }
 const socialMedia=slides.map((_,i)=>`social-${String(i+1).padStart(2,'0')}.png`);
 for(const [platform,time] of [['linkedin','15:00:00'],['instagram','18:00:00']]) posts.push({package_id:p.id,platform,proposed_at:`${p.date}T${time}-04:00`,media:socialMedia,status:'OWNER REVIEW',approved_at:null,scheduled_at:null,published_at:null});
 if(p.short) {
  const mp4=resolve(dir,'youtube-short.mp4');
  let stderr='';
  const ff=spawn(resolve(bin,'ffmpeg.exe'),['-y','-f','image2pipe','-framerate','24','-c:v','png','-i','pipe:0','-i',resolve(output,'approved-instrumental-12s.wav'),'-t','12','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',mp4],{stdio:['pipe','ignore','pipe']});
  ff.stderr.on('data',value=>{stderr+=value;});
  const completion=once(ff,'close');
  for(let frame=0;frame<288;frame++) {
   const png=await sharp(Buffer.from(svg(p,true,frame))).png().toBuffer();
   if(frame===0||frame===144||frame===264) await writeFile(resolve(dir,`preview-${frame}.png`),png);
   if(!ff.stdin.write(png)) await once(ff.stdin,'drain');
  }
  ff.stdin.end();
  const [code]=await completion;
  if(code!==0)throw new Error(stderr);
  const probe=spawnSync(resolve(bin,'ffprobe.exe'),['-v','error','-show_streams','-show_format','-of','json',mp4],{encoding:'utf8'});
  if(probe.status!==0)throw new Error(probe.stderr);
  await writeFile(resolve(dir,'video-verification.json'),probe.stdout);
  assets.push({path:mp4,package_id:p.id,platforms:['youtube-short']});
  posts.push({package_id:p.id,platform:'youtube-short',proposed_at:`${p.short.date}T19:00:00-04:00`,media:['youtube-short.mp4'],status:'OWNER REVIEW',approved_at:null,scheduled_at:null,published_at:null});
 }
 const hashtags=p.hashtags.join(' ');
 await writeFile(`${source}/${p.id}.md`,`# ${p.title}\n\nStatus: OWNER REVIEW. Proposed topic/calendar assignment; not scheduled or published.\n\nDestination: ${p.destination}\n\nFormat: ${p.format}${p.short?' plus 12-second animated conceptual Short':''}. Media: growth/.generated/promotions/2026-10-05-11/${p.id}/\n\n## LinkedIn\n\n${p.linkedin}\n\n${hashtags}\n\n## Instagram\n\n${p.instagram}\n\n${hashtags}\n\nAlt text: ${p.alt}\n${p.short?`\n## YouTube Shorts\n\nTitle: ${p.short.title}\n\n${p.short.description}\n`:''}\n## Technical source and boundary\n\n${p.source.map(s=>'- '+s).join('\n')}\n\n${p.technicalLimit}\n\n## Production and measurement\n\nOriginal native graphics, existing logo/site palette and approved original instrumental. No external samples, paid assets, numerical engineering examples or fabricated product outputs. Compare qualified destination traffic and native platform engagement; no performance prediction or measured uplift is claimed.\n`);
 console.log('Prepared',p.id);
}
posts.sort((a,b)=>a.proposed_at.localeCompare(b.proposed_at));
if(posts.length!==13)throw new Error('Expected exactly 13 posts');
await writeFile(`${source}/calendar.json`,JSON.stringify({week_start:'2026-10-05',week_end:'2026-10-11',timezone:'America/New_York',status:'OWNER REVIEW',calendar_source:'George proposal; no owner-supplied 13-post calendar found',queue_verified:false,posts},null,2)+'\n');
for(const asset of assets) {asset.sha256=createHash('sha256').update(await readFile(asset.path)).digest('hex');asset.lifecycle_state='READY_FOR_REVIEW';asset.temporary=false;asset.publication_confirmed=false;asset.publishing_system_requires_local_file=true;}
await writeFile(`${source}/media-provenance.json`,JSON.stringify({date_prepared:'2026-10-01',publication_approved:false,graphics:{source:'Original deterministic SVG layouts in prepare.mjs; existing public/Horizontal Logo.png and site palette',license:'AnyHVAC original/internal asset',commercial_use:true,attribution_required:false,attribution_text:null},audio:{source:audioSource,source_sha256:createHash('sha256').update(approvedAudio).digest('hex'),license:'AnyHVAC original/internal composition from October 2–3 approved package',commercial_use:true,attribution_required:false,attribution_text:null,adaptation:'12-second excerpt with closing fade; new video adaptations await owner approval'},assets},null,2)+'\n');
console.log('Prepared five packages and exactly thirteen proposed posts; no provider calls.');
