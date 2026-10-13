import { ensureSession, supabase } from "@/lib/supabase/client";

export class MpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function callMp<T = Record<string, unknown>>(action: string, body: object = {}): Promise<T> {
  await ensureSession();
  const { data } = await supabase().auth.getSession();
  const response = await fetch(`/api/mp/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new MpError(response.status, json.error ?? "Something went wrong.");
  return json as T;
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}
