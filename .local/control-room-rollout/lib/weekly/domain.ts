import { createHash } from "node:crypto";
import type { ReviewAction, ReviewContent, ReviewState, ReviewVersion } from "./types";
import { APPROVED_BATCH_ID, APPROVED_CONTENT_DIGEST } from "./approved-batch";
export class ReviewError extends Error { status: number; constructor(message: string, status = 409) { super(message); this.status = status; } }
export const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function validate(content: ReviewContent) {
  const fail = (message: string) => { throw new ReviewError(message, 422); };
  const approvedNonFixture = content.fixture === false && content.batchId === APPROVED_BATCH_ID && digest(content) === APPROVED_CONTENT_DIGEST;
  if (content.agentId !== "anyhvac.george" || (content.fixture !== true && !approvedNonFixture) || content.timezone !== "America/New_York") fail("Invalid batch identity.");
  if (content.packages.length !== 5 || content.posts.length !== 13 || ["linkedin", "instagram", "youtube"].some((p, i) => content.posts.filter(post => post.platform === p).length !== [5, 5, 3][i])) fail("Five packages and 5/5/3 adaptations required.");
  if (new Set(content.packages.map(p => p.id)).size !== 5 || new Set(content.posts.map(p => p.id)).size !== 13 || new Set(content.media.map(m => m.id)).size !== content.media.length) fail("Duplicate identifiers.");
  for (const p of content.packages) {
    if (!p.title || !p.purpose || !p.primaryMetric || !p.technicalBoundary || !p.provenance.length || p.provenance.some(r => !r.source || !r.license || !r.evidence.length || r.evidence.some(e => !/^[a-f0-9]{64}$/.test(e)))) fail("Missing provenance, licensing or package evidence.");
    const posts = content.posts.filter(post => post.packageId === p.id);
    if (posts.length < 2 || !posts.some(post => post.platform === "linkedin") || !posts.some(post => post.platform === "instagram")) fail("Package adaptations missing.");
  }
  for (const post of content.posts) {
    if (!content.packages.some(p => p.id === post.packageId) || !post.caption.trim() || post.caption.length > 12000 || !post.title || !post.channelId || !Number.isFinite(Date.parse(post.scheduledAt))) fail("Incomplete post.");
    let url; try { url = new URL(post.destination); } catch { fail("Invalid destination."); }
    if (url!.protocol !== "https:" || url!.hostname !== "www.anyhvac.net") fail("Invalid destination.");
    if (!post.media.length || post.media.some(id => !content.media.some(m => m.id === id))) fail("Missing required media.");
    if (post.platform === "youtube" && (!post.settings.youtube || post.media.length !== 1)) fail("YouTube settings missing.");
    if (post.platform === "instagram" && !post.settings.instagram) fail("Instagram settings missing.");
  }
  for (const m of content.media) if (!/^[a-f0-9]{64}$/.test(m.id) || m.id !== m.sha256 || !Number.isSafeInteger(m.bytes) || m.bytes < 1 || !["image/png", "video/mp4"].includes(m.type)) fail("Invalid media identity.");
  if ([content.qa.technical, content.qa.rights, content.qa.media].some(x => x !== "PASS") || !content.qa.evidence.length || content.qa.evidence.some(e => !/^[a-f0-9]{64}$/.test(e))) fail("Technical, rights and media QA evidence required.");
}
export function verify(state: ReviewState) {
  if (!state.versions.length || state.versions.some((v, i) => v.number !== i + 1 || v.digest !== digest(v.content))) throw new ReviewError("Stored version integrity failed. No changes made.", 503);
}
export function current(state: ReviewState): ReviewVersion { verify(state); return state.versions.at(-1)!; }
export function approved(state: ReviewState, version: ReviewVersion) { return !state.actions.some(a => a.version === version.number && a.action === "revision") && state.actions.some(a => a.action === "approve" && a.version === version.number && a.digest === version.digest); }
export function apply(state: ReviewState, action: ReviewAction) {
  verify(state);
  const previous = state.actions.find(a => a.requestId === action.requestId);
  if (previous) { if (canonical({ ...previous, at: "" }) !== canonical({ ...action, at: "" })) throw new ReviewError("Request ID already used for another action."); return; }
  if (state.actions.length >= 200 || state.versions.length >= 50) throw new ReviewError("Review capacity reached.");
  const version = current(state);
  if (action.version !== version.number || action.digest !== version.digest) throw new ReviewError("Batch changed. Refresh and review the current version.");
  if (action.action === "approve") {
    validate(version.content);
    if (state.actions.some(a => a.version === version.number && a.action === "revision")) throw new ReviewError("Revision requests require a new version before approval.");
  } else if (action.action === "review") {
    if (!action.text?.trim() || action.text.length > 3000 || version.content.qa.technical !== "NEEDS REVIEW") throw new ReviewError("Changed copy and explicit technical/rights review note required.", 400);
    const content = structuredClone(version.content);
    content.qa.technical = "PASS";
    content.qa.evidence.push(digest({ reviewer: "authenticated owner", version: version.number, digest: version.digest, note: action.text }));
    validate(content);
    state.versions.push({ number: version.number + 1, digest: digest(content), createdAt: action.at, reason: "Owner technical/rights review: " + action.text, content });
  } else {
    if (!action.text?.trim() || action.text.length > 3000 || !version.content.posts.some(p => p.id === action.target)) throw new ReviewError("Select a post and describe the revision.", 400);
    if (action.action === "edit") {
      if (!action.caption?.trim() || action.caption.length > 12000) throw new ReviewError("Caption required.", 400);
      const content = structuredClone(version.content); content.posts.find(p => p.id === action.target)!.caption = action.caption;
      if (digest(content) === version.digest) throw new ReviewError("The proposed content is unchanged.");
      // Changed content requires fresh technical/rights/media review, never inherited PASS.
      content.qa = { ...content.qa, technical: "NEEDS REVIEW" };
      state.versions.push({ number: version.number + 1, digest: digest(content), createdAt: action.at, reason: action.text, content });
    }
  }
  state.actions.push(action);
}
