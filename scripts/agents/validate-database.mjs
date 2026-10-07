// Disposable loopback PostgreSQL only; no production configuration is loaded.
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const [psql] = process.argv.slice(2);
assert(psql);
export function query(sql, database = 'anyhvac_agent_validation') {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '55441', '-U', 'postgres', '-d', database, '-tA'], { windowsHide: true });
    let output = '', error = '';
    child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { error += c; });
    child.on('error', reject); child.on('close', code => code ? reject(new Error(error)) : resolve(output.trim()));
    child.stdin.end(sql);
  });
}
const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
await query('create role anon; create role authenticated; create role service_role bypassrls; create database anyhvac_agent_validation;', 'postgres');
await query('create table public.validation_sentinel(value text); insert into public.validation_sentinel values (\'untouched\'); grant usage on schema public to anon, authenticated, service_role;');
const migration = await readFile('supabase/migrations/20261007000100_create_agent_inbox.sql', 'utf8');
await query('begin;\n' + migration + '\ncommit;');
const owner = 'a'.repeat(64), other = 'b'.repeat(64);
const cas = (revision, payload, id = owner) => query(`set role service_role; select public.agent_inbox_compare_swap('${id}',${revision},${literal(payload)});`);
assert.equal(await cas(0, { tasks: [] }), 't');
assert.equal(await cas(0, { tasks: [] }), 'f');
assert.equal(await cas(0, { tasks: [] }, other), 't');
const results = await Promise.all(Array.from({ length: 12 }, (_, i) => cas(1, { tasks: [], marker: i })));
assert.equal(results.filter(v => v === 't').length, 1);
assert.equal(await query(`select revision from public.agent_inbox_documents where owner_id='${owner}';`), '2');
assert.equal(await query(`select revision from public.agent_inbox_documents where owner_id='${other}';`), '1');
for (const role of ['anon', 'authenticated']) {
  for (const statement of ['select * from public.agent_inbox_documents;', `insert into public.agent_inbox_documents values ('${'c'.repeat(64)}',0,'{"tasks":[]}',now());`, `update public.agent_inbox_documents set revision=10;`, `delete from public.agent_inbox_documents;`, `select public.agent_inbox_compare_swap('${owner}',2,'{"tasks":[]}');`]) {
    await assert.rejects(query(`set role ${role}; ${statement}`), /permission denied/);
  }
}
for (const payload of [{}, { tasks: null }, { tasks: {} }, { tasks: Array(201).fill({}) }]) await assert.rejects(cas(2, payload));
await assert.rejects(query(`insert into public.agent_inbox_documents values ('invalid',0,'{"tasks":[]}',now());`));
await assert.rejects(query(`update public.agent_inbox_documents set revision=-1;`));
await assert.rejects(query(`set role service_role; delete from public.agent_inbox_documents;`), /permission denied/);
assert.equal(await query("select relrowsecurity and relforcerowsecurity from pg_class where oid='public.agent_inbox_documents'::regclass;"), 't');
assert.equal(await query("select count(*) from pg_policies where tablename='agent_inbox_documents';"), '0');
assert.equal(await query("select count(*) from pg_indexes where tablename='agent_inbox_documents' and indexname='agent_inbox_documents_pkey';"), '1');
assert.equal(await query("select prosecdef from pg_proc where proname='agent_inbox_compare_swap';"), 'f');
// Even if a future accidental table grant occurs, forced RLS has no allow policy.
assert.equal(await query('begin; grant select on public.agent_inbox_documents to anon; set role anon; select count(*) from public.agent_inbox_documents; rollback;'), '0');
await query('begin; drop function public.agent_inbox_compare_swap(text,bigint,jsonb); drop table public.agent_inbox_documents; commit;');
assert.equal(await query("select value from public.validation_sentinel;"), 'untouched');
assert.equal(await query("select to_regclass('public.agent_inbox_documents') is null;"), 't');
await query('begin;\n' + migration + '\ncommit;');
assert.equal(await query('select count(*) from public.agent_inbox_documents;'), '0');
await writeFile('.local/agent-inbox/database-validation/sql-result.json', JSON.stringify({ timestamp: new Date().toISOString(), version: await query('select version();'), cleanApply: true, rollbackReapply: true, browserRolesDenied: true, forcedRls: true, concurrentCasWinners: 1, concurrentAttempts: 12 }, null, 2));
console.log('PASS: clean apply, envelope constraints, role permissions, RLS, owner rows, 12 racing CAS calls, rollback and clean reapply');
