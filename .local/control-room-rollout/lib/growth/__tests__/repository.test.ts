import { describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => ({ rpc }) }));
import { recordGrowthEvent } from "@/lib/growth/repository";

describe("server-only growth persistence", () => {
  it("maps only bounded measurement fields and requires explicit successful RPC result", async () => {
    const event = { event: "resource_view", viewId: "d3e15125-4d43-4dc3-a15d-f52f5013ed93", viewStartedAt: 1_791_300_000_000, placement: null } as const;
    rpc.mockResolvedValueOnce({ data: true, error: null });
    await recordGrowthEvent(event);
    expect(rpc).toHaveBeenCalledWith("record_resource_growth_event", {
      p_view_id: event.viewId, p_view_started_at: new Date(event.viewStartedAt).toISOString(),
      p_event: "resource_view", p_placement: "none",
    });
    for (const result of [{ data: false, error: null }, { data: null, error: new Error("missing schema") }]) {
      rpc.mockResolvedValueOnce(result);
      await expect(recordGrowthEvent(event)).rejects.toThrow("Growth measurement is unavailable.");
    }
  });
});
