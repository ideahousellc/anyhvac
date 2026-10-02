import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync, mkdirSync, openSync, closeSync, appendFileSync, unlinkSync, fsyncSync } from "node:fs";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bufferClient, loadKey, CREATE_POST, ENDPOINT } from "./client.mjs";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const CHANNELS = Object.freeze({
  linkedin: "6abd5811ea19ca0bde3709e4", instagram: "6abd5952ea19ca0bde37267c", youtube: "6abd5b46ea19ca0bde375392",
});
const LEDGER = resolve(ROOT, "growth/distribution/buffer/records.jsonl");
const TIMEZONE = "America/New_York";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
export const digest = (value) => sha256(canonical(value));
const normalized = (text) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export const easternTime = (value) => {
  const date = new Date(value);
  assert(Number.isFinite(date.getTime()), "Invalid scheduled date.");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset",
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
};
function httpsUrl(value, media = false) {
  const url = new URL(value);
  assert(url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.port, "URL must be plain HTTPS without credentials, port or fragment.");
  assert(url.hostname === "www.anyhvac.net", "Only the existing AnyHVAC host is allowed; a new media host needs owner approval and a reviewed allowlist change.");
  if (media) assert(!url.search, "Media URLs must be stable, without signed/expiring query strings.");
  return url;
}
function localFile(path) {
  assert(typeof path === "string" && !isAbsolute(path), "Media paths must be repository-relative.");
  const full = realpathSync(resolve(ROOT, path));
  const rel = relative(realpathSync(ROOT), full);
  assert(rel && !rel.startsWith("..") && !isAbsolute(rel) && (rel.startsWith("growth\\") || rel.startsWith("growth/") || rel.startsWith("public\\") || rel.startsWith("public/")), "Media file must remain inside growth/ or public/.");
  return full;
}
export function validatePackage(batch, { now = Date.now(), requireApproval = true } = {}) {
  assert(batch?.schema_version === 1 && typeof batch.batch_id === "string" && batch.batch_id && typeof batch.batch_version === "string" && batch.batch_version, "Package needs schema version 1 and batch identity/version.");
  assert(batch.timezone === TIMEZONE && ["weekly", "single-test"].includes(batch.kind), "Package needs Eastern timezone and weekly/single-test kind.");
  assert(Array.isArray(batch.posts) && batch.posts.length > 0, "Package has no posts.");
  if (requireApproval) {
    const a = batch.approval;
    assert(a?.decision === "APPROVED" && a.owner === "Cesar" && typeof a.evidence === "string" && a.evidence.trim() && Number.isFinite(Date.parse(a.approved_at)) && Date.parse(a.approved_at) <= now, "Explicit owner approval and evidence required.");
    assert(a.package_sha256 === packageDigest(batch), "Package changed since owner approval; review again.");
  }
  const ids = new Set();
  for (const post of batch.posts) {
    assert(typeof post.post_id === "string" && post.post_id && !ids.has(post.post_id), "Missing or duplicate local post ID."); ids.add(post.post_id);
    assert(Object.hasOwn(CHANNELS, post.platform) && CHANNELS[post.platform] === post.channel_id, "Intended platform/channel ID mismatch.");
    assert(typeof post.caption === "string" && post.caption.trim() && !/\{\{|\}\}/.test(post.caption), "Exact non-placeholder caption required.");
    httpsUrl(post.destination_url);
    assert(typeof post.link_wording === "string" && post.link_wording && post.caption.includes(post.link_wording), "Approved link/CTA wording must appear in caption.");
    if (post.platform === "linkedin") assert(post.caption.includes(post.destination_url), "LinkedIn caption must include the exact destination URL.");
    const inlineLinks = post.caption.match(/https:\/\/[^\s]+/g) || [];
    assert(inlineLinks.every((link) => link === post.destination_url), "Unexpected caption link; review exact destination.");
    assert(typeof post.scheduled_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(post.scheduled_at) && easternTime(post.scheduled_at) === post.scheduled_at, "Time must be an exact valid Eastern ISO timestamp including DST offset.");
    assert(Date.parse(post.scheduled_at) > now + 5 * 60_000, "Post must be at least five minutes in the future.");
    assert(post.technical_review === "PASS" && post.rights_review === "PASS", "Technical and media rights review must pass.");
    assert(typeof post.ai_assisted === "boolean", "AI assistance setting must be explicit.");
    assert(Array.isArray(post.media) && post.media.length > 0 && post.media.every((m) => ["image", "video"].includes(m.kind)), "Image/video media required.");
    const videos = post.media.filter((m) => m.kind === "video").length;
    assert(videos === 0 || (videos === 1 && post.media.length === 1), "Only one video or an ordered image carousel is supported.");
    if (post.platform === "youtube") {
      assert(videos === 1 && typeof post.youtube?.title === "string" && post.youtube.title.trim(), "YouTube needs one video and approved title.");
      assert(["1", "2", "10", "15", "17", "19", "20", "22", "23", "24", "25", "26", "27", "28", "29"].includes(post.youtube.categoryId), "Approved YouTube category required.");
      assert(["public", "private", "unlisted"].includes(post.youtube.privacy) && typeof post.youtube.madeForKids === "boolean" && typeof post.youtube.notifySubscribers === "boolean" && typeof post.youtube.embeddable === "boolean" && ["youtube", "creativeCommon"].includes(post.youtube.license) && typeof post.youtube.isAiGenerated === "boolean", "Explicit approved YouTube publication settings required.");
      assert(Object.keys(post.youtube).every((k) => ["title", "categoryId", "privacy", "madeForKids", "notifySubscribers", "embeddable", "license", "isAiGenerated"].includes(k)), "Unsupported YouTube setting; review integration before use.");
    }
    if (post.platform === "instagram") {
      assert(post.instagram?.type === (videos ? "reel" : "post") && typeof post.instagram.shouldShareToFeed === "boolean" && typeof post.instagram.isAiGenerated === "boolean", "Explicit approved Instagram post/reel settings required.");
      assert(Object.keys(post.instagram).every((k) => ["type", "shouldShareToFeed", "isAiGenerated"].includes(k)), "Unsupported Instagram setting; review integration before use.");
    }
    for (const media of post.media) {
      httpsUrl(media.url, true);
      assert(/^[a-f0-9]{64}$/.test(media.sha256), "Each asset requires its exact SHA-256.");
      assert(sha256(readFileSync(localFile(media.path))) === media.sha256, "Local media changed since review.");
      if (media.kind === "image") assert(typeof media.alt_text === "string" && media.alt_text.trim(), "Approved image alt text required.");
      assert(typeof media.preview_review === "string" && media.preview_review.trim(), "Crop/audio/preview review evidence required.");
    }
  }
  if (batch.kind === "single-test") assert(batch.posts.length === 1, "Single test accepts exactly one post.");
  if (batch.kind === "weekly") {
    const counts = Object.fromEntries(Object.keys(CHANNELS).map((p) => [p, batch.posts.filter((post) => post.platform === p).length]));
    assert(counts.linkedin === 5 && counts.instagram === 5 && counts.youtube === 3, "Weekly calendar requires 5 LinkedIn / 5 Instagram / 3 YouTube posts.");
    assert(new Set(batch.posts.map((p) => p.package_id)).size === 5 && batch.posts.every((p) => typeof p.package_id === "string" && p.package_id), "Weekly batch requires five named packages.");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(batch.week_start), "Weekly batch requires week_start.");
    const start = Date.parse(`${batch.week_start}T00:00:00Z`);
    assert(Number.isFinite(start), "Invalid week_start.");
    for (const post of batch.posts) {
      const day = Date.parse(`${post.scheduled_at.slice(0, 10)}T00:00:00Z`);
      assert(day >= start && day < start + 7 * 86400_000, "Post falls outside approved week.");
    }
  }
  return batch;
}
export function packageDigest(batch) {
  const { approval: _approval, ...content } = batch;
  void _approval;
  return digest(content);
}
export function operation(post) {
  const select = (object, keys) => Object.fromEntries(keys.map((key) => [key, object[key]]));
  const metadata = post.platform === "instagram" ? { instagram: select(post.instagram, ["type", "shouldShareToFeed", "isAiGenerated"]) } : post.platform === "youtube" ? { youtube: select(post.youtube, ["title", "categoryId", "privacy", "madeForKids", "notifySubscribers", "embeddable", "license", "isAiGenerated"]) } : undefined;
  return {
    query: CREATE_POST,
    variables: { input: {
      channelId: post.channel_id, text: post.caption, schedulingType: "automatic", mode: "customScheduled",
      dueAt: new Date(post.scheduled_at).toISOString(), needsApproval: false, saveToDraft: false, aiAssisted: post.ai_assisted,
      assets: post.media.map((m) => ({ [m.kind]: { url: m.url, ...(m.kind === "image" ? { metadata: { altText: m.alt_text } } : {}) } })),
      ...(metadata ? { metadata } : {}),
    } },
  };
}
export function duplicateReasons(post, queue, records) {
  const matches = [];
  for (const item of queue) {
    if (item.channelId !== post.channel_id) continue;
    if (item.dueAt && Date.parse(item.dueAt) === Date.parse(post.scheduled_at)) matches.push(`Queue slot occupied (${item.id}).`);
    if (normalized(item.text) === normalized(post.caption)) matches.push(`Queue/history caption duplicate (${item.id}).`);
    if (item.assets?.some((a) => post.media.some((m) => a.source === m.url))) matches.push(`Queue/history media duplicate (${item.id}).`);
  }
  for (const record of records) {
    if (record.platform !== post.platform && record.platform !== (post.platform === "youtube" ? "youtube-short" : post.platform)) continue;
    if (record.destination_channel_id && record.destination_channel_id !== post.channel_id) continue;
    if (record.post_id === post.post_id || (record.scheduled_at && Date.parse(record.scheduled_at) === Date.parse(post.scheduled_at)) || (record.caption && normalized(record.caption) === normalized(post.caption)) || record.approved_media_references?.some((m) => post.media.some((asset) => m.sha256 === asset.sha256))) matches.push(`Local scheduling/attempt record duplicate (${record.post_id || record.buffer_post_id || "manual record"}).`);
  }
  return matches;
}
export function readRecords(ledger = LEDGER) {
  const records = [];
  // Import existing manual/provider records; never modify them or invent missing provider IDs.
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "publication-record.json") {
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (Array.isArray(data.platform_publications)) {
          for (const record of data.platform_publications.filter((r) => r.scheduled_at || r.buffer_post_id || r.published_at)) {
            const media = record.asset ? (data.media_retention || []).filter((m) => m.path.replaceAll("\\", "/").endsWith(`/${record.asset}`)) : [];
            records.push({ ...record, approved_media_references: record.approved_media_references || media });
          }
        } else if (data.scheduled_at || data.buffer_post_id || data.published_at) records.push(data);
      }
    }
  }
  walk(resolve(ROOT, "growth/promotions")); walk(resolve(ROOT, "growth/campaigns"));
  try {
    for (const line of readFileSync(ledger, "utf8").split(/\r?\n/).filter(Boolean)) records.push(JSON.parse(line));
  } catch (error) { if (error.code !== "ENOENT") throw new Error("Scheduling ledger unreadable; reconcile before retry."); }
  return records;
}
async function checkHostedMedia(post, fetcher) {
  for (const media of post.media) {
    let response;
    try { response = await fetcher(media.url, { redirect: "error", signal: AbortSignal.timeout(60_000) }); }
    catch { throw new Error("Hosted media unavailable (network/redirect/timeout)."); }
    assert(response.ok && (response.headers.get("content-type") || "").split(";")[0] === (media.kind === "image" ? "image/png" : "video/mp4"), "Hosted media must return HTTP success and image/png or video/mp4.");
    const max = 100 * 1024 * 1024; // Local safety cap, not a claimed Buffer/network limit.
    if (Number(response.headers.get("content-length")) > max) { await response.body?.cancel(); throw new Error("Media exceeds local 100 MiB safety cap."); }
    const hash = createHash("sha256"); let size = 0;
    assert(response.body, "Hosted media body missing.");
    for await (const chunk of response.body) { size += chunk.length; assert(size <= max, "Media exceeds local 100 MiB safety cap."); hash.update(chunk); }
    assert(size > 0 && hash.digest("hex") === media.sha256, "Hosted bytes differ from approved media.");
  }
}
export async function prepare(batch, { client, records = readRecords(), fetcher = fetch, requireApproval = true, now = Date.now() } = {}) {
  validatePackage(batch, { now, requireApproval });
  const channels = await client.channels();
  const plans = [], considered = [...records];
  for (const post of batch.posts) {
    const channel = channels.find((c) => c.id === post.channel_id && c.service === post.platform);
    assert(channel && channel.timezone === TIMEZONE, "Intended channel missing or channel timezone changed.");
    assert(channel.isDisconnected === false && channel.isLocked === false && channel.isQueuePaused === false, "Channel disconnected, locked or queue paused.");
    const queue = await client.posts(channel); // No candidate API operation is constructed before this read.
    const duplicates = duplicateReasons(post, queue, considered);
    assert(duplicates.length === 0, duplicates.join(" "));
    let destination;
    try { destination = await fetcher(post.destination_url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(20_000) }); }
    catch { throw new Error("Destination link unreachable or redirects; review exact link."); }
    assert(destination.ok, "Destination link did not return HTTP success.");
    await checkHostedMedia(post, fetcher);
    const plan = { post_id: post.post_id, scheduled_at: post.scheduled_at, queue_checked_at: new Date().toISOString(), queue_count: queue.filter((p) => p.status === "scheduled").length, operation: operation(post) };
    plans.push(plan);
    considered.push({ ...post, destination_channel_id: post.channel_id, approved_media_references: post.media });
  }
  return { mode: requireApproval ? "APPROVED DRY RUN" : "UNAPPROVED EXAMPLE — NOT EXECUTABLE", endpoint: ENDPOINT, package_sha256: packageDigest(batch), plans };
}

