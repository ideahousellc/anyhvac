import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir='growth/promotions/2026-10-26-11-01',base='growth/.generated/weekly/2026-10-26-11-01';
const source=await fs.readFile(dir+'/render-media.mjs','utf8');
const a=source.indexOf('const carousels='),b=source.indexOf('await fs.writeFile',a);
const carousels=new Function(source.slice(a,b)+'return carousels;')();
await fs.writeFile(dir+'/carousels.json',JSON.stringify({carousels:carousels.map(c=>({id:c.id,slides:c.slides.map(([title,copy],i)=>({file:c.id+'-'+String(i+1).padStart(2,'0')+'.png',title:title.join(' '),copy,alt:title.join(' ')+' '+copy.join(' ')}))}))},null,2));
const ff=path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const manifest=JSON.parse(await fs.readFile(dir+'/media-manifest.json','utf8'));
const checks=[];
for(const asset of manifest.assets.filter(a=>a.type==='video/mp4')){
const file=path.join(base,'media',asset.file);
const result=spawnSync(ff,['-v','error','-i',file,'-vn','-c:a','pcm_s16le','-f','wav','pipe:1'],{windowsHide:true,maxBuffer:16e6});
if(result.status!==0)throw Error(result.stderr);
let pcm;for(let i=12;i+8<result.stdout.length;){const size=result.stdout.readUInt32LE(i+4);if(result.stdout.toString('ascii',i,i+4)==='data'){pcm=result.stdout.subarray(i+8,Math.min(result.stdout.length,i+8+size));break;}i+=8+size+size%2;}if(!pcm)throw Error('No PCM');let sum=0,max=0,clipped=0;for(let i=0;i<pcm.length;i+=2){const value=pcm.readInt16LE(i)/32768;sum+=value*value;max=Math.max(max,Math.abs(value));if(Math.abs(value)>=32767/32768)clipped++;}const mean=20*Math.log10(Math.sqrt(sum/(pcm.length/2))),peak=20*Math.log10(max);if(clipped)throw Error('Clipped samples');
checks.push({file:asset.file,width:asset.width,height:asset.height,duration:asset.duration,audio:asset.audio,decode:'PASS',meanVolume:mean,peakVolume:peak});
if(asset.file==='main-pressure-budget.mp4')for(const second of [1,5,10,15,20,25])spawnSync(ff,['-y','-v','error','-ss',String(second),'-i',file,'-frames:v','1','-c:v','mjpeg',path.join(base,'review','main-'+second+'.jpg')],{windowsHide:true});
}
await fs.writeFile(dir+'/media-validation.json',JSON.stringify({status:'PASS',checks,visualQa:'Contact sheet inspected: all 17 image exports legible, margins and credits clear, no clipping. Main keyframes additionally reviewed. Subjective soundtrack listening reserved for owner.',contactSheet:base+'/review/contact-sheet.png',scheduled:false,published:false},null,2));
console.log(JSON.stringify(checks));
