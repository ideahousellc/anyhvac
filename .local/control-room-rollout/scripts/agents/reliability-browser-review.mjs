// Local UI validation with simulated verified replies. Real Codex is tested separately.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import WebSocket from 'ws';
const config = JSON.parse(await fs.readFile('.local/agent-inbox/reliability-review/ui-config.json','utf8'));
const output = path.resolve('.local/agent-inbox/reliability-review');
const origin = 'http://localhost:3017', port = 9267;
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(output,'pilot-browser-profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay = ms => new Promise(r=>setTimeout(r,ms));
let socket, sequence=0; const pending = new Map();
const command = (method, params={}) => new Promise((resolve,reject)=>{
  const id=++sequence, timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: ' + method));},20000);
  pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});socket.send(JSON.stringify({id,method,params}));
});
async function evaluate(expression) { const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails)throw Error('Browser assertion failed'); return result.result.value; }
async function wait(expression,seconds=30) { for(let i=0;i<seconds*5;i++){if(await evaluate(expression))return;await delay(200);}throw Error('Browser wait failed: '+expression); }
async function screenshot(name) {const result=await command('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));}
const fill = (selector,text) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing input');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const click = async text => {
  const match = `b=>b.innerText===${JSON.stringify(text)} || b.querySelector('strong')?.innerText===${JSON.stringify(text)}`;
  await wait(`[...document.querySelectorAll('button')].some(${match})`);
  await evaluate(`document.querySelectorAll('button') && [...document.querySelectorAll('button')].find(${match}).click()`);
};
async function send(text) {await fill('#agent-message',text);await delay(200);await click('Send message');await wait(`document.body.innerText.includes(${JSON.stringify(text)}) && document.querySelector('#agent-message').value === ''`);}
async function snapshot() {return evaluate("fetch('/api/admin/agents').then(r=>r.json())");}
async function worker(action, fields={}) {
  const r=await fetch(origin+'/api/agent-runner',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.runnerToken},body:JSON.stringify({action,runnerId:'pilot-ui',...fields})});
  if(!r.ok)throw Error('Local worker assertion failed');return r.json();
}
try {
  let target;
  for(let i=0;i<50;i++){try {target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(200);}
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});
  socket.on('message',bytes=>{const message=JSON.parse(bytes),callback=pending.get(message.id);if(callback){pending.delete(message.id);if(message.error)callback.reject(Error('CDP error'));else callback.resolve(message.result);}});
  await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1320,height:1100,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:origin+'/admin'});await wait("Boolean(document.querySelector('input[name=username]')) || document.body.innerText.includes('Agents / Team')");await delay(2000);
  if(await evaluate("Boolean(document.querySelector('input[name=username]'))")) {await fill('input[name=username]',config.username);await fill('input[name=pin]',config.pin);await click('Sign In');}
  await wait("document.body.innerText.includes('Agents / Team')");await evaluate("document.querySelector('a[href=\"/admin/agents\"]').click()");await wait("Boolean(document.querySelector('#agent-message')) && document.body.innerText.includes('George')");
  const marker='pilot-'+crypto.randomUUID();
  await send('Harmless duplicate '+marker);await send('Harmless replacement '+marker);
  let state=await snapshot();const original=state.tasks.find(t=>t.prompt==='Harmless duplicate '+marker),replacement=state.tasks.find(t=>t.prompt==='Harmless replacement '+marker);
  await evaluate(`document.querySelectorAll('article')[${state.tasks.filter(t=>t.agentId==='anyhvac.george').findIndex(t=>t.id===original.id)}].querySelectorAll('button')[1].click()`);
  await fill('#disposal-reason','Owner local supersession test');await fill('#replacement-request',replacement.id);await evaluate("document.querySelector('input[type=checkbox]').click()");await delay(200);await screenshot('00-owner-confirmation');await click('Confirm supersession');await wait(`[...document.querySelectorAll('article')].some(a=>a.innerText.includes(${JSON.stringify(original.prompt)}) && a.innerText.includes('Owner superseded this request')) && !document.querySelector('#disposal-reason')`);
  await screenshot('01-supersession');await command('Page.reload');await wait("document.body.innerText.includes('Owner superseded this request')");
  state=await snapshot();if(state.tasks.find(t=>t.id===original.id).status!=='superseded')throw Error('Supersession persistence failed');
  // Exclude previous pilot requests; only this run's harmless replacement is permitted.
  const claimed=await worker('claim',{excludedTaskIds:state.tasks.filter(t=>t.id!==replacement.id && ['pending','working'].includes(t.status)).map(t=>t.id)});
  if(claimed.task?.id!==replacement.id)throw Error('Superseded message claimed');
  const ref={taskId:claimed.task.id,leaseId:claimed.task.leaseId};await worker('start',ref);await worker('finish',{...ref,reply:'George simulated harmless UI reply '+marker,execution:{definitionVersion:'a'.repeat(64)}});
  await wait(`document.body.innerText.includes(${JSON.stringify('George simulated harmless UI reply '+marker)})`);
  await click('William');
  await send('Harmless William role question '+marker);state=await snapshot();const william=state.tasks.find(t=>t.prompt==='Harmless William role question '+marker);
  const w=await worker('claim',{excludedTaskIds:state.tasks.filter(t=>t.id!==william.id && ['pending','working'].includes(t.status)).map(t=>t.id)});
  if(w.task?.id!==william.id)throw Error('Wrong agent claimed');const wr={taskId:w.task.id,leaseId:w.task.leaseId};await worker('start',wr);await worker('finish',{...wr,reply:'William simulated harmless UI reply '+marker,execution:{definitionVersion:'a'.repeat(64)}});
  await wait(`document.body.innerText.includes(${JSON.stringify('William simulated harmless UI reply '+marker)})`);await screenshot('02-independent-replies');
  await command('Page.reload');await wait("Boolean(document.querySelector('#agent-message'))");await click('William');await wait(`document.body.innerText.includes(${JSON.stringify('William simulated harmless UI reply '+marker)})`);
  await send('Harmless cancellation '+marker);await click('Cancel request');await fill('#disposal-reason','Owner local cancellation test');await evaluate("document.querySelector('input[type=checkbox]').click()");await delay(200);await click('Confirm cancellation');await wait(`[...document.querySelectorAll('article')].some(a=>a.innerText.includes(${JSON.stringify('Harmless cancellation '+marker)}) && a.innerText.includes('Owner cancelled this request')) && !document.querySelector('#disposal-reason')`);
  await command('Page.reload');await wait("Boolean(document.querySelector('#agent-message'))");await click('William');await wait("document.body.innerText.includes('Owner cancelled this request')");
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});await evaluate(`[...document.querySelectorAll('article')].find(a=>a.innerText.includes(${JSON.stringify('Harmless cancellation '+marker)})).scrollIntoView({block:'center'})`);await delay(400);await screenshot('03-mobile-audit');
  const result={at:new Date().toISOString(),localOnly:true,simulatedReplies:true,supersessionPersisted:true,cancellationPersisted:true,georgeAndWilliamIndependent:true,refreshPersistence:true,supersededNeverClaimed:true,heartbeatVisible:await evaluate("document.body.innerText.includes('Last heartbeat:')"),horizontalOverflow:await evaluate('document.documentElement.scrollWidth > innerWidth')};
  await command('Network.enable');await command('Network.setBlockedURLs',{urls:['*api/admin/agents*']});
  await wait("document.querySelector('[role=status]').innerText.includes('Runner offline')",45);
  result.staleSnapshotExpired=true;
  if(result.horizontalOverflow)throw Error('Mobile overflow');await fs.writeFile(path.join(output,'browser-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} catch(error) {if(socket){try {await screenshot('browser-failure');await fs.writeFile(path.join(output,'browser-failure.txt'),await evaluate('document.body.innerText'));}catch{ /* preserve original diagnostic */ }}throw error;}
finally {socket?.close();browser.kill();}
