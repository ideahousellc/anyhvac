import type { ReviewContent } from "./types";
export const FIXTURE_FILENAME = "weekly-content-original-v1.json";
export const FIXTURE_DIGEST = "bf590a8eec33de4c4c6627c2fab6053fe71f5827c7698adbe18600e2743bd433";
export const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export async function parseFixtureFile(name: string, text: string): Promise<ReviewContent> {
  if (name !== FIXTURE_FILENAME || new TextEncoder().encode(text).length > 1900000) throw Error("Select only the original weekly-content-original-v1.json file (under 1.9 MB).");
  let content: ReviewContent; try { content = JSON.parse(text); } catch { throw Error("The selected file is not valid JSON."); }
  if (content?.batchId !== "anyhvac-week-2026-10-12" || content.agentId !== "anyhvac.george" || content.fixture !== true || content.packages?.length !== 5 || content.posts?.length !== 13 || content.media?.length !== 20) throw Error("Expected original October 12–17 content: 5 packages, 13 posts and 20 assets. Review state/approval files are not accepted.");
  const bytes = new TextEncoder().encode(canonical(content));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(x => x.toString(16).padStart(2, "0")).join("");
  if (hash !== FIXTURE_DIGEST) throw Error("This file differs from the reviewed original version. Nothing was imported.");
  return content;
}
