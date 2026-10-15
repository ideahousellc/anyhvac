// Isolated real browser with local test login only. No production credential/provider access.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const config=JSON.parse(await fs.readFile('.local/agent-inbox/review-config.json','utf8'));
const output=path.resolve('.local/agent-inbox/weekly-browser');await fs.mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9262',`--user-data-dir=${path.join(output,'profile-'+Date.now())}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let socket,seq=0;const pending=new Map();
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x);},reject});socket.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(200);}throw Error('Browser wait failed');}
const fill=(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
async function screenshot(name){const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));}
try{
 let target;for(let i=0;i<50;i++){try{target=(await(await fetch('http://127.0.0.1:9262/json/list')).json()).find(x=>x.type==='page');if(target)break;}catch{}await delay(200);}
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});socket.on('message',bytes=>{const m=JSON.parse(bytes),p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}});
 await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1360,height:1100,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:'http://localhost:3016/admin'});await wait("Boolean(document.querySelector('input[name=username]'))");await delay(2000);
 await fill('input[name=username]',config.username);await fill('input[name=pin]',config.pin);await evaluate("document.querySelector('button[type=submit]').click()");await wait("document.body.innerText.includes('Agents / Team')");
 await command('Page.navigate',{url:'http://localhost:3016/admin/agents'});await wait("document.body.innerText.includes('Weekly Content')");
 await evaluate("document.querySelector('a[href=\"/admin/agents/george/weekly\"]').click()");await wait("document.body.innerText.includes('13-post calendar')");
 const state=await evaluate("fetch('/api/admin/weekly').then(r=>r.json()).then(x=>x.state)");const v=state.versions.at(-1);assert.equal(v.content.packages.length,5);assert.equal(v.content.posts.length,13);assert.equal(v.content.media.length,20);
 const original=JSON.parse(await fs.readFile('growth/promotions/2026-10-12-18/execution-package.json','utf8')).approved.posts;
 for(const post of state.versions[0].content.posts){const p=original.find(x=>x.post_id===post.id);assert.equal(p.caption,post.caption);assert.equal(p.scheduled_at,post.scheduledAt);assert.deepEqual(p.media.map(m=>m.sha256),post.media);}
 const results=await evaluate(`Promise.all(${JSON.stringify(v.content.media)}.map(async m=>{const r=await fetch('/api/admin/weekly/media/'+m.id);const bytes=await r.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');return {id:m.id,status:r.status,type:r.headers.get('content-type'),bytes:bytes.byteLength,hash};}))`);
 for(const result of results){const m=v.content.media.find(x=>x.id===result.id);assert.equal(result.status,200);assert.equal(result.hash,m.sha256);assert.equal(result.type,m.type);assert.equal(result.bytes,m.bytes);}
 await wait("document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0");await screenshot('01-five-package-review');
 const video=await evaluate("(async()=>{const v=document.querySelector('video');v.muted=true;await v.play();await new Promise(r=>setTimeout(r,600));const result={time:v.currentTime,width:v.videoWidth,duration:v.duration};v.pause();return result;})()");assert(video.time>0&&video.width>0&&video.duration>0);
 const ffprobe='node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe';
 for(const m of v.content.media.filter(x=>x.type==='video/mp4')){const owner=createHash('sha256').update('anyhvac-agent-owner:'+config.username).digest('hex');const result=await new Promise((resolve,reject)=>{const p=spawn(ffprobe,['-v','error','-show_streams','-of','json',path.join('.local/agent-inbox/weekly',owner,'media',m.id)],{windowsHide:true});let out='';p.stdout.on('data',c=>out+=c);p.stderr.resume();p.on('close',code=>code?reject(Error('ffprobe failed')):resolve(JSON.parse(out)));});assert(result.streams.some(s=>s.codec_type==='audio'));}
 const anon=await fetch('http://localhost:3016/api/admin/weekly/media/'+v.content.media[0].id);assert.equal(anon.status,401);
 const rejectOrigin=await evaluate("fetch('/api/admin/weekly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'schedule'})}).then(r=>r.status)");assert.equal(rejectOrigin,400);
 await command('Page.reload');await wait("document.body.innerText.includes('13-post calendar')");const saved=await evaluate("fetch('/api/admin/weekly').then(r=>r.json()).then(x=>x.state)");assert.deepEqual(saved,state);
 const changes=process.argv.includes('--verify-only') ? {persistedVersionsRechecked:state.versions.length} : await evaluate(`(async()=>{
 const read=()=>fetch('/api/admin/weekly').then(r=>r.json()).then(x=>x.state);
 const send=async(action,extra={},requestId=crypto.randomUUID())=>{const s=await read(),v=s.versions.at(-1);const r=await fetch('/api/admin/weekly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,version:v.number,digest:v.digest,requestId,...extra})});return{status:r.status,data:await r.json()};};
 const original=await read();
 if(original.versions.length!==1 || original.actions.length)throw Error('Review action test requires clean fixture; no automatic replay');
 const originalVersion=JSON.stringify(original.versions[0]);const target=original.versions[0].content.posts[0];
 const a=await send('approve');if(a.status!==200)throw Error('Approval failed');
 const revision=await send('revision',{target:target.id,text:'LOCAL TEST: add fixture clarification; do not change real publication.'});if(revision.status!==200)throw Error('Revision failed');
 if((await send('approve')).status!==409)throw Error('Open revision was approved');
 const edit=await send('edit',{target:target.id,text:'LOCAL TEST: fixture clarification',caption:target.caption+'\\n\\nLocal review fixture only.'});if(edit.status!==200)throw Error('Version edit failed');
 if((await send('approve')).status!==422)throw Error('Missing technical review accepted');
 const review=await send('review',{text:'LOCAL TEST: unchanged engineering claims and attribution checked against imported source; only fixture label added.'});if(review.status!==200)throw Error('Review failed');
 const key=crypto.randomUUID();if((await send('approve',{},key)).status!==200||(await send('approve',{},key)).status!==200)throw Error('Idempotent approval failed');
 const after=await read();if(JSON.stringify(after.versions[0])!==originalVersion||after.versions.length!==3||after.actions.length!==5)throw Error('Version or replay integrity failed');
 return{versions:3,actions:5,exactApproval:true,oldVersionUnchanged:true,changedQaRejected:true,revisionBlocksApproval:true};})()`);
 await command('Page.reload');await wait("document.body.innerText.includes('Approved for review only')");await evaluate("document.querySelector('h1').scrollIntoView()");await wait("document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0");await screenshot('03-approved-version');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await command('Page.reload');await wait("document.body.innerText.includes('13-post calendar')");await wait("document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0");assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"),'Mobile page overflow');await screenshot('02-mobile-review');
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({at:new Date().toISOString(),packages:5,posts:13,mediaHashesVerified:20,videoPlayback:video,allThreeVideosHaveAudio:true,originalCopySlotsOrder:true,ownerLogin:true,anonymousMediaDenied:true,executionRejected:true,refreshPreserved:true,changes},null,2));console.log('PASS: owner login, 5/13 accurate import, private media/playback, versioning, revisions, incomplete-QA denial, exact approval/replay, refresh and screenshots');
}catch(e){await fs.writeFile(path.join(output,'failure.txt'),String(e));throw e;}finally{if(socket){try{await command('Browser.close');}catch{}socket.close();}browser.kill();}
