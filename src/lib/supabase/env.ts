/** Project URL (browser-safe). Prefer `NEXT_PUBLIC_SUPABASE_URL`. */
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

/**
 * Client API key. Prefer the publishable key (`sb_publishable_...`).
 * Legacy `anon` JWT keys still work until Supabase retires them.
 */
export function supabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Server-only secret key. Prefer `SUPABASE_SECRET_KEY` (`sb_secret_...`).
 * Legacy `service_role` JWT keys still work.
 */
export function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
