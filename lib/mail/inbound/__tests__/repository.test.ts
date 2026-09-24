import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/supabase";

import { InboundMailFailure } from "../diagnostics";
import { SupabaseInboundMailRepository } from "../repository";

vi.mock("server-only", () => ({}));

function duplicateLookupClient(results: Array<Record<string, unknown>>) {
  const maybeSingle = vi.fn();
  for (const result of results) maybeSingle.mockResolvedValueOnce(result);

  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);

  return {
    client: { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient<Database>,
    maybeSingle,
  };
}

describe("Supabase inbound mail diagnostics", () => {
  it("classifies the provider-message duplicate lookup and retains only its safe database code", async () => {
    const { client } = duplicateLookupClient([{
      data: null,
      error: {
        code: "42501",
        message: "sensitive database detail sender@example.com",
      },
    }]);
    const repository = new SupabaseInboundMailRepository(client);

    const error = await repository.findDuplicate("sensitive-message-id", "sensitive-event-id")
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(InboundMailFailure);
    expect(error).toMatchObject({
      stage: "supabase.find_duplicate_message",
      errorName: "PostgrestError",
      errorCode: "42501",
      message: "Inbound mail database operation failed.",
    });
    expect(JSON.stringify(error)).not.toContain("sender@example.com");
  });

  it("distinguishes the provider-event duplicate lookup", async () => {
    const { client } = duplicateLookupClient([
      { data: null, error: null },
      { data: null, error: { code: "PGRST204", message: "sensitive schema detail" } },
    ]);
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.findDuplicate("message-id", "event-id")).rejects.toMatchObject({
      stage: "supabase.find_duplicate_event",
      errorName: "PostgrestError",
      errorCode: "PGRST204",
    });
  });
});
