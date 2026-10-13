"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FIXTURE_FILENAME, parseFixtureFile } from "@/lib/weekly/fixture-file";
import type { ReviewContent, ReviewState } from "@/lib/weekly/types";
import styles from "./WeeklyReview.module.css";
const PENDING = "anyhvac.weekly.import-unconfirmed";
export function WeeklyFixtureImport({ onImported }: { onImported: (state?: ReviewState) => void }) {
  const [content, setContent] = useState<ReviewContent | null>(null), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [done, setDone] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState("");
  const active = useRef(false), callback = useRef(onImported);
  useEffect(() => { callback.current = onImported; }, [onImported]);
  const [counts, setCounts] = useState<{ packages: number; posts: number; media: number } | null>(null);
  const check = useCallback(async () => {
    setReady(false);
    try { const r = await fetch("/api/admin/weekly/import", { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw Error(data.error); if (data.alreadyImported) { setCounts(data.counts); setDone(true); setUncertain(false); sessionStorage.removeItem(PENDING); callback.current(); } else { setReady(true); } }
    catch (e) { setError(String(e)); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { try { setUncertain(sessionStorage.getItem(PENDING) === "true"); } catch { setUncertain(true); } void check(); }, 0); return () => clearTimeout(timer); }, [check]);
  async function select(file?: File) {
    if (!file || active.current) return;
    setBusy(true); setContent(null); setConfirmed(false); setError("");
    try { if (file.size > 1900000) throw Error("The file is too large."); setContent(await parseFixtureFile(file.name, await file.text())); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function submit() {
    if (!content || !confirmed || !ready || uncertain || active.current) return;
    active.current = true; setBusy(true); setError("");
    try {
      sessionStorage.setItem(PENDING, "true"); setUncertain(true);
      const r = await fetch("/api/admin/weekly/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await r.json();
      if (!r.ok) { if (r.status < 500) { sessionStorage.removeItem(PENDING); setUncertain(false); } if (r.status === 409) await check(); throw Error(data.error); }
      const imported = data.state?.versions?.[0]?.content;
      if (imported?.packages?.length !== 5 || imported?.posts?.length !== 13 || imported?.media?.length !== 20 || data.state.actions.length !== 0) throw Error("Unexpected import result. Stop and reconcile.");
      sessionStorage.removeItem(PENDING); setUncertain(false); setCounts({ packages: imported.packages.length, posts: imported.posts.length, media: imported.media.length }); setDone(true); callback.current(data.state);
    } catch (e) { setError(String(e)); } finally { setBusy(false); active.current = false; }
  }
  return <section className={styles.card} aria-label="Temporary private fixture import"><h2>Import original weekly batch</h2>
    <p>Temporary owner-only import. This copies existing media into private review storage; it does not approve, schedule or publish content.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {done ? <p role="status">Batch imported: {counts?.packages} packages · {counts?.posts} posts · {counts?.media} media assets. Existing review history is preserved; further imports are blocked.</p> : <>
      <label>Select {FIXTURE_FILENAME}<input type="file" accept=".json,application/json" disabled={busy || uncertain || !ready} onChange={e => void select(e.target.files?.[0])} /></label>
      {content && <p>Validated original: <strong>5 packages · 13 posts · 20 media assets</strong> · approximately 17.2 MB private media.</p>}
      <label><input type="checkbox" checked={confirmed} disabled={!content || busy || uncertain} onChange={e => setConfirmed(e.target.checked)} /> I confirm importing this exact historical batch privately, without approving or publishing it.</label>
      <button disabled={!content || !confirmed || busy || uncertain || !ready} onClick={() => void submit()}>{busy ? "Importing…" : "Import privately once"}</button>
      {uncertain && <p>Import acknowledgement is unconfirmed. Do not import again. Check status; if it remains unconfirmed, stop for reconciliation.</p>}
      <button disabled={busy} onClick={() => void check()}>Check import status</button>
    </>}
  </section>;
}
