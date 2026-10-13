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
