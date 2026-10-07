import { LEASE_MS, MAX_TASKS, ONLINE_MS, type AgentTask, type InboxState } from "./types";
export class InboxError extends Error { constructor(message: string, public status = 409) { super(message); } }
export function expire(state: InboxState, now: number) {
  for (const task of state.tasks) if (task.status === "working" && (task.leaseUntil ?? 0) < now) {
    if (task.startedAt) {
      task.status = "failed"; task.reviewRequired = true;
      task.error = "Runner stopped responding after execution started. No automatic retry. Recover the saved result or close this attempt without retrying.";
    } else {
      task.status = "pending"; delete task.runnerId; delete task.leaseId; delete task.leaseUntil;
    }
  }
}
export function enqueue(state: InboxState, task: AgentTask) {
  const existing = state.tasks.find(t => t.requestId === task.requestId);
  if (existing) {
    if (existing.agentId !== task.agentId || existing.prompt !== task.prompt) throw new InboxError("Request ID already used for another message.");
    return existing;
  }
  if (state.tasks.length >= MAX_TASKS) throw new InboxError("Inbox history limit reached. Export and review before increasing capacity.");
  state.tasks.push(task); return task;
}
export function claim(state: InboxState, runnerId: string, leaseId: string, now: number) {
  expire(state, now);
  if (state.runner && state.runner.id !== runnerId) throw new InboxError("Runner identity differs from the registered Phase 1 runner.");
  state.runner = { id: runnerId, seenAt: now };
  const task = state.tasks.find(t => t.status === "pending" && !state.tasks.some(other => other.agentId === t.agentId && (other.status === "working" || other.reviewRequired)));
  if (!task) return null;
  task.status = "working"; task.runnerId = runnerId; task.leaseId = leaseId; task.leaseUntil = now + LEASE_MS;
  return task;
}
export function start(state: InboxState, id: string, runnerId: string, leaseId: string, now: number) {
  expire(state, now);
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.status !== "working" || task.startedAt || task.runnerId !== runnerId || task.leaseId !== leaseId) throw new InboxError("Execution permit is unavailable. Do not execute.");
  task.startedAt = now; task.leaseUntil = now + LEASE_MS; return task;
}
export function heartbeat(state: InboxState, runnerId: string, now: number, taskId?: string, leaseId?: string) {
  if (state.runner && state.runner.id !== runnerId) throw new InboxError("Runner identity differs.");
  state.runner = { id: runnerId, seenAt: now };
  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.runnerId !== runnerId || task.leaseId !== leaseId || task.status !== "working") throw new InboxError("Lease is no longer active.");
    task.leaseUntil = now + LEASE_MS;
  }
}
export function finish(state: InboxState, id: string, runnerId: string, leaseId: string, result: { reply?: string; execution?: AgentTask["execution"] }, now: number) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.runnerId !== runnerId || task.leaseId !== leaseId || !task.startedAt) throw new InboxError("Result does not match an execution permit.");
  if (task.status === "completed") {
    if (task.reply !== result.reply) throw new InboxError("Completed result cannot be replaced.");
    return task;
  }
  if (task.status !== "working" && !(task.status === "failed" && task.reviewRequired)) throw new InboxError("Attempt is closed.");
  task.execution = result.execution; task.leaseUntil = now;
  if (result.reply) { task.status = "completed"; task.reply = result.reply; delete task.error; delete task.reviewRequired; }
  else { task.status = "failed"; task.reviewRequired = true; task.error = "Execution did not produce a verified response. Review the local runner journal; this attempt will not be replayed."; }
  return task;
}
export function resolve(state: InboxState, id: string) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.status !== "failed" || !task.reviewRequired) throw new InboxError("No failed attempt to close.");
  task.reviewRequired = false; task.error = "Attempt closed by owner without retry. The original message was not executed again.";
}
export function online(state: InboxState, now: number) { return Boolean(state.runner && now - state.runner.seenAt < ONLINE_MS); }
