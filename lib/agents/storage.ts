import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase/server";
import { EMPTY_STATE, type InboxState } from "./types";

export function inboxEnabled() { return process.env.AGENT_INBOX_ENABLED === "true"; }
type Document = { revision: number; payload: InboxState };
interface DocumentStore { read(): Promise<Document>; compareSwap(previous: number, payload: InboxState): Promise<boolean> }
export class LocalDocumentStore implements DocumentStore {
  constructor(private directory: string) {}
  async read(): Promise<Document> {
    try { return JSON.parse(await readFile(path.join(this.directory, "state.json"), "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { revision: 0, payload: EMPTY_STATE() }; throw error; }
  }
  async compareSwap(previous: number, payload: InboxState) {
    await mkdir(this.directory, { recursive: true });
    const lock = path.join(this.directory, "state.lock");
    let handle;
    try { handle = await open(lock, "wx"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
    try {
      if ((await this.read()).revision !== previous) return false;
      const temporary = path.join(this.directory, randomUUID() + ".tmp");
      await writeFile(temporary, JSON.stringify({ revision: previous + 1, payload }), { mode: 0o600 });
      await rename(temporary, path.join(this.directory, "state.json")); return true;
    } finally { await handle.close(); await unlink(lock); }
  }
}
type AgentDatabase = { public: {
  Tables: { agent_inbox_documents: { Row: { owner_id: string; revision: number; payload: unknown }; Insert: { owner_id: string; revision?: number; payload: unknown }; Update: { revision?: number; payload?: unknown }; Relationships: [] } };
  Views: Record<string, never>; Functions: { agent_inbox_compare_swap: { Args: { p_owner: string; p_revision: number; p_payload: unknown }; Returns: boolean } }; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
class SupabaseDocumentStore implements DocumentStore {
  private client; private owner;
  constructor() {
    const { url, secretKey } = getSupabaseServerConfig();
    this.client = createClient<AgentDatabase>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    if (!process.env.ADMIN_USERNAME) throw new Error("Owner configuration missing.");
    this.owner = createHash("sha256").update("anyhvac-agent-owner:" + process.env.ADMIN_USERNAME).digest("hex");
  }
  async read(): Promise<Document> {
    const { data, error } = await this.client.from("agent_inbox_documents").select("revision,payload").eq("owner_id", this.owner).maybeSingle();
    if (error) throw new Error("Agent storage unavailable.");
    return data ? { revision: data.revision, payload: data.payload as InboxState } : { revision: 0, payload: EMPTY_STATE() };
  }
  async compareSwap(previous: number, payload: InboxState) {
    const { data, error } = await this.client.rpc("agent_inbox_compare_swap", { p_owner: this.owner, p_revision: previous, p_payload: payload });
    if (error) throw new Error("Agent storage update failed."); return data === true;
  }
}
export function getStore(): DocumentStore {
  if (!inboxEnabled()) throw new Error("Agent inbox is disabled.");
  if (process.env.AGENT_INBOX_STORAGE === "local") {
    if (process.env.NODE_ENV === "production") throw new Error("Local inbox storage is not permitted in production.");
    return new LocalDocumentStore(path.join(process.cwd(), ".local/agent-inbox"));
  }
  return new SupabaseDocumentStore();
}
export async function transaction<T>(change: (state: InboxState) => T, store = getStore()): Promise<T> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const document = await store.read();
    const result = change(document.payload);
    if (await store.compareSwap(document.revision, document.payload)) return result;
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error("Inbox is busy. No task was dispatched by this request.");
}
