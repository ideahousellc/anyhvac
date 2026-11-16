// Explicit local invocation only. No scheduler, mutations or automatic account setup.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
import nextEnv from '@next/env';
import {bufferClient} from '../../growth/distribution/buffer/client.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Node 22.18+/24+ strips TS; this local resolver supplies the existing @ alias.
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(path.join(root,specifier.slice(2)+'.ts')).href,context);
  return nextResolve(specifier,context);
}});
nextEnv.loadEnvConfig(root, false, {info() {}, error() {}});
const {loadGoogleSearchReport}=await import('../../lib/admin/integrations/google-search-console/report.ts');
const {getWeeklyReportingWindow,parseSuppliedEvidence,renderWeeklyReport}=await import('../../lib/admin/reporting/weekly.ts');
const args=process.argv.slice(2);
if(args.length>2||(args.length&&args[0]!=='--supplied')||(args[0]&&!args[1]))throw Error('Usage: node scripts/analytics/weekly-report.mjs [--supplied path-to-owner-evidence.json]');
const now=new Date(),checkedAt=now.toISOString(),window=getWeeklyReportingWindow(now);
const unavailable=(source,note)=>({...window,source,checkedAt,state:'unavailable',values:{},notes:[note]});
const dateInWeek=stamp=>{
  if(!stamp||!Number.isFinite(Date.parse(stamp)))return false;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:window.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp));
  return day>=window.startDate&&day<=window.endDate;
};
async function buffer(){
 if(!process.env.BUFFER_API_KEY)return unavailable('Buffer API','BUFFER_API_KEY missing; no provider request made.');
 try{
  // Default client rejects all mutations, even though this existing key can publish.
  const api=bufferClient(process.env.BUFFER_API_KEY);const channels=(await api.channels()).filter(c=>['linkedin','instagram','youtube'].includes(c.service));
  const evidence={...window,source:'Buffer GraphQL API; read-only queries',checkedAt,state:'available',values:{},notes:['Counts are DERIVED from provider status and sentAt; not independent native publication verification. Upcoming counts are a point-in-time queue snapshot, outside the completed-week publication total.']};
  for(const c of channels){
   const items=[];let after=null;const seen=new Set(),cursors=new Set();
   for(let page=0;page<100;page++){
    const d=await api.request('query WeeklyPublications($input:PostsInput!,$after:String){posts(first:100,after:$after,input:$input){edges{node{id channelId status sentAt dueAt}}pageInfo{hasNextPage endCursor}}}',{input:{organizationId:c.organizationId,filter:{channelIds:[c.id]}},after});
    if(!Array.isArray(d.posts?.edges)||typeof d.posts.pageInfo?.hasNextPage!=='boolean')throw Error('Invalid pagination');
    for(const e of d.posts.edges){if(!e.node?.id||e.node.channelId!==c.id||seen.has(e.node.id))throw Error('Invalid post');seen.add(e.node.id);items.push(e.node);}
    if(!d.posts.pageInfo.hasNextPage)break;
    after=d.posts.pageInfo.endCursor;if(!after||cursors.has(after)||page===99)throw Error('Incomplete pagination');cursors.add(after);
   }
   evidence.values[c.service+'SentInWeek']=(evidence.values[c.service+'SentInWeek']??0)+items.filter(p=>p.status==='sent'&&dateInWeek(p.sentAt)).length;
   evidence.values[c.service+'UpcomingScheduled']=(evidence.values[c.service+'UpcomingScheduled']??0)+items.filter(p=>p.status==='scheduled'&&Date.parse(p.dueAt)>now.getTime()).length;
   const missing=items.filter(p=>p.status==='sent'&&(!p.sentAt||!Number.isFinite(Date.parse(p.sentAt)))).length;
   if(missing)evidence.notes.push(c.service+': '+missing+' sent records lack a usable sentAt; excluded from weekly counts, so count may be incomplete.');
  }
  for(const name of ['linkedin','instagram','youtube'])if(!channels.some(c=>c.service===name)){evidence.values[name+'SentInWeek']=null;evidence.notes.push(name+': channel not returned; count unavailable.');}
  // Only probe read permission. Never change the key or convert lifetime metrics to weekly totals.
  if(channels.length){const c=channels[0];try{
   const probe=await api.request('query WeeklyInsightsProbe($input:PostsInput!){posts(first:1,input:$input){edges{node{id metrics{name value} metricsUpdatedAt}}}}',{input:{organizationId:c.organizationId,filter:{channelIds:[c.id]}}});
   evidence.notes.push(probe.posts?.edges?.length?'A post metrics field was readable in the probe, but API metrics are experimental/lifetime snapshots. Supply dated native Insights for weekly reach/clicks; this report does not sum lifetime metrics into a weekly result.':'No post returned for the metrics probe; permission remains unverified. Supply native Insights evidence.');
  }catch(error){evidence.notes.push(/insufficient scope/i.test(error.message)?'Performance unavailable: required insights:read; key unchanged.':'Performance unavailable: read probe failed; response details suppressed.');}}
  evidence.checkedAt=new Date().toISOString();return evidence;
 }catch{return unavailable('Buffer GraphQL API','Read failed or pagination incomplete; no zero counts substituted. Response details suppressed.');}
}
async function engagement(){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)return unavailable('Supabase resource_growth_daily','Existing database settings missing.');
 try{
  const url=new URL('/rest/v1/resource_growth_daily',process.env.SUPABASE_URL);
  url.searchParams.set('select','metric_day,metric,count');url.searchParams.set('metric_day','gte.'+window.startDate);url.searchParams.set('and','(metric_day.lte.'+window.endDate+')');url.searchParams.set('order','metric_day.asc,metric.asc');
  const r=await fetch(url,{method:'GET',redirect:'error',headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Read unavailable');const rows=await r.json();
  if(!Array.isArray(rows)||rows.length>63||rows.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x.metric_day)||x.metric_day<window.startDate||x.metric_day>window.endDate||!Number.isSafeInteger(x.count)||x.count<0||!['resource_view','calculator_any','calculator_top','calculator_contextual','newsletter_any','newsletter_inline','newsletter_footer','newsletter_automatic','newsletter_other'].includes(x.metric)))throw Error('Invalid aggregates');
  const values={};for(const row of rows)values[row.metric]=(values[row.metric]??0)+row.count;
  return {...window,source:'Supabase resource_growth_daily; aggregate SELECT only',checkedAt:new Date().toISOString(),state:'available',values,notes:['DERIVED sums of recorded rows for /resources/duct-design-quick-reference only. Stored metric_day uses America/New_York. Missing metric/day rows remain unknown; coverage/exclusions not certified.','No unique people, sitewide calculator totals, subscription confirmations or revenue inferred. Automatic newsletter opens are not explicit intent.']};
 }catch{return unavailable('Supabase resource_growth_daily','Aggregate read failed; error details suppressed.');}
}
let supplied={};
if(args.length){try{supplied=parseSuppliedEvidence(JSON.parse(fs.readFileSync(path.resolve(args[1]),'utf8')));}catch{throw Error('Supplied evidence could not be read or validated; contents suppressed.');}}
const [search,bufferEvidence,eventEvidence]=await Promise.all([loadGoogleSearchReport(),buffer(),engagement()]);
const report={generatedAt:checkedAt,window,search,buffer:bufferEvidence,engagement:eventEvidence,supplied};
const output=path.join(root,'.local','analytics');fs.mkdirSync(output,{recursive:true});
const ignore=path.join(output,'.gitignore');if(!fs.existsSync(ignore))fs.writeFileSync(ignore,'*\n!.gitignore\n',{flag:'wx'});
const name='weekly-'+window.endDate+'-'+checkedAt.replace(/[:.]/g,'-');
fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(report,null,2),{flag:'wx'});
fs.writeFileSync(path.join(output,name+'.md'),renderWeeklyReport(report),{flag:'wx'});
console.log(JSON.stringify({report:path.relative(root,path.join(output,name+'.md')),search:search.state,searchReason:search.reason??null,buffer:bufferEvidence.state,engagement:eventEvidence.state}));
