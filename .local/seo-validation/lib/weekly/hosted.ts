import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase/server";
import { ReviewError, verify } from "./domain";
import type { ReviewMedia, ReviewState } from "./types";
import { createHash } from "node:crypto";
type Database = { public: { Tables: { weekly_content_reviews: { Row: { owner_id: string; batch_id: string; revision: number; payload: unknown }; Insert: { owner_id: string; batch_id: string; payload: unknown }; Update: { revision?: number; payload?: unknown }; Relationships: [] } }; Views: Record<string, never>; Functions: { weekly_content_compare_swap: { Args: { p_owner: string; p_batch: string; p_revision: number; p_payload: unknown }; Returns: boolean } }; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
export const BUCKET = "weekly-content-review";
export class HostedReviewStore {
  private client;
  private bucketCheck?: Promise<void>;
  constructor(private owner: string, private batch: string) {
    const { url, secretKey } = getSupabaseServerConfig();
    this.client = createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000), redirect: "error" }) } });
  }
  async read(): Promise<{ revision: number; state: ReviewState }> {
    const { data, error } = await this.client.from("weekly_content_reviews").select("revision,payload").eq("owner_id", this.owner).eq("batch_id", this.batch).maybeSingle();
    if (error || !data) throw new ReviewError("Private hosted review unavailable. No changes made.", 503);
    const state = data.payload as ReviewState; verify(state);
    if (state.versions.some(v => v.content.batchId !== this.batch || v.content.agentId !== "anyhvac.george")) throw new ReviewError("Review identity mismatch.", 503);
    return { revision: data.revision, state };
  }
  async exists() {
    const { data, error } = await this.client.from("weekly_content_reviews").select("revision,payload").eq("owner_id", this.owner).eq("batch_id", this.batch).maybeSingle();
    if (error) throw new ReviewError("Import status unavailable. Do not retry the import.", 503);
    return data !== null;
  }
  async compareSwap(revision: number, state: ReviewState) {
    const { data, error } = await this.client.rpc("weekly_content_compare_swap", { p_owner: this.owner, p_batch: this.batch, p_revision: revision, p_payload: state });
    if (error) throw new ReviewError("Hosted save unconfirmed. Retry only the same request ID after checking history.", 503);
    return data === true;
  }
  async media(media: ReviewMedia) {
    await this.assertPrivateBucket();
    // No signed/public URL is returned to the browser. The authenticated app serves bytes.
    const { data, error } = await this.client.storage.from(BUCKET).download(`${this.owner}/${this.batch}/${media.id}`);
    if (error || !data || data.size > 50000000) throw new ReviewError("Private hosted media missing or unavailable.", 503);
    return Buffer.from(await data.arrayBuffer());
  }
  async upload(media: ReviewMedia, bytes: Buffer) {
    await this.assertPrivateBucket();
    if (bytes.length !== media.bytes || bytes.length > 50000000 || createHash("sha256").update(bytes).digest("hex") !== media.id) throw new ReviewError("Import media changed.", 422);
    const object = `${this.owner}/${this.batch}/${media.id}`;
    const { error } = await this.client.storage.from(BUCKET).upload(object, bytes, { contentType: media.type, upsert: false, cacheControl: "0" });
    if (error) {
      // Recover an existing exact object without replacing it; network ambiguity never overwrites.
      const existing = await this.media(media);
      if (existing.length !== media.bytes || createHash("sha256").update(existing).digest("hex") !== media.id) throw new ReviewError("Existing private object changed. Stop import.", 503);
    }
  }
  private async assertPrivateBucket() {
    this.bucketCheck ??= (async () => {
      const { data, error } = await this.client.storage.getBucket(BUCKET);
      if (error || !data || data.public !== false) throw new ReviewError("Review bucket unavailable or not private. No media served.", 503);
    })();
    await this.bucketCheck;
  }
}
