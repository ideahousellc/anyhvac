import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const ENDPOINT = "https://api.buffer.com";
export const CREATE_POST = `mutation ScheduleApprovedPost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id channelId text dueAt status assets { source } } }
    ... on MutationError { message }
  }
}`;

export function loadKey() {
  let key;
  try {
    key = parseEnv(readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")).BUFFER_API_KEY?.trim();
  } catch { throw new Error("Cannot read .env.local (contents suppressed)."); }
  if (!key) throw new Error("BUFFER_API_KEY is missing or empty.");
  return key;
}

// The CLI supplies no mutation authorization. Never log request headers or raw responses.
export function bufferClient(key, { fetcher = fetch, authorizeCreate = () => false } = {}) {
  const redact = (value) => String(value).split(key).join("[REDACTED]");
  async function request(document, variables) {
    const readOnly = document.trimStart().startsWith("query ") && !/\bmutation\b/.test(document);
    if (!readOnly && !(document === CREATE_POST && authorizeCreate(variables?.input))) {
      throw new Error("Post creation is disabled without exact owner authorization.");
    }
    let response;
    try {
      response = await fetcher(ENDPOINT, {
        method: "POST", redirect: "error",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: document, variables }), signal: AbortSignal.timeout(20_000),
      });
    } catch { throw new Error("Buffer network/timeout error; reconcile before any retry."); }
    if (!response.ok) throw new Error(`Buffer HTTP ${response.status} (401: authentication; 403: permissions; 429: rate limit).`);
    const body = await response.json().catch(() => null);
    if (body?.errors?.length) throw new Error(`Buffer GraphQL: ${body.errors.map((e) => redact(e.message)).join("; ")}`);
    if (!body?.data) throw new Error("Buffer query returned no data.");
    return body.data;
  }
  async function channels() {
    const { account } = await request("query Organizations { account { organizations { id } } }", {});
    if (!Array.isArray(account?.organizations)) throw new Error("Invalid organization response.");
    const result = [];
    for (const { id } of account.organizations) {
      const data = await request(`query Channels($input: ChannelsInput!) {
        channels(input: $input) {
          id organizationId name displayName service timezone isDisconnected isLocked isQueuePaused
          postingSchedule { day paused times }
        }
      }`, { input: { organizationId: id } });
      if (!Array.isArray(data.channels)) throw new Error("Invalid channels response.");
      result.push(...data.channels);
    }
    return result;
  }
  async function posts(channel) {
    const results = new Map(), cursors = new Set();
    let after = null;
    for (let page = 0; page < 100; page++) {
      // Include drafts, errors and sent history to reconcile ambiguous results and detect repeats.
      const { posts } = await request(`query QueueAndHistory($input: PostsInput!, $after: String) {
        posts(first: 100, after: $after, input: $input) {
          edges { node { id channelId text dueAt status assets { source } } }
          pageInfo { hasNextPage endCursor }
        }
      }`, { input: { organizationId: channel.organizationId, filter: { channelIds: [channel.id] } }, after });
      if (!Array.isArray(posts?.edges) || typeof posts?.pageInfo?.hasNextPage !== "boolean") throw new Error("Incomplete queue response.");
      for (const { node } of posts.edges) {
        if (!node?.id || node.channelId !== channel.id || typeof node.text !== "string" || !Array.isArray(node.assets) || !node.status || (node.dueAt && !Number.isFinite(Date.parse(node.dueAt)))) throw new Error("Invalid queue post.");
        results.set(node.id, node);
      }
      if (!posts.pageInfo.hasNextPage) return [...results.values()];
      after = posts.pageInfo.endCursor;
      if (!after || cursors.has(after)) throw new Error("Queue pagination did not advance.");
      cursors.add(after);
    }
    throw new Error("Queue pagination limit reached; refusing an incomplete duplicate check.");
  }
  return { request, channels, posts, redact };
}
