import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { body, failure, response, UUID } from "@/lib/agents/http";
import { claim, finish, heartbeat, InboxError, start } from "@/lib/agents/state";
import { inboxEnabled, transaction } from "@/lib/agents/storage";
import { findAgent } from "@/lib/agents/registry";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const secret = process.env.AGENT_RUNNER_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!inboxEnabled() || !secret || secret.length < 32 || supplied.length > 256 || !timingSafeEqual(createHash("sha256").update(secret).digest(), createHash("sha256").update(supplied).digest())) return response({ error: "Runner authentication required." }, 401);
  if (request.headers.has("origin")) return response({ error: "Browser access is not allowed." }, 403);
  try {
    const value = await body(request, ["action", "runnerId", "taskId", "leaseId", "reply", "execution"], 80_000);
    if (typeof value.runnerId !== "string" || !/^[a-zA-Z0-9_.-]{1,64}$/.test(value.runnerId)) throw new InboxError("Invalid runner ID.", 400);
    const runnerId = value.runnerId;
    if (value.action === "claim") {
      const lease = randomUUID();
      return response(await transaction(state => {
        const task = claim(state, runnerId, lease, Date.now());
        return { task: task ? { ...task, definition: findAgent(task.agentId), history: state.tasks.filter(t => t.agentId === task.agentId && t.status === "completed").slice(-8).map(t => ({ prompt: t.prompt, reply: t.reply })), previous: state.tasks.filter(t => t.agentId === task.agentId && t.status === "completed" && t.runnerId === runnerId).at(-1)?.execution } : null };
      }));
    }
    if (value.action === "heartbeat" && value.taskId === undefined) {
      await transaction(state => heartbeat(state, runnerId, Date.now())); return response({ alive: true });
    }
    if (typeof value.taskId !== "string" || !UUID.test(value.taskId) || typeof value.leaseId !== "string" || !UUID.test(value.leaseId)) throw new InboxError("Invalid execution reference.", 400);
    const taskId = value.taskId, leaseId = value.leaseId;
    if (value.action === "start") { await transaction(state => start(state, taskId, runnerId, leaseId, Date.now())); return response({ permitted: true }); }
    if (value.action === "heartbeat") { await transaction(state => heartbeat(state, runnerId, Date.now(), taskId, leaseId)); return response({ alive: true }); }
    if (value.action !== "finish") throw new InboxError("Unknown runner action.", 400);
    if (value.reply !== undefined && (typeof value.reply !== "string" || !value.reply.trim() || value.reply.length > 32_000)) throw new InboxError("Invalid response.", 400);
    const execution = value.execution as Record<string, unknown> | undefined;
    if (!execution || typeof execution !== "object" || Object.keys(execution).some(k => !["threadId", "definitionVersion", "inputTokens", "outputTokens"].includes(k)) || (execution.threadId !== undefined && (typeof execution.threadId !== "string" || !UUID.test(execution.threadId))) || typeof execution.definitionVersion !== "string" || !/^[a-f0-9]{64}$/.test(execution.definitionVersion) || [execution.inputTokens, execution.outputTokens].some(n => n !== undefined && (!Number.isSafeInteger(n) || (n as number) < 0))) throw new InboxError("Invalid execution metadata.", 400);
    await transaction(state => finish(state, taskId, runnerId, leaseId, { reply: value.reply as string | undefined, execution }, Date.now()));
    return response({ received: true });
  } catch (error) { return failure(error); }
}
