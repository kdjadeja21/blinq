import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mulberry32 } from "@/lib/rng";
import { supabaseSecretKey, supabaseUrl } from "@/lib/supabase/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new ApiError(500, `Missing environment variable ${name}. See docs/SUPABASE_SETUP.md.`);
  return value;
}

let cached: SupabaseClient | null = null;

/** Secret-key client. It bypasses RLS, so it must only ever run on the server. */
export function db(): SupabaseClient {
  const url = supabaseUrl();
  const secret = supabaseSecretKey();
  if (!url || !secret) {
    throw new ApiError(
      500,
      "Missing Supabase URL or secret key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY). See docs/SUPABASE_SETUP.md.",
    );
  }
  cached ??= createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export async function userIdFromRequest(request: Request): Promise<string> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Sign in first.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Your session expired. Reload the page.");
  return data.user.id;
}

export function isCronRequest(request: Request): boolean {
  const expected = process.env.MULTIPLAYER_CRON_SECRET;
  return Boolean(expected) && request.headers.get("authorization") === `Bearer ${expected}`;
}

/** Deterministic per-label randomness that clients cannot reproduce without the server secret. */
export function seededRandom(label: string): () => number {
  const digest = createHmac("sha256", env("MULTIPLAYER_SEED_SECRET")).update(label).digest();
  return mulberry32(digest.readUInt32BE(0));
}

export function must<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw new ApiError(500, result.error.message);
  return result.data as T;
}

export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
