import { describe, expect, it } from 'vitest';
import { executionArgs, executionEnvironment, verifiedCompletion } from '../../../scripts/agents/runner-core.mjs';
describe('restricted Codex executor',()=>{
  const events=[{type:'thread.started',thread_id:'thread'},{type:'item.completed',item:{type:'agent_message',text:'Read-only reply'}},{type:'turn.completed',usage:{input_tokens:20,output_tokens:5}}];
  it('never forwards application or runner credentials to Codex',()=>{
    expect(executionEnvironment({PATH:'runtime',USERPROFILE:'owner',AGENT_RUNNER_TOKEN:'private',SUPABASE_SECRET_KEY:'private',RESEND_API_KEY:'private',CODEX_API_KEY:'private',OPENAI_API_KEY:'private'})).toEqual({PATH:'runtime',USERPROFILE:'owner'});
  });
  it('disables production-capable tools and preserves the sandbox on resume',()=>{
    const args=executionArgs('sanitized','thread');
    for(const name of ['shell_tool','unified_exec','apps','hooks','plugins','browser_use','computer_use','code_mode_host'])expect(args).toContain(name);
    expect(args).toContain('sandbox_mode="read-only"');expect(args).toContain('--ignore-user-config');expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');expect(args).not.toContain('--last');
  });
  it('accepts completed plain-text results and exact thread resumption only',()=>{
    expect(verifiedCompletion(events,0,false,'thread').successful).toBe(true);expect(verifiedCompletion(events,0,false,'different').successful).toBe(false);
  });
  it('fails closed on tool activity, unknown errors, incomplete output or timeout',()=>{
    expect(verifiedCompletion([...events,{type:'item.completed',item:{type:'command_execution'}}],0,false).successful).toBe(false);
    expect(verifiedCompletion([...events,{type:'item.completed',item:{type:'error',message:'Authentication expired'}}],0,false).successful).toBe(false);
    expect(verifiedCompletion(events.slice(0,-1),0,false).successful).toBe(false);expect(verifiedCompletion(events,0,true).successful).toBe(false);
  });
});
