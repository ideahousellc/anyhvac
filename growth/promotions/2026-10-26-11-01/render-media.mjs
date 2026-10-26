// Deterministic original diagrams + existing licensed real photography. Local only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {copyFileSync} from 'node:fs';
const dir='growth/promotions/2026-10-26-11-01', base='growth/.generated/weekly/2026-10-26-11-01';
const media=path.join(base,'media'),review=path.join(base,'review');
await fs.mkdir(media,{recursive:true});await fs.mkdir(review,{recursive:true});await fs.mkdir(path.join(dir,'evidence'),{recursive:true});
const fontDirectory=path.resolve(base,'fontconfig');await fs.mkdir(path.join(fontDirectory,'cache'),{recursive:true});
await fs.writeFile(path.join(fontDirectory,'fonts.conf'),`<?xml version="1.0"?><fontconfig><dir>${(process.env.SystemRoot||'C:/Windows').replaceAll('\\','/')}/Fonts</dir><cachedir>${path.join(fontDirectory,'cache').replaceAll('\\','/')}</cachedir></fontconfig>`);process.env.FONTCONFIG_FILE=path.join(fontDirectory,'fonts.conf');
const {default:sharp}=await import('sharp');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bin=path.resolve('node_modules/@remotion/compositor-win32-x64-msvc'),ff=path.join(bin,'ffmpeg.exe'),probe=path.join(bin,'ffprobe.exe');
const old='growth/promotions/2026-10-12-18';
const pressure=JSON.parse(await fs.readFile(old+'/provenance/pressure-photo.json','utf8'));
const photoRecords=[{id:'duct-context',path:pressure.local_source,sha256:pressure.source_sha256,author:pressure.author,license:pressure.license,source:pressure.source_url,licenseUrl:pressure.license_url,evidence:pressure.license_evidence},
{id:'air-handler',path:'growth/.generated/weekly/2026-10-12-18/sources/air-handler-cc0.jpg',author:'Alf van Beem',license:'CC0',source:'https://commons.wikimedia.org/wiki/File:HVAC_Air_Handler_Unit,_pic1.JPG',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',evidence:[old+'/evidence/air-handler-commons.json',old+'/evidence/air-handler-page.html',old+'/evidence/cc0-deed.html']}];
const photos={};
for(const p of photoRecords){const bytes=await fs.readFile(p.path);if(p.sha256&&hash(bytes)!==p.sha256)throw Error('Photo source changed');p.sha256=hash(bytes);p.alterations='Equipment-only crop, darkened with translucent overlay, original text/diagrams added. No recognizable people, customer or endorsement claim.';let image=sharp(bytes);if(p.id==='duct-context')image=image.extract({left:0,top:0,width:1800,height:2000});photos[p.id]=(await image.resize(1080,1350,{fit:'cover'}).jpeg({quality:85}).toBuffer()).toString('base64');for(const file of p.evidence){const target=path.join(dir,'evidence',path.basename(file));await fs.copyFile(file,target);}}
const music=JSON.parse(await fs.readFile('growth/promotions/2026-10-05-platform-tests/audio-revision-v2/music-provenance.json','utf8'));
if(hash(await fs.readFile(music.local_source))!==music.source_sha256)throw Error('Music identity changed');
for(const file of music.license_evidence)await fs.copyFile('growth/promotions/2026-10-05-platform-tests/audio-revision-v2/'+file,path.join(dir,'evidence',file));
const logo=(await sharp('public/Horizontal Logo.png').resize({width:310}).png().toBuffer()).toString('base64');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,size,value,color='#f5f8fc',weight=700)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(value)}</text>`;
function wrap(value,n=33){const lines=[];let line='';for(const word of value.split(/\s+/)){if((line+' '+word).trim().length>n&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;}
const lines=(items,x,y,size=43,step=58,color='#f5f8fc',weight=500)=>items.map((line,i)=>text(x,y+i*step,size,line,color,weight)).join('');
const rect=(x,y,w,h,color='#102d45',stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${color}" stroke="${stroke}" stroke-width="6"/>`;
function frame(height,body,photo){return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}"><defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#061726" stop-opacity="0.82"/><stop offset="0.48" stop-color="#061726" stop-opacity="0.23"/><stop offset="1" stop-color="#061726" stop-opacity="0.96"/></linearGradient></defs><rect width="1080" height="${height}" fill="#081d30"/>${photo?`<image href="data:image/jpeg;base64,${photos[photo]}" y="210" width="1080" height="${height-210}" preserveAspectRatio="xMidYMid slice"/><rect width="1080" height="${height}" fill="url(#shade)"/>`:''}<g font-family="Arial,Helvetica,sans-serif"><rect x="55" y="48" width="350" height="92" rx="12" fill="white"/><image href="data:image/png;base64,${logo}" x="75" y="65" width="310" height="58"/>${body}</g></svg>`;}
const footer=(height,credit)=>text(60,height-87,25,'FREE HVAC TOOLS  •  ANYHVAC.NET','#55d7df')+text(60,height-43,21,credit,'#cbd5e1',400);
const assets=[];
async function png(file,svg){const target=path.join(media,file);await sharp(Buffer.from(svg)).png().toFile(target);const bytes=await fs.readFile(target),meta=await sharp(bytes).metadata();assets.push({file,bytes:bytes.length,sha256:hash(bytes),width:meta.width,height:meta.height,type:'image/png'});await sharp(bytes).resize({width:360}).png().toFile(path.join(review,file));}
const promo=[{id:'promo-measurement',photo:'duct-context',tag:'AIRFLOW + STATIC PRESSURE REFERENCE',headline:['MEASUREMENT','BEFORE','INTERPRETATION.'],copy:['Choose the correct measurement method.','Record the operating conditions.'],cta:'ANYHVAC.NET / RESOURCES',credit:'Photo: MTA Capital Construction / CC BY 2.0 / cropped'},
{id:'promo-psychrometric',photo:'air-handler',tag:'FREE PSYCHROMETRIC CALCULATOR',headline:['ONE STATE.','SEVERAL USEFUL','PROPERTIES.'],copy:['Start with independent state inputs.','Check pressure and input validity.'],cta:'ANYHVAC.NET / TOOLS / PSYCHROMETRIC CALCULATOR',credit:'Photo: Alf van Beem / Wikimedia Commons / CC0 / cropped'}];
for(const p of promo)for(const [suffix,h]of [['social',1350],['vertical',1920]]){const y=h-460;await png(p.id+'-'+suffix+'.png',frame(h,text(60,212,28,p.tag,'#55d7df')+lines(p.headline,60,310,66,83,'#fff',800)+rect(40,y-65,1000,315,'#081d30')+lines(p.copy,60,y,37,58)+text(60,y+153,24,p.cta,'#55d7df')+text(60,y+207,25,'Independent verification before design use.','#cbd5e1',400)+footer(h,p.credit),p.photo));}
const carousels=[{id:'carousel-tesp',photo:'duct-context',slides:[
[['TESP IS','NOT AIRFLOW.'],['A pressure measurement needs context.','Start with the exact equipment procedure.']],
[['DEFINE THE','BOUNDARY.'],['Use manufacturer-approved test locations.','Identify which components are inside or outside','the specified external-static boundary.']],
[['KEEP THE','SIGNS STRAIGHT.'],['Illustrative return static: -0.20 in. w.g.','Illustrative supply static: +0.35 in. w.g.','TESP = 0.35 - (-0.20) = 0.55 in. w.g.']],
[['A PRESSURE','IS NOT A FLOW.'],['Compare with manufacturer data for the exact','equipment and operating configuration.','TESP alone does not establish airflow.']],
[['MEASURED TESP','IS NOT DESIGN ASP.'],['Do not substitute a field pressure reading','for the available duct pressure in a design.','Use the appropriate calculation and boundary.']],
[['MEASURE. RECORD.','THEN INTERPRET.'],['Record conditions and test locations.','Use the free airflow / static-pressure reference.','AnyHVAC.net / Resources']]]},
{id:'carousel-pressure-terms',photo:'air-handler',slides:[
[['PRESSURE TERMS','NEED A CONTEXT.'],['Static, velocity and total pressure','describe different things.']],
[['STATIC','PRESSURE.'],['Static pressure acts in all directions.','Use an appropriate static-pressure method.','Probe placement and flow conditions matter.']],
[['VELOCITY','PRESSURE.'],['Velocity pressure relates to air motion.','Density and velocity determine its value.','It is not a substitute for a static reading.']],
[['TOTAL','PRESSURE.'],['At the same point and reference basis:','total pressure = static + velocity pressure.','Use compatible measurements and units.']],
[['DROP VS','EQUIPMENT TESP.'],['Pressure drop compares specified points.','TESP uses a defined equipment external boundary.','These terms are not interchangeable.']],
[['NAME THE','MEASUREMENT.'],['Define the points, basis and procedure.','Follow the manufacturer reference.','AnyHVAC.net / Resources']]]}];
await fs.writeFile(path.join(dir,'carousels.json'),JSON.stringify({carousels:carousels.map(c=>({id:c.id,slides:c.slides.map(([title,copy],i)=>({file:c.id+'-'+String(i+1).padStart(2,'0')+'.png',title:title.join(' '),copy,alt:title.join(' ')+' '+copy.join(' ')}))}))},null,2));
for(const c of carousels)for(let i=0;i<6;i++){
const [title,copy]=c.slides[i];let visual=rect(60,480,960,190)+text(95,555,32,c.id==='carousel-tesp'?'BOUNDARY + PROCEDURE + OPERATING STATE':'POINT + REFERENCE + PRESSURE TYPE','#55d7df');
if(c.id==='carousel-tesp'&&i===2)visual=rect(60,480,960,210)+text(95,565,43,'0.35 - (-0.20) = 0.55 in. w.g.','#55d7df')+text(95,635,29,'Illustrative only. Not a recommended target.','#fdba74');
await png(c.id+'-'+String(i+1).padStart(2,'0')+'.png',frame(1350,text(910,117,27,`${i+1} / 6`,'#55d7df')+lines(title,60,255,63,81)+visual+lines(copy.flatMap(x=>wrap(x,44)),60,800,35,53)+footer(1350,c.photo==='duct-context'?'Photo: MTA Capital Construction / CC BY 2.0 / cropped':'Photo: Alf van Beem / Wikimedia Commons / CC0 / cropped'),[0,5].includes(i)?c.photo:undefined));}
function command(binary,args){const r=spawnSync(binary,args,{windowsHide:true,encoding:'utf8',maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr);return r;}
function audio(id,_start,duration){const output=path.join(review,id+'-audio.wav');const source=duration===28?'growth/.generated/weekly/2026-10-19-25-music-v2/internal/new-bass-excerpt.wav':path.join('growth/.generated/weekly/2026-10-12-18/media-review',id==='promo-measurement'?'promo-pressure-reference-warm-final.wav':'promo-project-pressure-warm-final.wav');copyFileSync(source,output);music.edit='Reused existing verified 16/28-second synchronized instrumental excerpts: 6.5 kHz roll-off, fade envelopes, two-pass -18 LUFS normalization. No new music synthesis.';return output;}
async function registerVideo(file){const target=path.join(media,file),bytes=await fs.readFile(target),data=JSON.parse(command(probe,['-v','error','-show_streams','-show_format','-of','json',target]).stdout);const video=data.streams.find(s=>s.codec_type==='video');assets.push({file,bytes:bytes.length,sha256:hash(bytes),width:video.width,height:video.height,duration:Number(data.format.duration),type:'video/mp4',audio:data.streams.some(s=>s.codec_type==='audio')});}
for(let i=0;i<promo.length;i++){const p=promo[i],sound=audio(p.id,16+i*24,16);command(ff,['-y','-v','error','-loop','1','-i',path.join(media,p.id+'-vertical.png'),'-i',sound,'-t','16','-r','30','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',path.join(media,p.id+'-short.mp4')]);await registerVideo(p.id+'-short.mp4');console.log('Rendered '+p.id);}
function videoFrame(t){const phase=t<3?0:t<7?1:t<12?2:t<18?3:t<23?4:5;let body=text(60,220,31,'DESIGN PRESSURE BUDGET','#55d7df');
if(phase===0)body+=lines(['BUDGET THE','PRESSURE.','THEN SIZE.'],60,335,74,94)+text(60,840,40,'An illustrative design example.');
else if(phase===5)body+=lines(['VERIFY THE','PROJECT.'],60,340,76,98)+lines(['Use actual design requirements.','Account for each loss once.','Free Air Distribution Tools','Friction Rate'],60,800,43,68)+lines(['Not measured TESP. Not recommended targets.','Verify equipment, components and critical path.'],60,1240,33,55);
else{const labels=phase===1?['DESIGN EXTERNAL STATIC','0.80 in. w.g.']:phase===2?['EXTERNAL COMPONENT LOSSES','0.30 in. w.g.']:phase===3?['AVAILABLE DUCT PRESSURE','0.80 - 0.30 = 0.50 in. w.g.']:['FRICTION RATE','0.50 x 100 / 250 = 0.20'];body+=text(60,340,40,labels[0],'#55d7df')+text(60,440,phase===3?53:61,labels[1]);
const available=phase>=3;body+=rect(85,650,900,130,'#12354d')+rect(85,650,available?562.5:900,130,'#278b9e')+text(105,735,37,available?'0.50 available for ducts':'0.80 design ESP');
if(phase>=2)body+=rect(available?647.5:85,820,337.5,100,'#98572e')+text(105,990,35,'0.30 external components accounted once');
body+=lines(phase===4?['Total effective length (TEL) = 250 ft','FR = ASP x 100 / TEL','0.20 in. w.g. per 100 ft']:['Illustrative design allowances.','Not measured TESP or recommended targets.'],60,1130,39,66)+text(60,1510,31,'Use the correct equipment external boundary.','#cbd5e1');}
return frame(1920,body+footer(1920,'AnyHVAC original design diagram'),undefined);}
await png('main-pressure-budget-poster.png',videoFrame(0));
const soundtrack=audio('main-pressure-budget',64,28);
const child=spawn(ff,['-y','-v','error','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-i',soundtrack,'-t','28','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',path.join(media,'main-pressure-budget.mp4')],{windowsHide:true,stdio:['pipe','ignore','pipe']});let error='';child.stderr.on('data',b=>error+=b);const closed=once(child,'close');
for(let i=0;i<672;i++){const jpeg=await sharp(Buffer.from(videoFrame(i/24))).jpeg({quality:88}).toBuffer();if(!child.stdin.write(jpeg))await once(child.stdin,'drain');if(i%120===0)console.log('Main video frame '+i+'/672');}
child.stdin.end();const [code]=await closed;if(code!==0)throw Error(error);await registerVideo('main-pressure-budget.mp4');
await fs.writeFile(path.join(dir,'media-manifest.json'),JSON.stringify({version:'anyhvac-week-2026-10-26-v1',status:'OWNER REVIEW / LOCAL ONLY',mediaRoot:media,uploaded:false,assets},null,2));
music.license_evidence=music.license_evidence.map(file=>path.join(dir,'evidence',path.basename(file)).replaceAll('\\','/'));
const newBass=JSON.parse(await fs.readFile('growth/promotions/2026-10-19-25-music-v2/licensing.json','utf8')).musicByPackage['main-airflow-area'];
if(hash(await fs.readFile(newBass.localFile))!==newBass.sha256)throw Error('New Bass identity changed');
for(const file of newBass.evidence)await fs.copyFile(file,path.join(dir,'evidence','new-bass-'+path.basename(file)));
await fs.writeFile(path.join(dir,'licensing.json'),JSON.stringify({photographs:photoRecords,musicByPackage:{'main-pressure-budget':{...newBass,sectionSeconds:[24,52],excerptSource:'growth/.generated/weekly/2026-10-19-25-music-v2/internal/new-bass-excerpt.wav',edit:'Approved existing 28s excerpt; 0.35s entry/2s exit fades; target -22 dBFS RMS.'},'promo-measurement':music,'promo-psychrometric':music},originalDiagrams:'AnyHVAC original deterministic vector artwork; no AI imagery; no third-party icons.',ownerAssets:['public/Horizontal Logo.png'],noPurchases:true,publicationApproved:false},null,2));
console.log(JSON.stringify({assets:assets.length,mediaRoot:media,uploaded:false,scheduled:false}));

const thumbs=[];let pos=0;for(const a of assets.filter(a=>a.type==='image/png')){const thumb=await sharp(path.join(media,a.file)).resize(216,270,{fit:'contain',background:'#ffffff'}).png().toBuffer();thumbs.push({input:thumb,left:(pos%5)*216,top:Math.floor(pos/5)*270});pos++;}await sharp({create:{width:1080,height:Math.ceil(pos/5)*270,channels:3,background:'#ffffff'}}).composite(thumbs).png().toFile(path.join(review,'contact-sheet.png'));
