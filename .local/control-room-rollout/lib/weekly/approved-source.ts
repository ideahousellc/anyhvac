import "server-only";
import source from "../../growth/promotions/2026-10-19-25-approved/approved-review-state.json";
import { validateApprovedState } from "./approved-ingest";
import type { ReviewState } from "./types";
export function approvedSource() {
  const state = structuredClone(source) as unknown as ReviewState;
  validateApprovedState(state);
  return state;
}
export function approvedImportMedia() {
  const state = approvedSource();
  // Preserve the approved previous video for revision-3 private preview too.
  const candidates = [...state.versions[2].content.media, ...state.versions[4].content.media];
  return [...new Map(candidates.map(media => [media.id, media])).values()];
}
