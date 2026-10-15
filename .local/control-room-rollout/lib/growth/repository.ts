import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GrowthEvent } from "@/lib/growth/browser";

export async function recordGrowthEvent(event: GrowthEvent) {
  const { data, error } = await createSupabaseServerClient().rpc("record_resource_growth_event", {
    p_view_id: event.viewId,
    p_view_started_at: new Date(event.viewStartedAt).toISOString(),
    p_event: event.event,
    p_placement: event.placement ?? "none",
  });
  if (error || data !== true) throw new Error("Growth measurement is unavailable.");
}
