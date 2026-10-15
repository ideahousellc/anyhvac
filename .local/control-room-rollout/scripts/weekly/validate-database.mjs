// Only a fresh disposable loopback PostgreSQL cluster. No production configuration loaded.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const [binary]=process.argv.slice(2);assert(binary);
function query(sql,db='anyhvac_weekly_validation_final'){return new Promise((resolve,reject)=>{const p=spawn(binary,['-X','-q','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55443','-U','postgres','-d',db,'-tA'],{windowsHide:true});let out='',err='';p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>err+=c);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));p.stdin.end(sql);});}
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
await query("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role bypassrls; end if; end; $$; create database anyhvac_weekly_validation_final;",'postgres');
await query(`create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(bucket_id text,name text); alter table storage.objects enable row level security; grant usage on schema public,storage to anon,authenticated,service_role; grant select,insert,update,delete on storage.objects to anon,authenticated; create policy existing_broad_policy on storage.objects for all to anon,authenticated using(true) with check(true); insert into storage.buckets values('sentinel','sentinel',false,null,null); insert into storage.objects values('sentinel','unchanged');`);
const sql=await fs.readFile('supabase/migrations/20261013000100_weekly_content_review.sql','utf8');await query('begin;'+sql+'commit;');
const files=await fs.readdir('.local/agent-inbox/weekly');const existing=JSON.parse(await fs.readFile('.local/agent-inbox/weekly/'+files[0]+'/state.json','utf8'));
const initial={versions:[existing.versions[0]],actions:[]};const owner='a'.repeat(64),batch=initial.versions[0].content.batchId;
const cas=(revision,state,id=owner)=>query(`set role service_role; select public.weekly_content_compare_swap('${id}','${batch}',${revision},${literal(state)});`);
assert.equal(await cas(0,initial),'t');assert.equal(await cas(0,initial),'f');
const races=await Promise.all(Array.from({length:12},()=>cas(1,initial)));assert.equal(races.filter(x=>x==='t').length,1);
await assert.rejects(cas(2,{...initial,versions:[{...initial.versions[0],reason:'tamper'}]}),/Immutable version/);
await assert.rejects(cas(2,{versions:[],actions:[]}));
const approve={requestId:randomUUID(),action:'approve',version:1,digest:initial.versions[0].digest,at:new Date().toISOString()};
const state={...initial,actions:[approve]};assert.equal(await cas(2,state),'t');
await assert.rejects(cas(3,{...state,actions:[approve,approve]}),/Duplicate request/);
await assert.rejects(cas(3,{...state,actions:[{...approve,digest:'b'.repeat(64)}]}),/Immutable action|mismatch/);
await assert.rejects(cas(3,{...state,actions:[]}),/History cannot/);
await assert.rejects(cas(3,{...state,actions:[approve,{...approve,requestId:randomUUID(),digest:'b'.repeat(64)}]}),/mismatch/);
assert.equal(await cas(0,initial,'c'.repeat(64)),'t');
for(const role of ['anon','authenticated']) for(const op of ['select * from public.weekly_content_reviews;',`update public.weekly_content_reviews set revision=revision+1;`,`delete from public.weekly_content_reviews;`,`select public.weekly_content_compare_swap('${owner}','${batch}',3,${literal(state)});`]) await assert.rejects(query(`set role ${role};${op}`),/permission denied/);
await assert.rejects(query('set role service_role; delete from public.weekly_content_reviews;'),/permission denied/);
await query("insert into storage.objects values('weekly-content-review','private-test');");
for(const role of ['anon','authenticated']){
 assert.equal(await query(`set role ${role};select count(*) from storage.objects where bucket_id='weekly-content-review';`),'0');
 assert.equal(await query(`set role ${role};select count(*) from storage.objects where bucket_id='sentinel';`),'1');
 await assert.rejects(query(`set role ${role};insert into storage.objects values('weekly-content-review','forbidden');`),/row-level security/);
}
assert.equal(await query("select relrowsecurity and relforcerowsecurity from pg_class where oid='public.weekly_content_reviews'::regclass;"),'t');
assert.equal(await query("select public from storage.buckets where id='weekly-content-review';"),'f');
assert.equal(await query("select count(*) from pg_policies where tablename='weekly_content_reviews';"),'0');
const rollback=`drop policy weekly_review_browser_deny on storage.objects; delete from storage.objects where bucket_id='weekly-content-review'; delete from storage.buckets where id='weekly-content-review'; drop function public.weekly_content_compare_swap(text,text,bigint,jsonb); drop table public.weekly_content_reviews; drop function public.guard_weekly_content_review();`;
await query('begin;'+rollback+'commit;');assert.equal(await query("select name from storage.objects where bucket_id='sentinel';"),'unchanged');await query('begin;'+sql+'commit;');
await fs.writeFile('.local/agent-inbox/weekly-hosted-validation/sql-result.json',JSON.stringify({at:new Date().toISOString(),version:await query('select version();'),cleanApply:true,rollbackReapply:true,immutableVersionsActions:true,concurrentWinners:1,racingCalls:12,rolesDenied:true,restrictiveStoragePolicy:true,storageSchema:'minimal Supabase metadata stand-in; not actual Storage service'},null,2));
console.log('PASS: clean migration, rollback/reapply, immutable history, digest relations, duplicate rejection, 12 CAS races, RLS/grants and restrictive bucket policies');
