import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSupabaseServerClient,
  getSupabaseServerConfig,
} from "@/lib/supabase/server";

describe("server-side Supabase configuration", () => {
  it("requires SUPABASE_URL", () => {
    expect(() =>
      getSupabaseServerConfig({
        SUPABASE_URL: undefined,
        SUPABASE_SECRET_KEY: "test-secret-key",
      }),
    ).toThrow("SUPABASE_URL is required");
  });

  it("requires SUPABASE_SECRET_KEY without exposing a supplied value", () => {
    expect(() =>
      getSupabaseServerConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: undefined,
      }),
    ).toThrow("SUPABASE_SECRET_KEY is required");
  });

  it("rejects a non-HTTP Supabase URL", () => {
    expect(() =>
      getSupabaseServerConfig({
        SUPABASE_URL: "file:///private/supabase",
        SUPABASE_SECRET_KEY: "test-secret-key",
      }),
    ).toThrow("SUPABASE_URL must be a valid HTTP or HTTPS URL");
  });

  it("creates a client without making a database request", () => {
    const client = createSupabaseServerClient({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "test-secret-key",
    });

    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("is marked as server-only", async () => {
    const source = await readFile(
      path.resolve(process.cwd(), "lib/supabase/server.ts"),
      "utf8",
    );

    expect(source).toMatch(/^import ["']server-only["'];/);
    expect(source).not.toContain("NEXT_PUBLIC_");
  });
});
