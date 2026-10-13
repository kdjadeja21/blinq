import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

export { isSupabaseConfigured } from "./env";

let cached: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. See docs/SUPABASE_SETUP.md.");
  cached ??= createClient(supabaseUrl()!, supabasePublishableKey()!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "blinq:supabase-auth" },
  });
  return cached;
}

export interface SessionUser {
  token: string;
  userId: string;
}

let pending: Promise<SessionUser> | null = null;

/** Anonymous sign-in: every device gets a stable user id without a signup. Reads the stored session, no extra network call. */
export function ensureUser(): Promise<SessionUser> {
  pending ??= (async () => {
    const client = supabase();
    const { data } = await client.auth.getSession();
    if (data.session) return { token: data.session.access_token, userId: data.session.user.id };
    const { data: signedIn, error } = await client.auth.signInAnonymously();
    if (error || !signedIn.session) throw new Error(error?.message ?? "Could not sign in.");
    return { token: signedIn.session.access_token, userId: signedIn.session.user.id };
  })().finally(() => {
    pending = null;
  });
  return pending;
}

export async function ensureSession(): Promise<string> {
  return (await ensureUser()).token;
}
