export type TaskStatus = "pending" | "working" | "completed" | "failed";
export interface AgentDefinition { id: string; name: string; role: string; summary: string; source: string }
export interface AgentTask {
  id: string; requestId: string; agentId: string; prompt: string; createdAt: number;
  status: TaskStatus; reply?: string; error?: string; reviewRequired?: boolean;
  runnerId?: string; leaseId?: string; leaseUntil?: number; startedAt?: number;
  execution?: { threadId?: string; definitionVersion?: string; inputTokens?: number; outputTokens?: number };
}
export interface InboxState { tasks: AgentTask[]; runner?: { id: string; seenAt: number } }
export interface InboxSnapshot { agents: AgentDefinition[]; tasks: AgentTask[]; runnerOnline: boolean }
export const EMPTY_STATE = (): InboxState => ({ tasks: [] });
export const LEASE_MS = 60_000;
export const ONLINE_MS = 35_000;
export const MAX_TASKS = 200;
