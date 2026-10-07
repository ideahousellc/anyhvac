export function executionArgs(workspace, threadId) {
  const args = ['--ask-for-approval','never','exec','--ignore-user-config','--strict-config','--json'];
  for (const feature of ['shell_tool','unified_exec','apps','plugins','hooks','browser_use','computer_use','image_generation','code_mode_host','multi_agent','skill_mcp_dependency_install','view_image']) args.push('--disable',feature);
  args.push('-c','web_search="disabled"','-c','shell_environment_policy.inherit="none"');
  if (threadId) args.push('-c','sandbox_mode="read-only"','resume',threadId,'-');
  else args.push('--sandbox','read-only','--cd',workspace,'-');
  return args;
}
export function executionEnvironment(environment) {
  const allow = ['PATH','PATHEXT','SYSTEMROOT','WINDIR','COMSPEC','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH'];
  return Object.fromEntries(Object.entries(environment).filter(([key]) => allow.includes(key.toUpperCase())));
}
export function verifiedCompletion(events, code, exceeded, expectedThread) {
  const thread = events.find(e=>e.type==='thread.started')?.thread_id;
  const completion = events.find(e=>e.type==='turn.completed');
  const reply = events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').map(e=>e.item.text).join('\n\n');
  const unsafe = events.some(e=>e.type?.startsWith('item.')&&e.item?.type&&!['reasoning','agent_message','error'].includes(e.item.type));
  const error = events.some(e=>e.type==='error'||e.type==='turn.failed'||(e.item?.type==='error'&&!e.item.message?.startsWith('Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed;')));
  return { thread, completion, reply, successful: Boolean(code===0&&!exceeded&&completion&&thread&&reply&&reply.length<=32_000&&!unsafe&&!error&&(!expectedThread||thread===expectedThread)) };
}
