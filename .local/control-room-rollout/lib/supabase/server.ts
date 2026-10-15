import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

type SupabaseServerEnvironment = Readonly<Record<string, string | undefined>>;

export function getSupabaseServerConfig(
  environment: SupabaseServerEnvironment = process.env,
) {
  const url = environment.SUPABASE_URL?.trim();
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim();

  if (!url) {
    throw new Error("SUPABASE_URL is required for server-side Supabase access.");
  }
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for server-side Supabase access.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }

  return { url: parsedUrl.toString().replace(/\/$/, ""), secretKey };
}

export function createSupabaseServerClient(
  environment: SupabaseServerEnvironment = process.env,
): SupabaseClient<Database> {
  const { url, secretKey } = getSupabaseServerConfig(environment);

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
