import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { FIXTURE_DIGEST, FIXTURE_FILENAME, parseFixtureFile } from "../fixture-file";
import { digest } from "../domain";
it.skipIf(!process.env.WEEKLY_VALIDATION_PSQL)("accepts the exact original content regardless of JSON whitespace/key order", async () => {
  const manifest = JSON.parse(await readFile(".local/agent-inbox/weekly-production/weekly-content-original-v1.json", "utf8"));
  const content = await parseFixtureFile(FIXTURE_FILENAME, JSON.stringify(manifest)); expect(digest(content)).toBe(FIXTURE_DIGEST); expect(content.media).toHaveLength(20); expect(content.posts).toHaveLength(13); expect(content.packages).toHaveLength(5);
});
it("rejects wrong names, malformed JSON, state/approval packets and changed content", async () => {
  const original = { batchId: "anyhvac-week-2026-10-12", agentId: "anyhvac.george", fixture: true, packages: Array(5).fill({}), posts: Array.from({length:13}, () => ({ caption: "Unreviewed" })), media: Array(20).fill({}) }, text = JSON.stringify(original);
  await expect(parseFixtureFile("other.json", text)).rejects.toThrow("Select only"); await expect(parseFixtureFile(FIXTURE_FILENAME, "{")).rejects.toThrow("valid JSON");
  await expect(parseFixtureFile(FIXTURE_FILENAME, JSON.stringify({ versions: [{ content: original }], actions: [] }))).rejects.toThrow("Expected original");
  original.posts[0].caption += "Changed"; await expect(parseFixtureFile(FIXTURE_FILENAME, JSON.stringify(original))).rejects.toThrow("differs");
  await expect(parseFixtureFile(FIXTURE_FILENAME, " ".repeat(1900001))).rejects.toThrow("under 1.9 MB");
});
