"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";
import type { InboxSnapshot } from "@/lib/agents/types";
import styles from "./AgentInbox.module.css";

export function AgentInbox({ weeklyEnabled = false }: { weeklyEnabled?: boolean }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [observedAt, setObservedAt] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [selected, setSelected] = useState("anyhvac.george");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [disposal, setDisposal] = useState<{ taskId: string; action: "cancel" | "supersede" } | null>(null);
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const request = useRef<{ id: string; prompt: string; agentId: string } | null>(null);
  const history = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => { try {
      const draft = JSON.parse(sessionStorage.getItem("anyhvac.agentInbox.pending") ?? "null");
      if (draft && typeof draft.id === "string" && typeof draft.prompt === "string" && draft.prompt.length <= 6000 && typeof draft.agentId === "string") {
        request.current = draft; setPrompt(draft.prompt); setSelected(draft.agentId);
      }
    } catch { sessionStorage.removeItem("anyhvac.agentInbox.pending"); } }, 0);
    return () => clearTimeout(timer);
  }, []);
  const refresh = useCallback(async () => {
    const requestedAt = Date.now();
    try {
      const result = await fetch("/api/admin/agents", { cache: "no-store" });
      if (result.status === 401) { router.replace("/admin"); return; }
      const value = await result.json();
      if (!result.ok) throw new Error(value.error);
      setReceivedAt(requestedAt); setObservedAt(Date.now()); setSnapshot(value);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Inbox could not be loaded."); }
  }, [router]);
  useEffect(() => { const initial = setTimeout(() => void refresh(), 0); const interval = setInterval(() => { setObservedAt(Date.now()); void refresh(); }, 3000); return () => { clearTimeout(initial); clearInterval(interval); }; }, [refresh]);
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy || !prompt.trim()) return;
    const normalized = prompt.trim();
    if (!request.current || request.current.prompt !== normalized || request.current.agentId !== selected) request.current = { id: crypto.randomUUID(), prompt: normalized, agentId: selected };
    sessionStorage.setItem("anyhvac.agentInbox.pending", JSON.stringify(request.current));
    setBusy(true); setError("");
    try {
      const result = await fetch("/api/admin/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: selected, requestId: request.current.id, prompt: normalized }) });
      const value = await result.json(); if (!result.ok) throw new Error(value.error);
      setPrompt(""); request.current = null; sessionStorage.removeItem("anyhvac.agentInbox.pending"); await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Delivery is uncertain. Submit the same message again to check its saved request, without creating a duplicate."); }
    finally { setBusy(false); }
  }
  async function close(taskId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await fetch("/api/admin/agents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
      if (!result.ok) throw new Error("Attempt could not be closed. Refresh and review its state.");
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed."); }
    finally { setBusy(false); }
  }
  async function dispose(event: React.FormEvent) {
    event.preventDefault(); if (!disposal || busy || !confirmed || !reason.trim()) return;
    setBusy(true); setError("");
    try {
      const action = { ...disposal, reason: reason.trim(), ...(disposal.action === "supersede" ? { replacementTaskId: replacement } : {}) };
      const key = "anyhvac.agentInbox.disposition";
      const previous = JSON.parse(sessionStorage.getItem(key) ?? "null");
      const requestId = previous?.payload === JSON.stringify(action) ? previous.requestId : crypto.randomUUID();
      sessionStorage.setItem(key, JSON.stringify({ payload: JSON.stringify(action), requestId }));
      const result = await fetch("/api/admin/agents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...action, requestId }) });
      const value = await result.json(); if (!result.ok) throw new Error(value.error);
      sessionStorage.removeItem(key); setDisposal(null); await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Action delivery is uncertain. Refresh to inspect the audit record before trying again."); }
    finally { setBusy(false); }
  }
  const agent = snapshot?.agents.find(a => a.id === selected);
  const tasks = snapshot?.tasks.filter(t => t.agentId === selected) ?? [];
  const latest = tasks.at(-1);
  // Expire the last successful snapshot even if polling fails. Relative elapsed
  // time avoids assuming the browser and server clocks match.
  const heartbeatAge = (snapshot?.serverNow ?? snapshot?.runnerLastSeen ?? 0) - (snapshot?.runnerLastSeen ?? 0) + Math.max(0, observedAt - receivedAt);
  const runnerOnline = Boolean(snapshot?.runnerOnline && heartbeatAge < 35_000);
  useEffect(() => { if (history.current) history.current.scrollTop = history.current.scrollHeight; }, [selected, tasks.length, latest?.reply, latest?.status]);
  return <div className={styles.inbox}>
    <header className={styles.header}><div><Link href="/admin">AnyHVAC · Control Room</Link><h1>Agent Inbox</h1></div><AdminLogoutButton /></header>
    <p className={styles.intro}>Talk with your team. Agents can discuss their responsibilities and read curated repository context. Production actions are unavailable.</p>
    {weeklyEnabled && selected === "anyhvac.george" && <Link href="/admin/agents/george/weekly">Weekly Content · private review</Link>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {snapshot && <p role="status">Runner {runnerOnline ? "online" : "offline"} · Last heartbeat: {snapshot.runnerLastSeen ? new Date(snapshot.runnerLastSeen).toLocaleString() : "not yet received"}. Conversation replies only; collaboration, content production and scheduling are unavailable.</p>}
    <div className={styles.layout}>
      <nav className={styles.team} aria-label="Select an agent">{snapshot?.agents.map(a => {
        const own = snapshot.tasks.filter(t => t.agentId === a.id);
        const state = own.some(t => t.status === "working") && runnerOnline ? "Working" : own.some(t => t.reviewRequired) ? "Failed · review needed" : !runnerOnline ? "Runner offline" : own.some(t => t.status === "pending") ? "Pending" : own.at(-1)?.status === "completed" ? "Completed" : "Ready";
        return <button key={a.id} className={`${styles.agent} ${selected === a.id ? styles.selected : ""}`} onClick={() => setSelected(a.id)} aria-pressed={selected === a.id}><strong>{a.name}</strong><span>{a.role}</span><p>{a.summary}</p><small>{state}</small></button>;
      })}</nav>
      <section className={styles.conversation} aria-label={agent ? `${agent.name} conversation` : "Agent conversation"}>
        <header><h2>{agent?.name ?? "Loading your team…"}</h2>{agent && <p>{agent.role} · {agent.id}</p>}</header>
        {snapshot && !runnerOnline && <p className={styles.notice}>Runner offline. New messages stay pending until your local runner returns.</p>}
        <div ref={history} className={styles.history} aria-live="polite">{tasks.length === 0 && <p>Start a conversation with a harmless question about this agent’s work.</p>}{tasks.map(task => <article key={task.id} className={styles.task}>
          <div className={styles.owner}><strong>You</strong><p>{task.prompt}</p><time dateTime={new Date(task.createdAt).toISOString()}>{new Date(task.createdAt).toLocaleString()}</time></div>
          <div className={styles.reply}><strong>{agent?.name}</strong><small>{task.status === "working" && !runnerOnline ? "Runner offline · awaiting recovery" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}</small>
            {task.reply && <p>{task.reply}</p>}{task.error && <p className={styles.error}>{task.error}</p>}
            {task.disposition && <p>Owner {task.disposition.action === "cancel" ? "cancelled" : "superseded"} this request on {new Date(task.disposition.at).toLocaleString()}: {task.disposition.reason}{task.disposition.replacementTaskId && ` · Replacement request: ${task.disposition.replacementTaskId}`}. Original message retained; this request cannot execute.</p>}
            {task.reviewRequired && <button disabled={busy} onClick={() => void close(task.id)}>Close failed attempt without retry</button>}
            {(["pending", "working"].includes(task.status) && !task.startedAt) && <div className={styles.actions}>{(["cancel", "supersede"] as const).map(action => <button key={action} disabled={busy} onClick={() => { setDisposal({ taskId: task.id, action }); setReason(""); setReplacement(""); setConfirmed(false); }}>{action === "cancel" ? "Cancel request" : "Supersede request"}</button>)}</div>}
          </div>
        </article>)}</div>
        {disposal && <form onSubmit={dispose} className={styles.notice}>
          <p><strong>{disposal.action === "cancel" ? "Cancel" : "Supersede"} request</strong>: {tasks.find(t => t.id === disposal.taskId)?.prompt}</p>
          <label htmlFor="disposal-reason">Reason for the audit history</label><textarea id="disposal-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} required disabled={busy} />
          {disposal.action === "supersede" && <><label htmlFor="replacement-request">Keep this pending request instead</label><select id="replacement-request" required value={replacement} onChange={e => setReplacement(e.target.value)} disabled={busy}><option value="">Select a replacement</option>{tasks.filter(t => t.id !== disposal.taskId && t.status === "pending").map(t => <option key={t.id} value={t.id}>{new Date(t.createdAt).toLocaleString()} · {t.prompt.slice(0, 100)}</option>)}</select></>}
          <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} /> I authorize closing this request without executing it. Its message and audit history will remain.</label>
          <div className={styles.actions}><button disabled={busy || !confirmed || !reason.trim() || (disposal.action === "supersede" && !replacement)}>Confirm {disposal.action === "cancel" ? "cancellation" : "supersession"}</button><button type="button" disabled={busy} onClick={() => setDisposal(null)}>Keep request</button></div>
        </form>}
        <form onSubmit={send}><label htmlFor="agent-message">Message {agent?.name}</label><textarea id="agent-message" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={6000} rows={4} required disabled={busy} placeholder="Ask a read-only question about responsibilities or repository context…" /><p className={styles.hint}>Do not include credentials or private customer information.</p><button type="submit" disabled={busy || !snapshot || !prompt.trim()}>{busy ? "Saving…" : "Send message"}</button></form>
      </section>
    </div>
  </div>;
}
