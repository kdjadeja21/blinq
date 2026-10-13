import {
  ADMIN_OFFLINE_MS,
  BOT_NAME,
  DEFAULT_DIFFICULTY,
  DEFAULT_LEVELS,
  DEFAULT_PACING,
  MAX_PLAYERS,
  MAX_ROOM_LEVELS,
  MIN_HUMANS,
  ONLINE_WITHIN_MS,
  ROOMS_PER_HOUR,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  autoResultMs,
} from "@/lib/multiplayer/config";
import { cleanName, normalizeCode } from "@/lib/multiplayer/names";
import { splitTeams } from "@/lib/multiplayer/pairing";
import type { Difficulty, Pacing, PlayerRow, RoomRow } from "@/lib/multiplayer/types";
import { ApiError, db, isUniqueViolation, must } from "./db";
import { ensureLevel } from "./duels";
import {
  findRoom,
  findRoomByCode,
  listPlayers,
  memberOf,
  requireAdmin,
  requireMember,
  swapPhase,
  timedPhase,
} from "./queries";
import { DUEL_INTRO_MS } from "@/lib/multiplayer/config";

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join("");
}

function validName(raw: unknown): string {
  const checked = cleanName(raw);
  if (!checked.ok) throw new ApiError(400, checked.error);
  return checked.name;
}

export async function createRoom(userId: string, rawName: unknown) {
  const name = validName(rawName);
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db()
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("admin_user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= ROOMS_PER_HOUR) throw new ApiError(429, "You created too many rooms. Try again later.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db()
      .from("rooms")
      .insert({
        code: randomCode(),
        admin_user_id: userId,
        max_levels: DEFAULT_LEVELS,
        difficulty: DEFAULT_DIFFICULTY,
        pacing: DEFAULT_PACING,
        expires_at: new Date(Date.now() + ROOM_TTL_MS).toISOString(),
      })
      .select()
      .single<RoomRow>();
    if (isUniqueViolation(error)) continue;
    const room = must({ data, error });
    must(await db().from("players").insert({ room_id: room.id, user_id: userId, name }));
    return { roomId: room.id, code: room.code };
  }
  throw new ApiError(503, "Could not generate a room code. Try again.");
}

export async function joinRoom(userId: string, rawCode: unknown, rawName: unknown) {
  const code = normalizeCode(rawCode);
  if (!code) throw new ApiError(400, "Room codes have 6 letters and numbers.");
  const room = await findRoomByCode(code);
  if (!room || Date.parse(room.expires_at) < Date.now()) throw new ApiError(404, "No room with that code.");

  const existing = await memberOf(room.id, userId);
  if (existing) {
    await db().from("players").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
    return { roomId: room.id, code: room.code, rejoined: true };
  }
  const name = validName(rawName);
  if (room.phase !== "lobby") throw new ApiError(409, "That game already started.");
  const players = await listPlayers(room.id);
  if (players.length >= MAX_PLAYERS) throw new ApiError(409, `The room is full (${MAX_PLAYERS} players).`);

  const { error } = await db().from("players").insert({ room_id: room.id, user_id: userId, name });
  if (isUniqueViolation(error)) throw new ApiError(409, "That name is taken in this room.");
  must({ data: null, error });
  return { roomId: room.id, code: room.code, rejoined: false };
}

async function removeBots(roomId: string) {
  must(await db().from("players").delete().eq("room_id", roomId).eq("is_bot", true));
}

/** Back to the lobby: drops the bot and team assignments. */
async function resetTeams(room: RoomRow) {
  await removeBots(room.id);
  must(await db().from("players").update({ team_id: null, seat: null }).eq("room_id", room.id));
  await swapPhase(room, { phase: "lobby", ...timedPhase(null) });
}

export async function createTeams(userId: string, roomId: string) {
  const room = await requireAdmin(roomId, userId);
  if (room.phase !== "lobby" && room.phase !== "teams_ready") throw new ApiError(409, "The game already started.");
  await removeBots(room.id);
  const humans = await listPlayers(room.id);
  if (humans.length < MIN_HUMANS) throw new ApiError(409, `You need at least ${MIN_HUMANS} players.`);

  must(
    await db()
      .from("teams")
      .upsert(
        [
          { room_id: room.id, name: "Team A", score: 0 },
          { room_id: room.id, name: "Team B", score: 0 },
        ],
        { onConflict: "room_id,name" },
      ),
  );
  const teams = must(
    await db().from("teams").select("id, name").eq("room_id", room.id).returns<{ id: string; name: string }[]>(),
  );
  const teamA = teams.find((t) => t.name === "Team A");
  const teamB = teams.find((t) => t.name === "Team B");
  if (!teamA || !teamB) throw new ApiError(500, "Could not create teams.");

  const [groupA, groupB] = splitTeams(humans, Math.random);
  if (groupA.length !== groupB.length) {
    const bot = must(
      await db()
        .from("players")
        .insert({ room_id: room.id, user_id: null, name: BOT_NAME, is_bot: true })
        .select()
        .single<PlayerRow>(),
    );
    groupB.push(bot);
  }
  const assign = async (group: PlayerRow[], teamId: string) => {
    for (const [seat, player] of group.entries()) {
      must(await db().from("players").update({ team_id: teamId, seat }).eq("id", player.id));
    }
  };
  await assign(groupA, teamA.id);
  await assign(groupB, teamB.id);

  const next = await swapPhase(room, { phase: "teams_ready", ...timedPhase(null) });
  if (!next) throw new ApiError(409, "The room changed. Try again.");
  return { roomId: room.id };
}

