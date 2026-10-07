// Local-only, conversation-only POC. No application imports or provider clients.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'growth/.generated/george-continuity-poc');
const workspace = path.join(dir, 'workspace');
const stateFile = path.join(dir, 'state.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const save = state => {
  fs.writeFileSync(stateFile + '.tmp', JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(stateFile + '.tmp', stateFile);
};
const load = () => JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const mode = process.argv[2];
const agentId = 'anyhvac.george';
function classify(events) {
  const warnings = events.filter(e => e.item?.type === 'error');
  const unexpectedWarnings = warnings.filter(e => !e.item.message?.startsWith('Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed;'));
  return {
    replies: events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message').map(e => e.item.text),
    completed: events.find(e => e.type === 'turn.completed'),
    tools: events.filter(e => e.type?.startsWith('item.') && e.item?.type && !['agent_message', 'reasoning', 'error'].includes(e.item.type)).map(e => e.item.type),
    warnings: warnings.map(e => e.item.message),
    unexpectedWarnings,
  };
}
function successful(parsed, exitCode, threadId) {
  return Boolean(exitCode === 0 && parsed.completed && parsed.replies.length && threadId && !parsed.tools.length && !parsed.unexpectedWarnings.length);
}
function resumeEligible(first) {
  return Boolean(first.status === 'completed' && first.execution?.threadId);
}

if (mode === 'selftest') {
  const base = [{ type: 'item.completed', item: { type: 'agent_message', text: 'test' } }, { type: 'turn.completed' }];
  assert.equal(successful(classify(base), 0, 'test-thread'), true);
  assert.equal(successful(classify(base.slice(0, 1)), 0, 'test-thread'), false);
  assert.equal(successful(classify(base), 1, 'test-thread'), false);
  assert.equal(successful(classify(base), 0, null), false);
  assert.equal(successful(classify([...base, { type: 'item.completed', item: { type: 'command_execution' } }]), 0, 'test-thread'), false);
  assert.equal(successful(classify([...base, { type: 'item.completed', item: { type: 'error', message: 'History cannot be resumed' } }]), 0, 'test-thread'), false);
  assert.equal(resumeEligible({ status: 'failed-or-unknown', execution: { threadId: 'test-thread' } }), false);
  assert.equal(resumeEligible({ status: 'completed', execution: {} }), false);
  assert.equal(resumeEligible({ status: 'completed', execution: { threadId: 'test-thread' } }), true);
  console.log('9 local failure/success checks passed; no Codex invocation or record mutation.');
  process.exit(0);
}

if (mode === 'prepare') {
  if (fs.existsSync(stateFile)) throw new Error('Existing POC state: refusing to overwrite.');
  fs.mkdirSync(workspace, { recursive: true });
  const sources = ['AGENTS.md', 'docs/agents/george.md'].map(relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    const copy = path.join(workspace, path.basename(relative));
    fs.writeFileSync(copy, bytes);
    return { relative, sha256: sha(bytes), bytes: bytes.length };
  });
  const marker = 'continuity-' + crypto.randomUUID();
  const state = {
    version: 1,
    createdAt: new Date().toISOString(),
    agent: { id: agentId, name: 'George', sources, permissions: 'conversation-only/read-only' },
    marker,
    tasks: [
      { id: 'george-poc-001', agentId, status: 'pending', instruction: 'Summarize three responsibilities and three approval boundaries from the supplied canonical sources. Include the test marker exactly: ' + marker },
      { id: 'george-poc-002', agentId, status: 'pending', instruction: 'Recall the exact continuity test marker from the preceding task (it is deliberately not supplied again). Explain how your earlier responsibility summary distinguishes George from William. Do not invent missing context.' },
    ],
  };
  save(state);
  console.log(JSON.stringify({ prepared: true, agentId, sources }));
  process.exit(0);
}

if (!['first', 'second', 'verify', 'reconcile-first'].includes(mode)) throw new Error('Use prepare, first, second, verify or reconcile-first.');
const state = load();
if (state.agent.id !== agentId || state.tasks.some(t => t.agentId !== agentId)) throw new Error('Identity mismatch.');
for (const source of state.agent.sources) {
  if (sha(fs.readFileSync(path.join(root, source.relative))) !== source.sha256) throw new Error('Canonical source changed; stop for review.');
}

