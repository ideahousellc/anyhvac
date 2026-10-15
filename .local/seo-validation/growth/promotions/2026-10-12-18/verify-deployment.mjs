import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='growth/promotions/2026-10-12-18',authDir='growth/.generated/measurement-validation/vercel-auth';
const auth=JSON.parse(await fs.readFile(`${authDir}/auth.json`,'utf8')),{currentTeam:team}=JSON.parse(await fs.readFile(`${authDir}/config.json`,'utf8'));
async function get(path){const r=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${encodeURIComponent(team)}`,{headers:{Authorization:`Bearer ${auth.token}`},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Vercel read failed ${r.status}`);return r.json();}
const project=await get('/v9/projects/anyhvac');if(project.id!=='prj_XXwmn81hQi3666914yOEVbk6EIGI')throw Error('Project mismatch');
const env=await get(`/v10/projects/${project.id}/env`),fingerprint=createHash('sha256').update(JSON.stringify(env.envs.map(e=>({id:e.id,key:e.key,target:e.target,value:e.value,type:e.type})).sort((a,b)=>a.id.localeCompare(b.id)))).digest('hex');
if(process.argv[2]==='before'){
 const flagKeys=env.envs.filter(e=>e.target.includes('production')&&['GROWTH_MEASUREMENT_ENABLED','NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED'].includes(e.key)).map(e=>e.key).sort();if(flagKeys.length!==2)throw Error('Measurement config unexpected');
 await fs.writeFile(`${dir}/deployment-before.json`,JSON.stringify({checkedAt:new Date().toISOString(),project:project.id,envFingerprint:fingerprint,measurementFlagsPresent:flagKeys},null,2));console.log('Production configuration fingerprint saved; both measurement flags present.');
}else{
 const before=JSON.parse(await fs.readFile(`${dir}/deployment-before.json`,'utf8'));if(before.envFingerprint!==fingerprint)throw Error('Production environment changed; stop');
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const list=await get(`/v6/deployments?projectId=${project.id}&target=production&limit=10`),matches=list.deployments.filter(d=>d.meta?.githubCommitSha===commit);
 if(matches.length>1)throw Error('Ambiguous matching deployment');if(!matches.length){console.log(JSON.stringify({commit,state:'AWAITING_GIT_DEPLOYMENT'}));process.exit(0);}
 const d=await get(`/v13/deployments/${matches[0].uid||matches[0].id}`);if(['ERROR','CANCELED'].includes(d.readyState))throw Error(`Deployment failed ${d.readyState}`);
 const result={checkedAt:new Date().toISOString(),id:d.id,state:d.readyState,target:d.target,url:d.url,alias:d.alias,commit:d.meta?.githubCommitSha,environmentUnchanged:true};
 if(d.readyState==='READY'&&!d.alias.includes('www.anyhvac.net'))throw Error('Production alias missing');
 await fs.writeFile(`${dir}/deployment-verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
