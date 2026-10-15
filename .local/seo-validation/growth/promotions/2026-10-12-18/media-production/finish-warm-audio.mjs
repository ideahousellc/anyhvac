import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir='growth/promotions/2026-10-12-18/media-production';
const generated='growth/.generated/weekly/2026-10-12-18';
const ff=resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
function run(args,binary=false){const r=spawnSync(ff,args,{encoding:binary?null:'utf8',maxBuffer:64*1024*1024,windowsHide:true});if(r.status!==0)throw Error(String(r.stderr));return r;}
function measure(path){const r=run(['-hide_banner','-i',path,'-vn','-af','loudnorm=I=-18:TP=-2:LRA=7:print_format=json','-f','null','-']);return JSON.parse(r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1));}
function pcmData(wav){for(let i=12;i+8<wav.length;){const n=wav.readUInt32LE(i+4);if(wav.toString('ascii',i,i+4)==='data')return wav.subarray(i+8,i+8+n);i+=8+n+(n%2);}throw Error('Missing WAV data');}
const verification=JSON.parse(await fs.readFile(`${dir}/media-verification.json`,'utf8'));
for(const a of verification.audio){
 const decodedPath=`${generated}/media-review/${a.package_id}-decode-warm.wav`;
 run(['-y','-v','error','-i',a.path,'-c:a','pcm_s16le','-ac','2','-ar','48000',decodedPath]);
 const wave=await fs.readFile(decodedPath),decoded=pcmData(wave);
 // Two-pole Butterworth roll-off retains the recorded arrangement and rounds upper frequencies.
 const w=2*Math.PI*6500/48000, alpha=Math.sin(w)/Math.SQRT2, c=Math.cos(w), a0=1+alpha;
 const b0=(1-c)/2/a0,b1=(1-c)/a0,b2=b0,a1=-2*c/a0,a2=(1-alpha)/a0;
 const states=Array.from({length:2},()=>({x1:0,x2:0,y1:0,y2:0}));
 for(let i=0;i<decoded.length/2;i++){const state=states[i%2],x=decoded.readInt16LE(i*2)/32768,y=b0*x+b1*state.x1+b2*state.x2-a1*state.y1-a2*state.y2;state.x2=state.x1;state.x1=x;state.y2=state.y1;state.y1=y;decoded.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(y*32768))),i*2);}
 const wav=`${generated}/media-review/${a.package_id}-warm.wav`;
 await fs.writeFile(wav,wave);
 const m=measure(wav),norm=`loudnorm=I=-18:TP=-2:LRA=7:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
 const final=`${generated}/media-review/${a.package_id}-warm-final.wav`;
 run(['-y','-v','error','-i',wav,'-af',norm,'-ar','48000','-ac','2',final]);
 const target=`${generated}/media/${a.package_id}${a.static_image?'-short':''}.mp4`, temp=`${generated}/media-review/${a.package_id}-warm-final.mp4`;
 run(['-y','-v','error','-i',target,'-i',final,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',temp]);
 await fs.copyFile(temp,target);
 const m2=measure(target);
 run(['-y','-v','error','-i',target,'-vn','-c:a','pcm_s16le','-ac','2','-ar','48000',decodedPath]);
 const pcm=pcmData(await fs.readFile(decodedPath));
 let peak=0,clipped=0;for(let i=0;i<pcm.length;i+=2){const x=Math.abs(pcm.readInt16LE(i))/32768;peak=Math.max(peak,x);if(x>=32767/32768)clipped++;}
 if(clipped||Number(m2.input_tp)>-2)throw Error('Audio peak failed');
 Object.assign(a,{path:resolve(final),equalization:'Two-pole Butterworth low-pass at 6.5 kHz before two-pass -18 LUFS normalization. Existing recording, original fade envelopes; no note synthesis.',integrated_lufs:Number(m2.input_i),true_peak_dbtp:Number(m2.input_tp),decoded_sample_peak_dbfs:20*Math.log10(peak),clipped_pcm_samples:clipped});
 const artifact=verification.artifacts.find(x=>x.path===resolve(target));const bytes=await fs.readFile(target);Object.assign(artifact,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 console.log(JSON.stringify({package:a.package_id,lufs:a.integrated_lufs,peak:a.true_peak_dbtp,clipped}));
}
await fs.writeFile(`${dir}/media-verification.json`,JSON.stringify(verification,null,2));