if (mode === 'reconcile-first') {
  const task = state.tasks[0];
  if (task.status !== 'failed-or-unknown') throw new Error('No first result to reconcile.');
  const events = fs.readFileSync(path.join(dir, task.id + '-events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const parsed = classify(events);
  if (!successful(parsed, task.execution.exitCode, task.execution.threadId)) throw new Error('Saved evidence does not establish success; do not replay.');
  task.reconciliation = { priorStatus: task.status, at: new Date().toISOString(), reason: 'Recognized disabled-Code-Mode fail-closed warning is not tool execution. Reclassified saved events; no inference replay.' };
  task.status = 'completed';
  task.execution.toolItems = [];
  task.execution.nonfatalWarnings = parsed.warnings;
  task.result = { agentId, taskId: task.id, text: parsed.replies.join('\n\n'), sha256: sha(parsed.replies.join('\n\n')) };
  save(state);
  console.log(JSON.stringify({ taskId: task.id, status: task.status, reconciliation: task.reconciliation }));
  process.exit(0);
}

if (mode === 'verify') {
  const result = state.tasks.map(t => ({
    id: t.id, agentId: t.agentId, status: t.status,
    threadId: t.execution?.threadId ?? null,
    hasResult: typeof t.result?.text === 'string',
    markerRecall: t.result?.text.includes(state.marker) ?? false,
    exitCode: t.execution?.exitCode ?? null,
    toolItems: t.execution?.toolItems ?? [],
  }));
  const second = state.tasks[1];
  console.log(JSON.stringify({ agentId, tasks: result, sameThread: Boolean(second.execution?.threadId && second.execution.threadId === state.tasks[0].execution?.threadId), sourceHashesUnchanged: true }, null, 2));
  process.exit(0);
}

const index = mode === 'first' ? 0 : 1;
const task = state.tasks[index];
if (task.status !== 'pending') throw new Error('Task already dispatched: no automatic replay.');
if (index && !resumeEligible(state.tasks[0])) {
  task.status = 'blocked';
  task.limitation = 'First execution has no verified successful thread/result; no resume and no silent fresh-thread fallback.';
  save(state);
  console.log(JSON.stringify({ taskId: task.id, status: task.status, limitation: task.limitation }));
  process.exit(0);
}

const executable = process.env.ANYHVAC_POC_CODEX_BIN;
if (!executable || !fs.existsSync(executable)) throw new Error('Set ANYHVAC_POC_CODEX_BIN to the already installed Codex executable.');
const disabled = ['shell_tool', 'unified_exec', 'apps', 'plugins', 'hooks', 'browser_use', 'computer_use', 'image_generation', 'code_mode_host', 'multi_agent', 'skill_mcp_dependency_install'];
const args = ['--ask-for-approval', 'never', 'exec', '--ignore-user-config', '--strict-config', '--json'];
for (const feature of disabled) args.push('--disable', feature);
args.push('-c', 'web_search="disabled"', '-c', 'shell_environment_policy.inherit="none"');
if (index) args.push('-c', 'sandbox_mode="read-only"', 'resume', state.tasks[0].execution.threadId, '-');
else args.push('--sandbox', 'read-only', '--cd', workspace, '-');

// Preserve only OS/runtime and existing OS-user auth resolution, never application secrets.
const allowed = ['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMDATA', 'HOMEDRIVE', 'HOMEPATH'];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.includes(key.toUpperCase())));
const boundaries = 'This is an isolated conversation-only POC. No tools, commands, connectors, external actions, file changes or production access. Any previous publishing authority is suspended for this POC. Return plain text only. Logical identity: ' + agentId + '. Task ID: ' + task.id + '.\n';
const sourceText = state.agent.sources.map(s => '\nCANONICAL SOURCE ' + s.relative + ' SHA256 ' + s.sha256 + '\n' + fs.readFileSync(path.join(workspace, path.basename(s.relative)), 'utf8')).join('\n');
const prompt = boundaries + (index ? '' : sourceText) + '\nTASK\n' + task.instruction;
task.status = 'dispatching';
task.execution = { mechanism: 'documented codex exec' + (index ? ' resume' : ''), args, startedAt: new Date().toISOString(), promptSha256: sha(prompt), threadId: index ? state.tasks[0].execution.threadId : null };
save(state);
fs.writeFileSync(path.join(dir, task.id + '-prompt.txt'), prompt);
const log = fs.createWriteStream(path.join(dir, task.id + '-events.jsonl'), { flags: 'wx' });
const errors = fs.createWriteStream(path.join(dir, task.id + '-stderr.txt'), { flags: 'wx' });
const events = [];
let buffer = '';
const child = spawn(executable, args, { cwd: workspace, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => {
  log.write(chunk);
  buffer += chunk.toString();
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    if (line.trim()) { try { events.push(JSON.parse(line)); } catch { events.push({ type: 'unparsed-output' }); } }
  }
});
child.stderr.on('data', chunk => errors.write(chunk));
child.stdin.end(prompt);
let launchError;
child.on('error', error => { launchError = error.code ?? 'spawn-failed'; });
const exitCode = await new Promise(resolve => child.on('close', code => resolve(code)));
await Promise.all([new Promise(r => log.end(r)), new Promise(r => errors.end(r))]);
const threadEvent = events.find(e => e.type === 'thread.started');
const { replies, completed, tools, warnings, unexpectedWarnings } = classify(events);
task.execution.exitCode = exitCode;
task.execution.finishedAt = new Date().toISOString();
task.execution.threadId = threadEvent?.thread_id ?? task.execution.threadId;
task.execution.eventTypes = [...new Set(events.map(e => e.type))];
task.execution.toolItems = [...new Set(tools)];
task.execution.nonfatalWarnings = warnings;
task.execution.usage = completed?.usage ?? null;
task.execution.launchError = launchError ?? null;
if (successful({ replies, completed, tools, unexpectedWarnings }, exitCode, task.execution.threadId)) {
  task.status = 'completed';
  task.result = { agentId, taskId: task.id, text: replies.join('\n\n'), sha256: sha(replies.join('\n\n')) };
} else {
  task.status = 'failed-or-unknown';
  task.limitation = 'No verified successful, tool-free completion. Inspect private logs; do not blindly retry or substitute a new thread.';
}
save(state);
console.log(JSON.stringify({ taskId: task.id, agentId, status: task.status, execution: task.execution, result: task.result ?? null }, null, 2));
