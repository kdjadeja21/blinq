import { BOT_NAME, NAME_MAX, NAME_MIN, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./config";

const CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

/** Starter list; swap for a maintained profanity package before a public launch. */
const BLOCKED = ["fuck", "shit", "bitch", "cunt", "asshole", "nigg", "faggot", "slut", "whore", "dick"];

export function cleanName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Enter a name." };
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { ok: false, error: `Names are ${NAME_MIN} to ${NAME_MAX} characters.` };
  }
  const squashed = name.toLowerCase().replace(/[^a-z]/g, "");
  if (BLOCKED.some((word) => squashed.includes(word))) return { ok: false, error: "Pick a friendlier name." };
  if (name.toLowerCase() === BOT_NAME.toLowerCase()) return { ok: false, error: "That name is reserved." };
  return { ok: true, name };
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

const RANDOM_ADJECTIVES = [
  "Swift",
  "Bold",
  "Happy",
  "Cosmic",
  "Mighty",
  "Sunny",
  "Clever",
  "Lucky",
  "Neon",
  "Golden",
  "Silver",
  "Turbo",
  "Chill",
  "Epic",
  "Zesty",
] as const;

const RANDOM_NOUNS = [
  "Fox",
  "Panda",
  "Otter",
  "Comet",
  "Mango",
  "Pixel",
  "Rocket",
  "Koala",
  "Tiger",
  "Ninja",
  "Penguin",
  "Wizard",
  "Badger",
  "Falcon",
  "Gamer",
] as const;

/** Fun default for create/join; always passes `cleanName`. */
export function randomPlayerName(random: () => number = Math.random): string {
  const adj = RANDOM_ADJECTIVES[Math.floor(random() * RANDOM_ADJECTIVES.length)];
  const noun = RANDOM_NOUNS[Math.floor(random() * RANDOM_NOUNS.length)];
  return `${adj} ${noun}`.slice(0, NAME_MAX);
}
