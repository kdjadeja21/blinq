export const PRODUCTION_ORIGIN = "https://blinqplay.vercel.app";

const PREVIEW_HOST = /\.vercel\.app$/i;

/** Public origin for invite/QR links so they match the installed production PWA. */
export function inviteOrigin(locationOrigin: string): string {
  try {
    const { hostname } = new URL(locationOrigin);
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    const isPreview = PREVIEW_HOST.test(hostname) && hostname !== "blinqplay.vercel.app";
    if (isLocal || isPreview) return PRODUCTION_ORIGIN;
    return new URL(locationOrigin).origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

export function shareUrl(code: string, locationOrigin?: string): string {
  const origin = inviteOrigin(locationOrigin ?? (typeof window === "undefined" ? PRODUCTION_ORIGIN : window.location.origin));
  return `${origin}/join/${code}`;
}

export function roomInviteShareTitle(): string {
  return "You're invited to a Blinq multiplayer battle";
}

export function roomInviteShareText(code: string, hostName: string, url: string): string {
  const host = hostName.trim() || "Your friend";
  return `${host} invited you to Blinq!

Think you've got a sharp memory? Join the room before we start.

Room code: ${code}
Tap to join: ${url}`;
}

/** Message for Web Share API (link is passed separately as `url`). */
export function roomInviteShareMessage(code: string, hostName: string): string {
  const host = hostName.trim() || "Your friend";
  return `${host} invited you to Blinq!

Think you've got a sharp memory? Join the room before we start.

Room code: ${code}`;
}
