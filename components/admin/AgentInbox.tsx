"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";
import type { InboxSnapshot } from "@/lib/agents/types";
import styles from "./AgentInbox.module.css";

export function AgentInbox() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [selected, setSelected] = useState("anyhvac.george");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
    try {
      const result = await fetch("/api/admin/agents", { cache: "no-store" });
      if (result.status === 401) { router.replace("/admin"); return; }
      const value = await result.json();
      if (!result.ok) throw new Error(value.error);
      setSnapshot(value);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Inbox could not be loaded."); }
  }, [router]);
  useEffect(() => { const initial = setTimeout(() => void refresh(), 0); const interval = setInterval(() => void refresh(), 3000); return () => { clearTimeout(initial); clearInterval(interval); }; }, [refresh]);
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
    const result = await fetch("/api/admin/agents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
    if (!result.ok) setError("Attempt could not be closed. Refresh and review its state."); else await refresh();
  }
  const agent = snapshot?.agents.find(a => a.id === selected);
  const tasks = snapshot?.tasks.filter(t => t.agentId === selected) ?? [];
  const latest = tasks.at(-1);
  useEffect(() => { if (history.current) history.current.scrollTop = history.current.scrollHeight; }, [selected, tasks.length, latest?.reply, latest?.status]);
  return <div className={styles.inbox}>
    <header className={styles.header}><div><Link href="/admin">AnyHVAC · Control Room</Link><h1>Agent Inbox</h1></div><AdminLogoutButton /></header>
    <p className={styles.intro}>Talk with your team. Agents can discuss their responsibilities and read curated repository context. Production actions are unavailable.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.layout}>
      <nav className={styles.team} aria-label="Select an agent">{snapshot?.agents.map(a => {
        const own = snapshot.tasks.filter(t => t.agentId === a.id);
        const state = own.some(t => t.status === "working") && snapshot.runnerOnline ? "Working" : own.some(t => t.reviewRequired) ? "Failed · review needed" : !snapshot.runnerOnline ? "Runner offline" : own.some(t => t.status === "pending") ? "Pending" : own.at(-1)?.status === "completed" ? "Completed" : "Ready";
        return <button key={a.id} className={`${styles.agent} ${selected === a.id ? styles.selected : ""}`} onClick={() => setSelected(a.id)} aria-pressed={selected === a.id}><strong>{a.name}</strong><span>{a.role}</span><p>{a.summary}</p><small>{state}</small></button>;
      })}</nav>
      <section className={styles.conversation} aria-label={agent ? `${agent.name} conversation` : "Agent conversation"}>
        <header><h2>{agent?.name ?? "Loading your team…"}</h2>{agent && <p>{agent.role} · {agent.id}</p>}</header>
        {snapshot && !snapshot.runnerOnline && <p className={styles.notice}>Runner offline. New messages stay pending until your local runner returns.</p>}
        <div ref={history} className={styles.history} aria-live="polite">{tasks.length === 0 && <p>Start a conversation with a harmless question about this agent’s work.</p>}{tasks.map(task => <article key={task.id} className={styles.task}>
          <div className={styles.owner}><strong>You</strong><p>{task.prompt}</p><time dateTime={new Date(task.createdAt).toISOString()}>{new Date(task.createdAt).toLocaleString()}</time></div>
          <div className={styles.reply}><strong>{agent?.name}</strong><small>{task.status === "working" && !snapshot?.runnerOnline ? "Runner offline · awaiting recovery" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}</small>
            {task.reply && <p>{task.reply}</p>}{task.error && <p className={styles.error}>{task.error}</p>}
            {task.reviewRequired && <button onClick={() => void close(task.id)}>Close failed attempt without retry</button>}
          </div>
        </article>)}</div>
        <form onSubmit={send}><label htmlFor="agent-message">Message {agent?.name}</label><textarea id="agent-message" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={6000} rows={4} required disabled={busy} placeholder="Ask a read-only question about responsibilities or repository context…" /><p className={styles.hint}>Do not include credentials or private customer information.</p><button type="submit" disabled={busy || !snapshot || !prompt.trim()}>{busy ? "Saving…" : "Send message"}</button></form>
      </section>
    </div>
  </div>;
}
