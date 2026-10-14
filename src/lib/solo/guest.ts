/** Highest solo level a signed-out player can play. Training stays open; daily requires sign-in. */
export const GUEST_MAX_LEVEL = 3;

export function isGuestLocked(guest: boolean, level: number): boolean {
  return guest && level > GUEST_MAX_LEVEL;
}
