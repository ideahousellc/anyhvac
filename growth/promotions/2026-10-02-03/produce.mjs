import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const out = resolve('growth/.generated/promotions/2026-10-02-03');
await mkdir(out, { recursive: true });
const logo = await sharp('public/Horizontal Logo.png').resize(460).png().toBuffer();
const logoImage = `<image x="80" y="80" width="460" height="94" href="data:image/png;base64,${logo.toString('base64')}"/>`;
const text = (x,y,size,content,color='#1f2a37',weight=700) => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${content}</text>`;
const base = (height,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}"><rect width="1080" height="${height}" fill="#f3f5f8"/><rect width="16" height="${height}" fill="#0057b8"/><g font-family="Arial, sans-serif">${logoImage}${body}</g></svg>`;
const friday = base(1350, `
 <rect x="80" y="245" width="268" height="48" rx="24" fill="#0057b8"/>${text(104,278,23,'FREE RESOURCE','#fff')}
 ${text(80,388,74,'FREE HVAC')}${text(80,480,86,'DUCT DESIGN','#0057b8')}${text(80,565,66,'QUICK REFERENCE')}
 <path d="M80 615H1000" stroke="#c9d7e8" stroke-width="2"/>
 ${text(80,694,38,'2 pages.', '#1f2a37')}
 ${text(80,754,35,'Practical formulas and reference values.', '#647184',400)}
 ${text(80,815,38,'No signup.', '#0057b8')}
 <rect x="80" y="892" width="920" height="206" rx="22" fill="#fff"/>
 ${text(114,945,23,'INSIDE THE FREE PDF','#0057b8')}
 ${text(114,999,30,'Airflow &amp; velocity  /  Duct sizing','#1f2a37',400)}
 ${text(114,1050,30,'Pressure basics  /  IP &amp; SI conversions','#1f2a37',400)}
 ${text(80,1181,38,'Download the free reference','#0057b8')}
 ${text(80,1242,28,'anyhvac.net/resources/duct-design-quick-reference','#647184',400)}
 `);
const saturday = base(1920, `
 <rect x="80" y="325" width="326" height="48" rx="24" fill="#0057b8"/>${text(104,358,23,'DISCOVER ANYHVAC','#fff')}
 ${text(80,503,88,'FREE HVAC')}${text(80,614,76,'CALCULATORS','#0057b8')}${text(80,723,88,'&amp; TOOLS','#0057b8')}
 <path d="M80 798H885" stroke="#c9d7e8" stroke-width="2"/>
 ${text(80,890,41,'Design tools and', '#1f2a37',400)}
 ${text(80,951,41,'downloadable references', '#1f2a37',400)}
 ${text(80,1012,41,'at anyhvac.net', '#1f2a37',400)}
 <rect x="80" y="1110" width="805" height="232" rx="24" fill="#fff"/>
 ${text(112,1172,27,'EXPLORE THE FREE TOOLS','#0057b8')}
 ${text(112,1230,36,'Duct sizing  /  Air distribution','#1f2a37',400)}
 ${text(112,1289,36,'Psychrometrics  /  Mixed air','#1f2a37',400)}
 ${text(80,1480,68,'anyhvac.net','#0057b8')}
 `);
for (const [name,svg] of [['friday-duct-reference',friday],['saturday-discover-anyhvac',saturday]]) {
 await writeFile(resolve(out,`${name}.svg`),svg);
 await sharp(Buffer.from(svg)).png().toFile(resolve(out,`${name}.png`));
}

// Original 72 BPM instrumental: low-register bass, warm triads, soft melody.
// No recordings, samples, third-party composition, voice or generative service.
const rate=48000, seconds=15, frames=rate*seconds;
const pcm=Buffer.alloc(frames*4);
const roots=[110,87.307,130.813,97.999];
let peak=0, energy=0;
for(let i=0;i<frames;i++) {
 const t=i/rate, beat=t*72/60, phase=beat%1;
 const root=roots[Math.floor(beat/4)%4];
 const fade=Math.max(0,Math.min(1,t/1.1,(seconds-t)/1.8));
 for(let channel=0;channel<2;channel++) {
  const pad=[1,1.25,1.5].reduce((sum,r,j)=>sum+Math.sin(2*Math.PI*root*r*t+channel*j*0.08),0)*0.035;
  const bass=Math.sin(2*Math.PI*root/2*t)*Math.exp(-phase*3)*0.065;
  const note=root*[1,1.25,1.5,1.25][Math.floor(beat)%4];
  const melody=(Math.sin(2*Math.PI*note*t)+0.15*Math.sin(2*Math.PI*note*2*t))*Math.sin(Math.PI*Math.min(1,phase*8))*Math.exp(-phase*3)*0.055;
  const value=(pad+bass+melody)*fade;
  peak=Math.max(peak,Math.abs(value)); energy+=value*value;
  pcm.writeInt16LE(Math.round(value*32767),i*4+channel*2);
 }
}
const header=Buffer.alloc(44);
header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await writeFile(resolve(out,'saturday-original-instrumental.wav'),Buffer.concat([header,pcm]));
const bin=resolve('node_modules/@remotion/compositor-win32-x64-msvc');
const render=spawnSync(resolve(bin,'ffmpeg.exe'),['-y','-loop','1','-i',resolve(out,'saturday-discover-anyhvac.png'),'-i',resolve(out,'saturday-original-instrumental.wav'),'-t','15','-r','30','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',resolve(out,'saturday-discover-anyhvac.mp4')],{encoding:'utf8'});
if(render.status!==0) throw new Error(render.stderr);
const probe=spawnSync(resolve(bin,'ffprobe.exe'),['-v','error','-show_streams','-show_format','-of','json',resolve(out,'saturday-discover-anyhvac.mp4')],{encoding:'utf8'});
if(probe.status!==0) throw new Error(probe.stderr);
await writeFile(resolve(out,'verification.json'),JSON.stringify({audio:{peakDbfs:20*Math.log10(peak),rmsDbfs:20*Math.log10(Math.sqrt(energy/(frames*2))),clippedSamples:0,bpm:72},video:JSON.parse(probe.stdout)},null,2)+'\n');
console.log('Created two PNGs, native SVG sources, original WAV and 15-second MP4:',out);