export async function startGame(userId: string, roomId: string) {
  const room = await requireAdmin(roomId, userId);
  if (room.phase !== "teams_ready") throw new ApiError(409, "Create teams first.");
  await ensureLevel(room, 1);
  must(await db().from("teams").update({ score: 0 }).eq("room_id", room.id));
  const next = await swapPhase(room, {
    phase: "duel_intro",
    level: 1,
    duel_index: 0,
    ...timedPhase(DUEL_INTRO_MS),
  });
  if (!next) throw new ApiError(409, "The room changed. Try again.");
  return { roomId: room.id };
}

export interface SettingsInput {
  maxLevels?: unknown;
  difficulty?: unknown;
  pacing?: unknown;
}

export async function updateSettings(userId: string, roomId: string, input: SettingsInput) {
  const room = await requireAdmin(roomId, userId);
  const patch: Partial<RoomRow> = {};
  const preGame = room.phase === "lobby" || room.phase === "teams_ready";

  if (input.maxLevels !== undefined || input.difficulty !== undefined) {
    if (!preGame) throw new ApiError(409, "Levels and difficulty are locked once the game starts.");
    if (input.maxLevels !== undefined) {
      const n = Number(input.maxLevels);
      if (!Number.isInteger(n) || n < 1 || n > MAX_ROOM_LEVELS) {
        throw new ApiError(400, `Pick 1 to ${MAX_ROOM_LEVELS} levels.`);
      }
      patch.max_levels = n;
    }
    if (input.difficulty !== undefined) {
      if (input.difficulty !== "easy" && input.difficulty !== "medium" && input.difficulty !== "hard") {
        throw new ApiError(400, "Pick easy, medium or hard.");
      }
      patch.difficulty = input.difficulty as Difficulty;
    }
  }
  if (input.pacing !== undefined) {
    if (input.pacing !== "manual" && input.pacing !== "auto") throw new ApiError(400, "Pick manual or auto.");
    patch.pacing = input.pacing as Pacing;
  }
  if (Object.keys(patch).length === 0) return { roomId };

  const waitingOnResult = room.phase === "duel_result" || room.phase === "level_result";
  if (patch.pacing && patch.pacing !== room.pacing && waitingOnResult) {
    const duration = patch.pacing === "auto" ? autoResultMs(room.phase as "duel_result" | "level_result") : null;
    const next = await swapPhase(room, { ...patch, ...timedPhase(duration) });
    if (!next) throw new ApiError(409, "The room changed. Try again.");
  } else {
    must(await db().from("rooms").update(patch).eq("id", room.id));
  }
  return { roomId };
}

async function removePlayer(room: RoomRow, player: PlayerRow) {
  must(await db().from("players").delete().eq("id", player.id));
  const humans = (await listPlayers(room.id)).filter((p) => !p.is_bot);
  if (humans.length === 0) {
    must(await db().from("rooms").delete().eq("id", room.id));
    return;
  }
  if (player.user_id === room.admin_user_id) {
    const heir = humans[0];
    must(await db().from("rooms").update({ admin_user_id: heir.user_id }).eq("id", room.id));
  }
  if (room.phase === "teams_ready") await resetTeams(room);
}

export async function leaveRoom(userId: string, roomId: string) {
  const room = await findRoom(roomId);
  const player = await requireMember(roomId, userId);
  if (room.phase === "lobby" || room.phase === "teams_ready") await removePlayer(room, player);
  return { roomId };
}

export async function kickPlayer(userId: string, roomId: string, playerId: unknown) {
  const room = await requireAdmin(roomId, userId);
  if (room.phase !== "lobby" && room.phase !== "teams_ready") throw new ApiError(409, "The game already started.");
  const players = await listPlayers(roomId);
  const target = players.find((p) => p.id === playerId);
  if (!target || target.is_bot) throw new ApiError(404, "Player not found.");
  if (target.user_id === userId) throw new ApiError(400, "Use leave instead.");
  await removePlayer(room, target);
  return { roomId };
}

/** Moves admin rights to the earliest-joined online human when the admin is gone for 60 seconds. */
export async function ensureAdminOnline(room: RoomRow): Promise<void> {
  if (room.phase === "finished") return;
  const humans = (await listPlayers(room.id)).filter((p) => !p.is_bot);
  const admin = humans.find((p) => p.user_id === room.admin_user_id);
  const now = Date.now();
  if (admin && now - Date.parse(admin.last_seen_at) < ADMIN_OFFLINE_MS) return;
  const heir = humans.find(
    (p) => p.user_id !== room.admin_user_id && now - Date.parse(p.last_seen_at) < ONLINE_WITHIN_MS,
  );
  if (!heir?.user_id) return;
  must(
    await db()
      .from("rooms")
      .update({ admin_user_id: heir.user_id })
      .eq("id", room.id)
      .eq("admin_user_id", room.admin_user_id),
  );
}

export async function heartbeat(userId: string, roomId: string) {
  const player = await requireMember(roomId, userId);
  must(await db().from("players").update({ last_seen_at: new Date().toISOString() }).eq("id", player.id));
  await ensureAdminOnline(await findRoom(roomId));
  return { roomId, serverNow: Date.now() };
}

