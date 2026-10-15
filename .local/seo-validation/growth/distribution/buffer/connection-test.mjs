import { bufferClient, loadKey } from "./client.mjs";

// Official schema/examples verified 2026-10-02:
// https://developers.buffer.com/reference.html
// https://developers.buffer.com/guides/posts-and-scheduling.html
// Only GraphQL queries are sent; HTTP POST is the documented query transport.
const timezone = "America/New_York";
const targets = ["linkedin", "instagram", "youtube"];
let apiKey;
let client;
const safe = (value) => String(value).split(apiKey || "\0").join("[REDACTED]");
const log = (value) => console.log(safe(value));
const formatTime = (value) => {
  if (!value) return "No scheduled time supplied";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid scheduled timestamp from Buffer.");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, dateStyle: "full", timeStyle: "long",
  }).format(date);
};

async function query(document, variables = {}) {
  return client.request(document, variables);
}

async function scheduledPosts(organizationId, channelId) {
  const posts = new Map();
  const cursors = new Set();
  let after = null;
  for (let page = 0; page < 100; page++) {
    const data = await query(`query ScheduledPosts($input: PostsInput!, $after: String) {
      posts(first: 100, after: $after, input: $input) {
        edges { node { id channelId dueAt status } }
        pageInfo { hasNextPage endCursor }
      }
    }`, {
      input: { organizationId, filter: { status: ["scheduled"], channelIds: [channelId] },
        sort: [{ field: "dueAt", direction: "asc" }] }, after,
    });
    const result = data.posts;
    if (!Array.isArray(result?.edges) || typeof result?.pageInfo?.hasNextPage !== "boolean") {
      throw new Error("Invalid posts/pagination response; queue count unavailable.");
    }
    for (const { node } of result.edges) {
      if (!node?.id || node.channelId !== channelId || node.status !== "scheduled") {
        throw new Error("Unexpected post response; queue count unavailable.");
      }
      if (node.dueAt) formatTime(node.dueAt);
      posts.set(node.id, node);
    }
    if (!result.pageInfo.hasNextPage) {
      return [...posts.values()].sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
    }
    after = result.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new Error("Pagination did not advance; queue count unavailable.");
    cursors.add(after);
  }
  throw new Error("Pagination safety limit reached; queue count unavailable.");
}

async function main() {
  apiKey = loadKey();
  client = bufferClient(apiKey);
  log(`Read-only Buffer connection test — ${formatTime(new Date())} — ${timezone}`);
  const { account } = await query("query ConnectionAccount { account { organizations { id } } }");
  if (!Array.isArray(account?.organizations)) throw new Error("Invalid account/organizations response.");
  log("Authentication: succeeded (account query).");
  const found = new Set();
  for (const organization of account.organizations) {
    try {
      const { channels } = await query(`query ConnectionChannels($input: ChannelsInput!) {
        channels(input: $input) {
          id name displayName service timezone isDisconnected isLocked isQueuePaused
          postingSchedule { day paused times }
        }
      }`, { input: { organizationId: organization.id } });
      if (!Array.isArray(channels)) throw new Error("Invalid channels response.");
      for (const channel of channels) {
        log(`Channel: ${channel.service} | ${channel.displayName || channel.name} | ID ${channel.id} | disconnected=${channel.isDisconnected} | locked=${channel.isLocked}`);
        if (!targets.includes(channel.service)) continue;
        found.add(channel.service);
        log(`Queue paused: ${channel.isQueuePaused}; channel timezone: ${channel.timezone}`);
        log(`Recurring slots (channel timezone): ${JSON.stringify(channel.postingSchedule)}`);
        try {
          const posts = await scheduledPosts(organization.id, channel.id);
          log(`Scheduled queue count: ${posts.length} (derived from all retrieved scheduled posts).`);
          log(`Next scheduled post: ${posts.length ? `${posts[0].id} | ${formatTime(posts[0].dueAt)} | ${posts[0].status}` : "none"}`);
          for (const post of posts) log(`Post: ${channel.service} | channel ${post.channelId} | ${formatTime(post.dueAt)} | ${post.status} | ID ${post.id}`);
        } catch (error) {
          log(`${channel.service}: queue unavailable — ${error.message}`);
          process.exitCode = 1;
        }
      }
    } catch (error) {
      log(`Organization channel retrieval failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
  for (const target of targets) {
    if (!found.has(target)) {
      log(`${target}: not found among accessible channels; queue/next post unknown.`);
      process.exitCode = 1;
    }
  }
  log("Scope: scheduled posts only; drafts, sent and failed posts are excluded. Queue inspection does not confirm publication.");
}

main().catch((error) => {
  console.error(safe(error.message));
  process.exitCode = 1;
});
