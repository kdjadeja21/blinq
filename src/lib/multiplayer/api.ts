import { ensureSession } from "@/lib/supabase/client";

export class MpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const CALL_TIMEOUT_MS = 20000;

/** Rejects with `message` if `promise` has not settled after `ms`, so the UI can never wait forever. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new MpError(408, message)), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

export async function callMp<T = Record<string, unknown>>(action: string, body: object = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMessage = "The server took too long to respond. Check your connection and try again.";
  const request = (async () => {
    const token = await ensureSession();
    const response = await fetch(`/api/mp/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new MpError(response.status, json.error ?? "Something went wrong.");
    return json as T;
  })();
  try {
    return await withTimeout(request, CALL_TIMEOUT_MS, timeoutMessage);
  } catch (e) {
    controller.abort();
    request.catch(() => undefined);
    throw e;
  }
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}
