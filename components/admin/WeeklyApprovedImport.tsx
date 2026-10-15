"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import type { ReviewMedia, ReviewState } from "@/lib/weekly/types";
import { APPROVED_CONTENT_DIGEST } from "@/lib/weekly/approved-batch";
import styles from "./WeeklyReview.module.css";
const endpoint = "/api/admin/weekly/approved-import", pendingKey = "anyhvac.weekly.oct19.import-unconfirmed";
export function WeeklyApprovedImport({ onImported }: { onImported: (state?: ReviewState) => void }) {
  const [media, setMedia] = useState<ReviewMedia[]>([]), [files, setFiles] = useState<Map<string, File> | null>(null);
  const [ready, setReady] = useState(false), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState(""), [progress, setProgress] = useState("");
  const active = useRef(false), callback = useRef(onImported);
  useEffect(() => { callback.current = onImported; }, [onImported]);
  const status = useCallback(async () => {
    setReady(false); setError("");
    try {
      const r = await fetch(endpoint, { cache: "no-store" }), data = await r.json(); if (!r.ok) throw Error(data.error);
      if (data.digest !== APPROVED_CONTENT_DIGEST || data.revision !== 5 || data.executionEnabled !== false) throw Error("Unexpected import identity; stop.");
      if (data.alreadyImported) { setDone(true); setUncertain(false); sessionStorage.removeItem(pendingKey); callback.current(); }
      else { setMedia(data.media); setReady(true); }
    } catch (e) { setError(String(e)); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { try { setUncertain(sessionStorage.getItem(pendingKey) === "true"); } catch { setUncertain(true); } void status(); }, 0); return () => clearTimeout(timer); }, [status]);
  async function select(selected: FileList | null) {
    if (!selected || active.current) return;
    active.current = true; setBusy(true); setFiles(null); setConfirmed(false); setError("");
    try {
      if (selected.length !== media.length) throw Error(`Select exactly ${media.length} media files from the prepared private packet, including the archived original video.`);
      const checked = new Map<string, File>();
      for (const file of Array.from(selected)) {
        if (file.size > 2000000) throw Error("A selected file exceeds the reviewed upload limit.");
        const bytes = await file.arrayBuffer(), digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(x => x.toString(16).padStart(2, "0")).join("");
        const expected = media.find(m => m.id === digest);
        if (!expected || expected.bytes !== file.size || checked.has(digest)) throw Error("Selected files differ from the exact approved media inventory.");
        checked.set(digest, file);
      }
      setFiles(checked);
    } catch (e) { setError(String(e)); } finally { setBusy(false); active.current = false; }
  }
  async function submit() {
    if (!files || !confirmed || !ready || uncertain || active.current) return;
    active.current = true; setBusy(true); setError("");
    try {
      sessionStorage.setItem(pendingKey, "true"); setUncertain(true);
      for (let i = 0; i < media.length; i++) {
        const m = media[i]; setProgress(`Verifying private upload ${i + 1} of ${media.length}`);
        const r = await fetch(endpoint + "?media=" + m.id, { method: "POST", headers: { "Content-Type": m.type }, body: files.get(m.id) }), data = await r.json();
        if (!r.ok || data.uploaded !== m.id || data.executionEnabled !== false) throw Error(data.error ?? "Upload acknowledgement unconfirmed.");
      }
      setProgress("Creating the pinned private review");
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finish" }) }), data = await r.json();
      if (!r.ok || data.state?.versions?.at(-1)?.digest !== APPROVED_CONTENT_DIGEST || data.executionEnabled !== false) throw Error(data.error ?? "Import acknowledgement unconfirmed.");
      sessionStorage.removeItem(pendingKey); setUncertain(false); setDone(true); callback.current(data.state);
    } catch (e) { setError(String(e)); } finally { setBusy(false); active.current = false; }
  }
  return <section className={styles.card} aria-label="Approved October 19 batch import"><h2>Import approved October 19–25 batch privately</h2>
    <p>Preserves revision 5 approval and earlier history. Uploads stay private; this does not schedule or publish.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {done ? <p role="status">The approved batch is already imported. Existing approval and history are preserved; repeat uploads are blocked.</p> : <>
      <label>Select all prepared media files<input type="file" multiple disabled={!ready || busy || uncertain} onChange={e => void select(e.target.files)} /></label>
      {files && <p>Verified: 20 approved assets plus the archived original video for revision 3.</p>}
      <label><input type="checkbox" checked={confirmed} disabled={!files || busy || uncertain} onChange={e => setConfirmed(e.target.checked)} /> Import this exact approved snapshot into private review storage only.</label>
      <button disabled={!files || !confirmed || !ready || busy || uncertain} onClick={() => void submit()}>Import approved batch privately once</button>
      {progress && <p role="status">{progress}</p>}
      {uncertain && <><p>A write acknowledgement is unconfirmed. Check status first. If the server confirms no review row exists, you may explicitly resume the same verified files; existing private objects are verified and never replaced. There is no automatic retry or cleanup.</p><button disabled={!ready || busy} onClick={() => { sessionStorage.removeItem(pendingKey); setUncertain(false); setFiles(null); setConfirmed(false); setProgress(""); setError(""); }}>Resume exact files after confirmed status</button></>}
    </>}
    <button disabled={busy} onClick={() => void status()}>Check private import status</button>
  </section>;
}
