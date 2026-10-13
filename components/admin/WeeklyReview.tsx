"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewState } from "@/lib/weekly/types";
import styles from "./WeeklyReview.module.css";
export function WeeklyReview() {
  const [state, setState] = useState<ReviewState | null>(null), [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [target, setTarget] = useState(""), [text, setText] = useState(""), [caption, setCaption] = useState(""), [confirm, setConfirm] = useState(false);
  const pending = useRef<{ value: Record<string, unknown>; requestId: string } | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const load = useCallback(async () => { try { const r = await fetch("/api/admin/weekly", { cache: "no-store" }); if (!r.ok) throw Error("Review unavailable. Sign in again if your session expired."); const data = await r.json(); setState(data.state); } catch (e) { setError(String(e)); } }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(); try { const saved = JSON.parse(sessionStorage.getItem("anyhvac.weekly.pending") ?? "null"); if (saved?.value && typeof saved.requestId === "string") { pending.current = saved; setNeedsRetry(true); } } catch { sessionStorage.removeItem("anyhvac.weekly.pending"); } }, 0); return () => clearTimeout(timer); }, [load]);
  const version = state?.versions.find(v => v.number === versionNumber) ?? state?.versions.at(-1);
  const current = version?.number === state?.versions.at(-1)?.number;
  const approved = version && state?.actions.some(a => a.action === "approve" && a.version === version.number && a.digest === version.digest) && !state?.actions.some(a => a.action === "revision" && a.version === version.number);
  async function send(action: string, retry = false) {
    if (!version) return;
    const value = retry && pending.current ? pending.current.value : { action, version: version.number, digest: version.digest, ...(action !== "approve" ? { target, text, ...(action === "edit" ? { caption } : {}) } : {}) };
    if (pending.current && JSON.stringify(pending.current.value) !== JSON.stringify(value)) { setError("An earlier save is unconfirmed. Retry that unchanged action first."); return; }
    const request = pending.current ?? { value, requestId: crypto.randomUUID() }; pending.current = request; sessionStorage.setItem("anyhvac.weekly.pending", JSON.stringify(request)); setNeedsRetry(true); setBusy(true); setError("");
    try { const r = await fetch("/api/admin/weekly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, requestId: request.requestId }) }); const data = await r.json(); if (!r.ok) { if (r.status < 500) { pending.current = null; sessionStorage.removeItem("anyhvac.weekly.pending"); setNeedsRetry(false); } throw Error(data.error); } pending.current = null; sessionStorage.removeItem("anyhvac.weekly.pending"); setNeedsRetry(false); setState(data.state); setVersionNumber(null); setConfirm(false); setText(""); setCaption(""); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return <div className={styles.review}>
    <Link href="/admin/agents">George · Agent Inbox</Link><h1>Weekly Content</h1>
    <p className={styles.notice}>Private owner review · anyhvac.george · Historical October 12–17 fixture. Execution is disabled. Review approval never authorizes scheduling or publishing.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {needsRetry && <p className={styles.notice}>An earlier save is unconfirmed. <button disabled={busy} onClick={() => void send("", true)}>Retry the same save safely</button></p>}
    {!version ? <p>Loading the completed batch…</p> : <>
      <div className={styles.toolbar}><h2>{version.content.theme}</h2><label>Version <select value={version.number} onChange={e => { setVersionNumber(Number(e.target.value)); setConfirm(false); }}>{state?.versions.map(v => <option key={v.number} value={v.number}>v{v.number}</option>)}</select></label><strong>{approved ? "Approved for review only" : "Awaiting review"}</strong></div>
      <p>5 packages · 13 adaptations · America/New_York · Allow 20–30 minutes. Play all three videos with sound.</p><p className={styles.digest}>v{version.number} · {version.digest}</p>
      {version.content.packages.map(pkg => <article key={pkg.id} className={styles.card}>
        <h2>{pkg.title}</h2><p>{pkg.purpose}</p><p><strong>Primary metric:</strong> {pkg.primaryMetric}</p><p><strong>Engineering boundary:</strong> {pkg.technicalBoundary}</p>
        {version.content.posts.filter(p => p.packageId === pkg.id).map(post => <details key={post.id} open={post.platform === "linkedin"}>
          <summary>{post.platform} · {post.title} · {post.scheduledAt}</summary>
          <div className={styles.media}>{post.media.map((id, i) => { const media = version.content.media.find(m => m.id === id)!; const src = "/api/admin/weekly/media/" + id; return media.type === "video/mp4" ? <video key={id + i} controls preload="metadata" src={src} aria-label={post.title} /> : <figure key={id + i}><Image unoptimized loading="lazy" width={280} height={350} src={src} alt={post.alt[i] || `${pkg.title}, slide ${i + 1}`} /><figcaption>{post.media.length > 1 ? `Slide ${i + 1} of ${post.media.length}` : "Approved source artwork"}</figcaption></figure>; })}</div>
          <p className={styles.caption}>{post.caption}</p><a href={post.destination} target="_blank" rel="noreferrer">{post.destination}</a><p>Historical record: {post.historicalStatus}</p><details><summary>Exact platform settings</summary><pre>{JSON.stringify(post.settings, null, 2)}</pre></details>
        </details>)}
        <details><summary>Media provenance and licensing</summary>{pkg.provenance.map((p, i) => <div key={i}><p>{p.source}</p><p>{p.license} · {p.credit}</p><p className={styles.digest}>Evidence: {p.evidence.join(", ")}</p></div>)}</details>
      </article>)}
      <section className={styles.card}><h2>13-post calendar</h2><div className={styles.scroll}><table><thead><tr><th>Eastern slot</th><th>Platform</th><th>Package</th><th>Recorded state</th></tr></thead><tbody>{[...version.content.posts].sort((a,b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)).map(p => <tr key={p.id}><td>{p.scheduledAt}</td><td>{p.platform}</td><td>{version.content.packages.find(x => x.id === p.packageId)?.title}</td><td>{p.historicalStatus}</td></tr>)}</tbody></table></div></section>
      <section className={styles.card}><h2>Request a revision</h2><label>Adaptation<select value={target} onChange={e => { setTarget(e.target.value); setCaption(version.content.posts.find(p => p.id === e.target.value)?.caption ?? ""); }}>{[<option key="none" value="">Select a post</option>, ...version.content.posts.map(p => <option key={p.id} value={p.id}>{p.platform} · {p.title}</option>)]}</select></label><label>Revision request / change reason<textarea value={text} onChange={e => setText(e.target.value)} maxLength={3000} rows={3} /></label>
        <button disabled={!current || busy || !target || !text.trim()} onClick={() => void send("revision")}>Save revision request</button>
        <details><summary>Prepare a revised caption locally</summary><textarea aria-label="Revised caption" value={caption} onChange={e => setCaption(e.target.value)} rows={8} maxLength={12000} /><p>This creates an immutable new version. Changed copy requires fresh technical review before approval.</p><button disabled={!current || busy || !target || !text.trim() || !caption.trim()} onClick={() => void send("edit")}>Create new version</button></details>
      </section>
      <section className={styles.card}><h2>Approve exact version</h2><p>QA: technical {version.content.qa.technical}; rights {version.content.qa.rights}; media {version.content.qa.media}.</p><label><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} /> I reviewed this exact version, including all media, copy, licensing and slots.</label><button disabled={!current || busy || !confirm || !!approved} onClick={() => void send("approve")}>Approve v{version.number} for review only</button></section>
      {version.content.qa.technical === "NEEDS REVIEW" && <section className={styles.card}><h2>Review changed copy</h2><p>Check technical claims, boundaries, provenance and required attribution before marking revised copy ready. This records your review in a new version; it does not approve the batch.</p><textarea aria-label="Technical and rights review note" value={text} onChange={e => setText(e.target.value)} maxLength={3000} /><button disabled={!current || busy || !confirm || !text.trim()} onClick={() => void send("review")}>Record technical and rights review</button></section>}
      <section className={styles.card}><h2>Change history</h2>{state?.versions.map(v => <p key={v.number}>v{v.number} · {v.createdAt} · {v.reason}</p>)}{state?.actions.map(a => <p key={a.requestId}>{a.at} · {a.action} · v{a.version} · {a.text || "Authenticated owner approved exact digest"}</p>)}</section>
    </>}
  </div>;
}
