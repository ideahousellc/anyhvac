import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import WebSocket from 'ws';
const output='growth/.generated/weekly/2026-10-12-18/review',port=9254;
await fs.mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-sandbox','--disable-gpu-sandbox','--disable-software-rasterizer','--no-first-run','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',`--remote-debugging-port=${port}`,`--user-data-dir=${resolve(output,`browser-profile-${Date.now()}`)}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,id=0;const pending=new Map();const delay=ms=>new Promise(r=>setTimeout(r,ms));
const command=(method,params={})=>new Promise((r,j)=>{const requestId=++id;const timeout=setTimeout(()=>j(Error(`Timeout: ${method}`)),15000);pending.set(requestId,{r:x=>{clearTimeout(timeout);r(x);},j:x=>{clearTimeout(timeout);j(x);}});socket.send(JSON.stringify({id:requestId,method,params}));});
try{
 let targets;for(let i=0;i<80;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(targets.length)break;}catch{}await delay(100);}
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});
 socket.on('message',b=>{const m=JSON.parse(b);const p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.j(Error(m.error.message));else p.r(m.result);}});
 await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:pathToFileURL(resolve('growth/promotions/2026-10-12-18/review.html')).href});await delay(1000);
 const result=await command('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{const images=[...document.images];for(const i of images){i.loading='eager';await i.decode();}const videos=[...document.querySelectorAll('video')];for(const v of videos){v.preload='auto';v.load();await new Promise((r,j)=>{if(v.readyState>=1)r();else{v.onloadedmetadata=r;v.onerror=j;}});v.currentTime=5;await new Promise(r=>v.onseeked=r);}return {images:images.length,allImagesDecoded:images.every(i=>i.naturalWidth>0),videos:videos.map(v=>({file:v.getAttribute('src'),duration:v.duration,width:v.videoWidth,height:v.videoHeight,seekVerified:v.currentTime===5})),posts:document.querySelectorAll('tbody tr').length,packages:document.querySelectorAll('section[id]').length,externalScripts:document.querySelectorAll('script[src]').length};})()`});
 if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
 const verification={checkedAt:new Date().toISOString(),localOnly:true,...result.result.value};
 if(!verification.allImagesDecoded||verification.posts!==13||verification.packages!==5||verification.videos.length!==3||verification.externalScripts)throw Error('Review page verification failed');
 await command('Runtime.evaluate',{expression:'window.scrollTo(0,0)'});
 const screenshot=await command('Page.captureScreenshot',{format:'png'});await fs.writeFile(`${output}/review-browser.png`,Buffer.from(screenshot.data,'base64'));
 await fs.writeFile('growth/promotions/2026-10-12-18/browser-verification.json',JSON.stringify(verification,null,2));console.log(JSON.stringify(verification));
}finally{socket?.close();browser.kill();}
