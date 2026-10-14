export const BOT_AVATAR = "🤖";

/** More avatars than MAX_PLAYERS, so every player in a room gets a different one. */
export const AVATARS = [
  "🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🐙", "🦄", "🐧", "🦉", "🐨", "🐰", "🦋", "🐢", "🐳", "🦖", "🐝", "🦈", "🦜", "🐞", "🦩", "🐘", "🦔", "🐠",
] as const;

export function pickAvatar(taken: readonly (string | null)[], random: () => number = Math.random): string {
  const used = new Set(taken);
  const free = AVATARS.filter((a) => !used.has(a));
  const pool = free.length > 0 ? free : AVATARS;
  return pool[Math.floor(random() * pool.length)];
}

/** Rows created before avatars existed fall back to a stable pick from the player id. */
export function avatarFor(player: { id: string; avatar: string | null; is_bot: boolean }): string {
  if (player.avatar) return player.avatar;
  if (player.is_bot) return BOT_AVATAR;
  let hash = 0;
  for (const char of player.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}
