import { describe, it, expect, vi } from "vitest";
import { readFileSync, mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { bufferClient, CREATE_POST } from "../client.mjs";
import { validatePackage, packageDigest, operation, duplicateReasons, prepare, easternTime, scheduleApprovedBatch, readRecords } from "../scheduler.mjs";

const example = JSON.parse(readFileSync(new URL("../dry-run-example.json", import.meta.url), "utf8"));
function fixture() {
  const b = structuredClone(example);
  b.posts[0].scheduled_at = easternTime(new Date(Date.now() + 7 * 86400_000));
  b.approval = { decision: "APPROVED", owner: "Cesar", approved_at: new Date(Date.now() - 1000).toISOString(), evidence: "SYNTHETIC TEST ONLY — no real approval", package_sha256: packageDigest(b) };
  return b;
}
const media = readFileSync(new URL("../../../../public/images/hero/Ductwork.png", import.meta.url));
const hosted = async (_url, options) => options?.method === "HEAD" ? new Response(null) : new Response(media, { headers: { "content-type": "image/png" } });
function mockClient(b, queue = []) {
  const p = b.posts[0];
  return { channels: vi.fn(async () => [{ id: p.channel_id, service: p.platform, organizationId: "test-org", timezone: "America/New_York", isDisconnected: false, isLocked: false, isQueuePaused: false }]), posts: vi.fn(async () => queue), request: vi.fn() };
}
const auth = (b) => ({ decision: "AUTHORIZE LIVE SCHEDULING", owner: "Cesar", authorized_at: new Date(Date.now() - 1000).toISOString(), evidence: "SYNTHETIC TEST ONLY", package_sha256: packageDigest(b) });

describe("controlled Buffer scheduling", () => {
  it("refuses unapproved packages before provider access", async () => {
    const client = mockClient(example);
    await expect(prepare(example, { client, records: [], fetcher: hosted })).rejects.toThrow("approval");
    expect(client.channels).not.toHaveBeenCalled();
  });
  it.each(["caption", "channel_id", "scheduled_at", "destination_url"])("binds approval to exact %s", (field) => {
    const b = fixture(); b.posts[0][field] += "changed";
    expect(() => validatePackage(b)).toThrow("changed since owner approval");
  });
  it("rejects altered media bytes", () => {
    const b = fixture(); b.posts[0].media[0].sha256 = "0".repeat(64); b.approval.package_sha256 = packageDigest(b);
    expect(() => validatePackage(b)).toThrow("Local media changed");
  });
  it("checks Eastern DST, invalid dates and future-only times", () => {
    const b = fixture();
    for (const time of ["2099-01-05T17:00:00-04:00", "2099-02-30T17:00:00-05:00", "2020-01-05T17:00:00-05:00"]) {
      b.posts[0].scheduled_at = time; b.approval.package_sha256 = packageDigest(b);
      expect(() => validatePackage(b)).toThrow();
    }
    expect(easternTime("2026-11-02T22:00:00Z")).toBe("2026-11-02T17:00:00-05:00");
  });
  it("detects live slot, normalized caption and media duplicates", () => {
    const p = fixture().posts[0];
    expect(duplicateReasons(p, [{ id: "provider", channelId: p.channel_id, text: ` ${p.caption.toUpperCase()} `, dueAt: new Date(p.scheduled_at).toISOString(), assets: [{ source: p.media[0].url }] }], [])).toHaveLength(3);
  });
  it("detects local manual records, hashes and ambiguous attempts", () => {
    const p = fixture().posts[0];
    for (const item of [{ scheduled_at: p.scheduled_at }, { approved_media_references: p.media }, { post_id: p.post_id, publication_status: "ATTEMPTING" }]) {
      expect(duplicateReasons(p, [], [{ platform: p.platform, ...item }])).toHaveLength(1);
    }
  });
  it("reads queue before media and makes no dry-run mutation", async () => {
    const b = fixture(), client = mockClient(b), order = [];
    client.posts.mockImplementation(async () => { order.push("queue"); return []; });
    const plan = await prepare(b, { client, records: [], fetcher: async (...args) => { order.push("url"); return hosted(...args); } });
    expect(order[0]).toBe("queue"); expect(client.request).not.toHaveBeenCalled();
    expect(plan.plans[0].operation.variables.input).toMatchObject({ mode: "customScheduled", dueAt: new Date(b.posts[0].scheduled_at).toISOString(), needsApproval: false });
  });
  it("refuses duplicate queue candidates before media fetch", async () => {
    const b = fixture(), p = b.posts[0], fetcher = vi.fn();
    const client = mockClient(b, [{ id: "existing", channelId: p.channel_id, dueAt: p.scheduled_at, text: "other caption", assets: [] }]);
    await expect(prepare(b, { client, records: [], fetcher })).rejects.toThrow("occupied");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses changed media, broken links and new hosts", async () => {
    const b = fixture(), client = mockClient(b);
    await expect(prepare(b, { client, records: [], fetcher: async (_url, options) => options?.method === "HEAD" ? new Response(null) : new Response("bad", { headers: { "content-type": "image/png" } }) })).rejects.toThrow("Hosted bytes");
    await expect(prepare(b, { client, records: [], fetcher: async () => new Response(null, { status: 404 }) })).rejects.toThrow("Destination link");
    b.posts[0].media[0].url = "https://unapproved.example/image.png"; b.approval.package_sha256 = packageDigest(b);
    expect(() => validatePackage(b)).toThrow("host");
  });
  it("refuses paused channels", async () => {
    const b = fixture(), client = mockClient(b);
    client.channels.mockResolvedValue([{ id: b.posts[0].channel_id, service: "linkedin", timezone: "America/New_York", isQueuePaused: true }]);
    await expect(prepare(b, { client, records: [], fetcher: hosted })).rejects.toThrow("paused");
    expect(client.request).not.toHaveBeenCalled();
  });
  it("default client blocks every mutation without network access", async () => {
    const fetcher = vi.fn(), client = bufferClient("synthetic-key", { fetcher });
    await expect(client.request(CREATE_POST, operation(fixture().posts[0]).variables)).rejects.toThrow("disabled");
    await expect(client.request("mutation Delete { deletePost }", {})).rejects.toThrow("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("redacts credentials in API errors", async () => {
    const client = bufferClient("synthetic-key", { fetcher: async () => new Response(JSON.stringify({ errors: [{ message: "synthetic-key rejected" }] })) });
    await expect(client.request("query Test { account { id } }", {})).rejects.toThrow("[REDACTED] rejected");
  });
  it("paginates and refuses repeated cursors", async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: { posts: { edges: [], pageInfo: { hasNextPage: ++calls < 2, endCursor: "cursor" } } } })));
    expect(await bufferClient("synthetic-key", { fetcher }).posts({ id: "channel", organizationId: "org" })).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const looping = bufferClient("synthetic-key", { fetcher: async () => new Response(JSON.stringify({ data: { posts: { edges: [], pageInfo: { hasNextPage: true, endCursor: "same" } } } })) });
    await expect(looping.posts({ id: "channel", organizationId: "org" })).rejects.toThrow("did not advance");
  });
  it("requires separate live authorization", async () => {
    const b = fixture(), client = mockClient(b);
    await expect(scheduleApprovedBatch(b, { client })).rejects.toThrow("live scheduling authorization");
    expect(client.channels).not.toHaveBeenCalled();
  });
  it("enforces the weekly 5/5/3 calendar and approved week", () => {
    const b = fixture(); b.kind = "weekly"; b.week_start = b.posts[0].scheduled_at.slice(0, 10);
    b.approval.package_sha256 = packageDigest(b);
    expect(() => validatePackage(b)).toThrow("5 LinkedIn / 5 Instagram / 3 YouTube");
  });
  it("preserves Instagram carousel order and explicit reel settings", () => {
    const p = structuredClone(fixture().posts[0]); p.platform = "instagram"; p.channel_id = "6abd5952ea19ca0bde37267c";
    p.instagram = { type: "post", shouldShareToFeed: true, isAiGenerated: false };
    p.media.push({ ...p.media[0], url: "https://www.anyhvac.net/social/second.png" });
    const input = operation(p).variables.input;
    expect(input.assets.map((a) => a.image.url)).toEqual(p.media.map((m) => m.url));
    expect(input.metadata.instagram).toEqual(p.instagram);
    p.instagram.type = "reel"; p.media = [{ kind: "video", url: "https://www.anyhvac.net/social/reel.mp4" }];
    expect(operation(p).variables.input).toMatchObject({ metadata: { instagram: { type: "reel" } }, assets: [{ video: { url: p.media[0].url } }] });
  });
  it("preserves explicit YouTube title and publishing metadata", () => {
    const p = structuredClone(fixture().posts[0]); p.platform = "youtube"; p.channel_id = "6abd5b46ea19ca0bde375392";
    p.media = [{ kind: "video", url: "https://www.anyhvac.net/social/short.mp4" }];
    p.youtube = { title: "Approved test title", categoryId: "28", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", isAiGenerated: false };
    expect(operation(p).variables.input.metadata.youtube).toEqual(p.youtube);
    expect(operation(p).variables.input.assets).toEqual([{ video: { url: p.media[0].url } }]);
  });
  it("does not label provider drafts as successfully scheduled", async () => {
    const dir = mkdtempSync(resolve(tmpdir(), "anyhvac-buffer-test-")), ledger = resolve(dir, "records.jsonl");
    try {
      const b = fixture(), client = mockClient(b), p = b.posts[0];
      client.request.mockResolvedValue({ createPost: { __typename: "PostActionSuccess", post: { id: "mock-draft", channelId: p.channel_id, text: p.caption, dueAt: p.scheduled_at, status: "draft" } } });
      await expect(scheduleApprovedBatch(b, { authorization: auth(b), client, fetcher: hosted, ledger })).rejects.toThrow("not confirmed");
      const rows = readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse);
      expect(rows.at(-1)).toMatchObject({ publication_status: "RECONCILIATION REQUIRED", buffer_post_id: "mock-draft", provider_status: "draft" });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("journals before mocked creation and records confirmed Eastern time", async () => {
    const dir = mkdtempSync(resolve(tmpdir(), "anyhvac-buffer-test-")), ledger = resolve(dir, "records.jsonl");
    try {
      const b = fixture(), client = mockClient(b), p = b.posts[0];
      client.request.mockImplementation(async () => {
        expect(JSON.parse(readFileSync(ledger, "utf8").trim()).publication_status).toBe("ATTEMPTING");
        return { createPost: { __typename: "PostActionSuccess", post: { id: "mock-provider-id", channelId: p.channel_id, text: p.caption, dueAt: new Date(p.scheduled_at).toISOString(), status: "scheduled" } } };
      });
      const records = await scheduleApprovedBatch(b, { authorization: auth(b), client, fetcher: hosted, ledger });
      expect(records[0]).toMatchObject({ buffer_post_id: "mock-provider-id", scheduled_at: p.scheduled_at, publication_status: "SCHEDULED", published_at: null });
      expect(client.posts).toHaveBeenCalledTimes(2);
      await expect(scheduleApprovedBatch(b, { authorization: auth(b), client, fetcher: hosted, ledger })).rejects.toThrow("duplicate");
      expect(client.request).toHaveBeenCalledTimes(1); expect(existsSync(`${ledger}.lock`)).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("ambiguous mocked creation blocks retries with an empty queue", async () => {
    const dir = mkdtempSync(resolve(tmpdir(), "anyhvac-buffer-test-")), ledger = resolve(dir, "records.jsonl");
    try {
      const b = fixture(), client = mockClient(b); client.request.mockRejectedValue(new Error("timeout"));
      await expect(scheduleApprovedBatch(b, { authorization: auth(b), client, fetcher: hosted, ledger })).rejects.toThrow("Unconfirmed");
      await expect(scheduleApprovedBatch(b, { authorization: auth(b), client, fetcher: hosted, ledger })).rejects.toThrow("duplicate");
      expect(client.request).toHaveBeenCalledTimes(1);
      writeFileSync(ledger, "broken"); expect(() => readRecords(ledger)).toThrow("ledger unreadable");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
