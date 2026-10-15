import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import WebSocket from 'ws';
const config = JSON.parse(await fs.readFile('.local/agent-inbox/review-config.json','utf8'));
const output = path.resolve('.local/agent-inbox/review'); await fs.mkdir(output,{recursive:true});
const origin = 'http://localhost:3016', port = 9258;
const continuation = process.argv.includes('--finish-review');
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(output,'browser-profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay = ms => new Promise(r=>setTimeout(r,ms));
let socket, sequence=0; const pending = new Map();
const command = (method, params={}) => new Promise((resolve,reject)=>{
 const id=++sequence, timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},20000);
 pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});socket.send(JSON.stringify({id,method,params}));
});
async function evaluate(expression) { const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails)throw Error('Browser assertion failed: '+result.exceptionDetails.text); return result.result.value; }
async function wait(expression,seconds=20) { for(let i=0;i<seconds*5;i++){if(await evaluate(expression))return;await delay(200);}throw Error('Browser wait failed: '+expression); }
async function screenshot(name) {const result=await command('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));}
const fill = (selector,text) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing input');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
async function send(text) {await fill('#agent-message',text);await delay(200);await evaluate("document.querySelector('button[type=submit]').click()");await delay(1000);await wait("document.body.innerText.includes('Pending')");}
async function runner() { const child=spawn(process.execPath,['scripts/agents/local-runner.mjs','--once'],{env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const exit=await new Promise(r=>child.on('exit',r));await fs.appendFile(path.join(output,'runner-log.txt'),log);if(exit!==0)throw Error('Local runner failed; inspect private journal.');await delay(3500); }
try {
 let target;
 for(let i=0;i<50;i++){try {target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(200);}
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});
 socket.on('message',bytes=>{const message=JSON.parse(bytes),callback=pending.get(message.id);if(callback){pending.delete(message.id);if(message.error)callback.reject(Error(message.error.message));else callback.resolve(message.result);}});
 await command('Page.enable'); await command('Emulation.setDeviceMetricsOverride',{width:1320,height:1100,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:origin+'/admin'});await wait("Boolean(document.querySelector('input[name=username]')) || document.body.innerText.includes('Agents / Team')");await delay(2500);
 if(await evaluate("Boolean(document.querySelector('input[name=username]'))")) {await fill('input[name=username]',config.username);await fill('input[name=pin]',config.pin);await evaluate("document.querySelector('button[type=submit]').click()");}
 await wait("document.body.innerText.includes('Agents / Team')",40);await screenshot('01-control-room');
 await evaluate("document.querySelector('a[href=\"/admin/agents\"]').click()");await wait("Boolean(document.querySelector('#agent-message'))");await wait("document.body.innerText.includes('Growth & Distribution')");
 await screenshot('02-team-offline');
 if (!continuation) {
 const marker='inbox-test-'+crypto.randomUUID();
 await send('Read-only task: summarize two responsibilities and two owner approval boundaries. Include this harmless continuity marker exactly: '+marker);await screenshot('03-george-pending');
 await runner();await wait("document.body.innerText.includes('Completed')");await screenshot('04-george-completed');
 await command('Page.reload');await wait("document.body.innerText.includes('Completed')");
 const persisted=await evaluate(`document.body.innerText.includes(${JSON.stringify(marker)})`);if(!persisted)throw Error('Refresh lost history.');
 await send('Read-only continuity task: recall the exact harmless continuity marker from my preceding message, and describe which repository sources you can use.');await runner();
 const george=JSON.parse(await fs.readFile('.local/agent-inbox/state.json','utf8')).payload.tasks;
 if(george.length!==2||george[1].status!=='completed'||!george[1].reply.includes(marker)||george[0].execution.threadId!==george[1].execution.threadId)throw Error('George continuation failed.');
 await evaluate("[...document.querySelectorAll('nav button')].find(b=>b.innerText.includes('William')).click()");
 await send('Read-only task: summarize your measurement responsibilities and explain measured, derived and inferred labels. Do not contact providers or change any measurements.');await runner();await wait("document.body.innerText.includes('Completed')");await screenshot('05-william-completed');
 }
 await command('Page.reload');await wait("[...document.querySelectorAll('nav button')].some(b=>b.innerText.includes('William'))");await evaluate("[...document.querySelectorAll('nav button')].find(b=>b.innerText.includes('William')).click()");await wait("document.body.innerText.includes('Completed')");
 if(JSON.parse(await fs.readFile('.local/agent-inbox/state.json','utf8')).payload.tasks.at(-1)?.status !== 'pending') await send('Read-only offline test: explain which missing measurement inputs should remain unknown. Keep this message pending until the local runner is explicitly started.');
 await delay(37000);await wait("document.body.innerText.includes('Runner offline')");await screenshot('06-offline-pending');
 const replay=await evaluate(`(async()=>{const snapshot=await(await fetch('/api/admin/agents')).json();const task=snapshot.tasks.at(-1);const response=await fetch('/api/admin/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:task.agentId,requestId:task.requestId,prompt:task.prompt})});const after=await(await fetch('/api/admin/agents')).json();return {status:response.status,countBefore:snapshot.tasks.length,countAfter:after.tasks.length};})()`);
 if(replay.status!==200||replay.countBefore!==replay.countAfter)throw Error('Replay duplicated owner message.');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});await screenshot('07-mobile');
 const result={checkedAt:new Date().toISOString(),localOnly:true,controlRoomNavigation:true,georgeFirstTask:true,georgeResume:true,williamTask:true,refreshPersistence:true,offlinePending:true,replay,taskIds:JSON.parse(await fs.readFile('.local/agent-inbox/state.json','utf8')).payload.tasks.map(t=>({id:t.id,agentId:t.agentId,status:t.status,threadId:t.execution?.threadId}))};
 await fs.writeFile(path.join(output,'browser-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(error) { if(socket){await screenshot('failure');await fs.writeFile(path.join(output,'failure-visible-text.txt'),await evaluate('document.body.innerText'));}throw error; }
finally {socket?.close();browser.kill();}
