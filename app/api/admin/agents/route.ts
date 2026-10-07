import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { isSameOrigin } from "@/lib/admin/request-security";
import { AGENTS, findAgent } from "@/lib/agents/registry";
import { body, failure, response, UUID } from "@/lib/agents/http";
import { enqueue, expire, InboxError, online, resolve } from "@/lib/agents/state";
import { inboxEnabled, transaction } from "@/lib/agents/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function guard(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ error: "Authentication required." }, 401);
  if (!inboxEnabled()) return response({ error: "Agent inbox is disabled." }, 503);
}
export async function GET(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  try {
    return response(await transaction(state => {
      expire(state, Date.now());
      return { agents: AGENTS, runnerOnline: online(state, Date.now()), tasks: state.tasks.map(({ runnerId: _r, leaseId: _l, leaseUntil: _u, ...task }) => { void _r; void _l; void _u; return task; }) };
    }));
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  if (!isSameOrigin(request)) return response({ error: "Request not allowed." }, 403);
  try {
    const value = await body(request, ["agentId", "requestId", "prompt"]);
    if (typeof value.agentId !== "string" || !findAgent(value.agentId) || typeof value.requestId !== "string" || !UUID.test(value.requestId) || typeof value.prompt !== "string" || !value.prompt.trim() || value.prompt.length > 6000) throw new InboxError("Select an agent and enter a message of at most 6,000 characters.", 400);
    const task = { id: randomUUID(), agentId: value.agentId, requestId: value.requestId, prompt: value.prompt.trim(), createdAt: Date.now(), status: "pending" as const };
    const saved = await transaction(state => {
      if (!state.tasks.some(t => t.requestId === task.requestId) && state.tasks.filter(t => t.status === "pending" || t.status === "working").length >= 10) throw new InboxError("Ten messages are already waiting. Let the runner finish before sending more.");
      return enqueue(state, task);
    });
    return response({ taskId: saved.id, status: saved.status });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  if (!isSameOrigin(request)) return response({ error: "Request not allowed." }, 403);
  try {
    const value = await body(request, ["taskId"], 1000);
    if (typeof value.taskId !== "string" || !UUID.test(value.taskId)) throw new InboxError("Invalid task.", 400);
    await transaction(state => resolve(state, value.taskId as string));
    return response({ closed: true });
  } catch (error) { return failure(error); }
}
