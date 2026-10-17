export const BOT_AVATAR = "🤖";

export const SURPRISE_ADJECTIVES = ["Swift", "Sneaky", "Brainy", "Lucky", "Fuzzy", "Cosmic", "Zesty", "Mighty", "Clever", "Sunny"] as const;

/** Each lobby tile has a short animal word used by Surprise me names. */
export const PERSONAS = [
  { avatar: "🦊", animal: "Fox" },
  { avatar: "🐼", animal: "Panda" },
  { avatar: "🐯", animal: "Tiger" },
  { avatar: "🦁", animal: "Lion" },
  { avatar: "🐸", animal: "Frog" },
  { avatar: "🐵", animal: "Monkey" },
  { avatar: "🐙", animal: "Octopus" },
  { avatar: "🦄", animal: "Unicorn" },
  { avatar: "🐧", animal: "Penguin" },
  { avatar: "🦉", animal: "Owl" },
  { avatar: "🐨", animal: "Koala" },
  { avatar: "🐰", animal: "Bunny" },
  { avatar: "🦋", animal: "Butterfly" },
  { avatar: "🐢", animal: "Turtle" },
  { avatar: "🐳", animal: "Whale" },
  { avatar: "🦖", animal: "Dino" },
  { avatar: "🐝", animal: "Bee" },
  { avatar: "🦈", animal: "Shark" },
  { avatar: "🦜", animal: "Parrot" },
  { avatar: "🐞", animal: "Ladybug" },
  { avatar: "🦩", animal: "Flamingo" },
  { avatar: "🐘", animal: "Elephant" },
  { avatar: "🦔", animal: "Hedgehog" },
  { avatar: "🐠", animal: "Fish" },
] as const;

/** More avatars than MAX_PLAYERS, so every player in a room gets a different one. */
export const AVATARS = PERSONAS.map((persona) => persona.avatar);

const AVATAR_SET = new Set<string>(AVATARS);

export function pickAvatar(taken: readonly (string | null)[], random: () => number = Math.random): string {
  const used = new Set(taken);
  const free = AVATARS.filter((a) => !used.has(a));
  const pool = free.length > 0 ? free : AVATARS;
  return pool[Math.floor(random() * pool.length)];
}

/** Use a client-picked avatar when it is a known tile and still free in the room. */
export function requestedAvatar(raw: unknown, taken: readonly (string | null)[]): string | undefined {
  if (typeof raw !== "string" || !AVATAR_SET.has(raw)) return undefined;
  if (taken.includes(raw)) return undefined;
  return raw;
}

export function surprisePersona(
  taken: readonly (string | null)[] = [],
  random: () => number = Math.random,
): { name: string; avatar: string } {
  const used = new Set(taken);
  const free = PERSONAS.filter((persona) => !used.has(persona.avatar));
  const pool = free.length > 0 ? free : PERSONAS;
  const persona = pool[Math.floor(random() * pool.length)];
  const adjective = SURPRISE_ADJECTIVES[Math.floor(random() * SURPRISE_ADJECTIVES.length)];
  return { name: `${adjective}${persona.animal}`, avatar: persona.avatar };
}

/** Rows created before avatars existed fall back to a stable pick from the player id. */
export function avatarFor(player: { id: string; avatar: string | null; is_bot: boolean }): string {
  if (player.avatar) return player.avatar;
  if (player.is_bot) return BOT_AVATAR;
  let hash = 0;
  for (const char of player.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}
