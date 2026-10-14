export function roomInviteShareTitle(): string {
  return "You're invited to Blinq 🧠";
}

export function roomInviteShareText(code: string, hostName: string, url: string): string {
  const host = hostName.trim() || "Your friend";
  return `${host} invited you to Blinq!

Think you've got a sharp memory? Join the team battle room before we start.

Room code: ${code}
Tap to join: ${url}`;
}

/** Message for Web Share API (link is passed separately as `url`). */
export function roomInviteShareMessage(code: string, hostName: string): string {
  const host = hostName.trim() || "Your friend";
  return `${host} invited you to Blinq!

Think you've got a sharp memory? Join the team battle room before we start.

Room code: ${code}`;
}