// Future owner-authorized use only. No CLI execution switch is provided in this stage.
// A durable intent is written before the single create call; an ambiguous result blocks retries.
export async function scheduleApprovedBatch(batch, { authorization, client, fetcher = fetch, ledger = LEDGER } = {}) {
  const snapshot = structuredClone(batch);
  validatePackage(snapshot);
  assert(authorization?.decision === "AUTHORIZE LIVE SCHEDULING" && authorization.owner === "Cesar" && authorization.package_sha256 === packageDigest(snapshot) && typeof authorization.evidence === "string" && authorization.evidence.trim() && Number.isFinite(Date.parse(authorization.authorized_at)) && Date.parse(authorization.authorized_at) <= Date.now(), "Separate exact live scheduling authorization required.");
  const approvedInputs = new Set(snapshot.posts.map((post) => digest(operation(post).variables.input)));
  client ??= bufferClient(loadKey(), { authorizeCreate: (input) => approvedInputs.has(digest(input)) });
  mkdirSync(dirname(ledger), { recursive: true });
  const lock = `${ledger}.lock`; let handle;
  try { handle = openSync(lock, "wx"); } catch { throw new Error("Scheduling lock exists; reconcile interrupted/concurrent work before retry."); }
  const completed = [];
  const journal = (record) => {
    const fd = openSync(ledger, "a");
    try { appendFileSync(fd, `${JSON.stringify(record)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  };
  try {
    // All posts must pass before the first external write; recheck each one immediately before creating.
    await prepare(snapshot, { client, fetcher, records: readRecords(ledger) });
    for (const post of snapshot.posts) {
      validatePackage(snapshot);
      const single = { ...snapshot, kind: "single-test", posts: [post] };
      // Approval was verified against the full immutable snapshot; subsetting does not create a new approval.
      const { plans } = await prepare(single, { client, fetcher, requireApproval: false, records: readRecords(ledger) });
      const plan = plans[0];
      assert(Date.now() - Date.parse(plan.queue_checked_at) < 120_000 && Date.parse(post.scheduled_at) > Date.now() + 300_000, "Queue check stale or publication time too close; recheck.");
      const record = {
        post_id: post.post_id, batch_id: snapshot.batch_id, batch_version: snapshot.batch_version,
        platform: post.platform, destination_channel_id: post.channel_id,
        destination_channel_name: "AnyHVAC", approved_media_references: post.media,
        approved_caption_reference: sha256(post.caption), caption: post.caption,
        canonical_destination_url: post.destination_url, proposed_at: post.scheduled_at, timezone: TIMEZONE,
        queue_checked_at: plan.queue_checked_at, duplicate_check: "PASS", integration_blockers: [],
        publication_status: "ATTEMPTING", owner_approved_at: snapshot.approval.approved_at,
        buffer_post_id: null, scheduled_at: post.scheduled_at, published_at: null, public_url: null,
        package_sha256: packageDigest(snapshot), operation_sha256: digest(plan.operation),
      };
      journal(record);
      let data;
      try { data = await client.request(CREATE_POST, plan.operation.variables); }
      catch (error) { throw new Error(`Unconfirmed scheduling result for ${post.post_id}: ${client.redact ? client.redact(error.message) : "request failed"}. Durable attempt blocks retry; reconcile queue/history manually.`); }
      const result = data.createPost;
      const actual = result?.post;
      const confirmed = result?.__typename === "PostActionSuccess" && actual?.id && actual.channelId === post.channel_id && actual.status === "scheduled" && actual.text === post.caption && Date.parse(actual.dueAt) === Date.parse(post.scheduled_at);
      const saved = { ...record, publication_status: confirmed ? "SCHEDULED" : "RECONCILIATION REQUIRED", buffer_post_id: actual?.id || null,
        scheduled_at: actual?.dueAt ? easternTime(actual.dueAt) : post.scheduled_at, provider_status: actual?.status || null,
        provider_checked_at: new Date().toISOString(), schedule_confirmation_source: confirmed ? "Buffer createPost exact response" : "Unconfirmed provider response; do not retry",
      };
      journal(saved);
      const providerError = typeof result?.message === "string" && client.redact ? ` ${client.redact(result.message)}` : "";
      assert(confirmed, `Scheduling not confirmed for ${post.post_id}; reconcile before retry.${providerError}`);
      completed.push(saved);
    }
    return completed;
  } finally { closeSync(handle); unlinkSync(lock); }
}

async function main() {
  const [mode, path, ...extra] = process.argv.slice(2);
  assert(["--dry-run", "--example"].includes(mode) && path && extra.length === 0, "Usage: node growth/distribution/buffer/scheduler.mjs --dry-run|--example package.json. Live execution is unavailable in this stage.");
  let batch;
  try {
    assert(path.endsWith(".json"), "Expected a JSON package.");
    batch = JSON.parse(readFileSync(localFile(path), "utf8"));
  } catch { throw new Error("Package must be valid JSON in repository growth/ or public/ (file contents suppressed)."); }
  const client = bufferClient(loadKey());
  try { console.log(client.redact(JSON.stringify(await prepare(batch, { client, requireApproval: mode === "--dry-run" }), null, 2))); }
  catch (error) { throw new Error(client.redact(error.message)); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
