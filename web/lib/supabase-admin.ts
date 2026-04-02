import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Public URL (browser) or server-only URL fallback — both work on the server. */
function supabaseUrl(): string | undefined {
  const pub = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const srv = process.env.SUPABASE_URL?.trim();
  return pub || srv;
}

function supabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

/** Server-only client (bypasses RLS). Do not import from client components. */
export function createSupabaseAdmin(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY on Vercel for Production, then redeploy."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
