import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. See docs/SUPABASE_SETUP.md.");
  cached ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "blinq:supabase-auth" },
  });
  return cached;
}

let pending: Promise<string> | null = null;

/** Anonymous sign-in: every device gets a stable user id without a signup. Resolves to the access token. */
export function ensureSession(): Promise<string> {
  pending ??= (async () => {
    const client = supabase();
    const { data } = await client.auth.getSession();
    if (data.session) return data.session.access_token;
    const { data: signedIn, error } = await client.auth.signInAnonymously();
    if (error || !signedIn.session) throw new Error(error?.message ?? "Could not sign in.");
    return signedIn.session.access_token;
  })().finally(() => {
    pending = null;
  });
  return pending;
}
