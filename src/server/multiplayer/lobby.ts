import {
  ADMIN_OFFLINE_MS,
  BOT_NAME,
  DEFAULT_DIFFICULTY,
  DEFAULT_LEVELS,
  DEFAULT_PACING,
  DEFAULT_MODE,
  MAX_ROOM_LEVELS,
  MIN_HUMANS,
  ONLINE_WITHIN_MS,
  ROOMS_PER_HOUR,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  autoResultMs,
  maxPlayersFor,
} from "@/lib/multiplayer/config";
import { BOT_AVATAR, pickAvatar } from "@/lib/multiplayer/avatars";
import { cleanName, normalizeCode } from "@/lib/multiplayer/names";
import { splitTeams } from "@/lib/multiplayer/pairing";
import { DEFAULT_ROUND_TYPE, validRoundType, type RoomRoundType } from "@/lib/multiplayer/roundTypes";
import { resolveTeamStyle } from "@/lib/multiplayer/teamStyle";
import {
  ROOM_MODES,
  type Difficulty,
  type Pacing,
  type PlayerRow,
  type RoomMode,
  type RoomRow,
  type TeamStyle,
} from "@/lib/multiplayer/types";
import { ApiError, db, isUniqueViolation, must } from "./db";
import { ensureLevel } from "./duels";
import { ensureRound } from "./rounds";
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

function validMode(raw: unknown): RoomMode {
  const mode = raw ?? DEFAULT_MODE;
  const found = ROOM_MODES.find((m) => m === mode);
  if (!found) throw new ApiError(400, "Pick team or individual.");
  return found;
}

function validTeamStyle(raw: unknown, mode: RoomMode): TeamStyle {
  const result = resolveTeamStyle(raw, mode);
  if (!result.ok) throw new ApiError(400, result.error);
  return result.style;
}

function validRoomRoundType(raw: unknown, mode: RoomMode): RoomRoundType {
  const result = validRoundType(raw, mode);
  if (!result.ok) throw new ApiError(400, result.error);
  return result.type;
}

interface RoomSettingsInput {
  maxLevels?: unknown;
  roundType?: unknown;
  difficulty?: unknown;
  pacing?: unknown;
  mode?: unknown;
  teamStyle?: unknown;
}

function validSettings(input: RoomSettingsInput) {
  const levels = input.maxLevels === undefined ? DEFAULT_LEVELS : Number(input.maxLevels);
  if (!Number.isInteger(levels) || levels < 1 || levels > MAX_ROOM_LEVELS) {
    throw new ApiError(400, `Pick 1 to ${MAX_ROOM_LEVELS} levels.`);
  }
  const difficulty = input.difficulty ?? DEFAULT_DIFFICULTY;
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new ApiError(400, "Pick easy, medium or hard.");
  }
  const pacing = input.pacing ?? DEFAULT_PACING;
  if (pacing !== "manual" && pacing !== "auto") throw new ApiError(400, "Pick manual or auto.");
  const mode = validMode(input.mode);
  return {
    levels,
    difficulty: difficulty as Difficulty,
    pacing: pacing as Pacing,
    mode,
    teamStyle: validTeamStyle(input.teamStyle, mode),
    roundType: validRoomRoundType(input.roundType, mode),
  };
}

export async function createRoom(
  userId: string,
  rawName: unknown,
  rawSettings: RoomSettingsInput = {},
) {
  const name = validName(rawName);
  const settings = validSettings(rawSettings);
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
        max_levels: settings.levels,
        difficulty: settings.difficulty,
        pacing: settings.pacing,
        mode: settings.mode,
        team_style: settings.teamStyle,
        round_type: settings.roundType,
        expires_at: new Date(Date.now() + ROOM_TTL_MS).toISOString(),
      })
      .select()
      .single<RoomRow>();
    if (isUniqueViolation(error)) continue;
    const room = must({ data, error });
    must(await db().from("players").insert({ room_id: room.id, user_id: userId, name, avatar: pickAvatar([]) }));
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
  for (let attempt = 0; attempt < 4; attempt++) {
    const players = await listPlayers(room.id);
    const cap = maxPlayersFor(room.mode);
    if (players.length >= cap) throw new ApiError(409, `The room is full (${cap} players).`);
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, "That name is taken in this room.");
    }
    const avatar = pickAvatar(players.map((p) => p.avatar));
    const { error } = await db().from("players").insert({ room_id: room.id, user_id: userId, name, avatar });
    // Another player may have grabbed the same avatar or name at the same moment: look again.
    if (isUniqueViolation(error)) continue;
    must({ data: null, error });
    return { roomId: room.id, code: room.code, rejoined: false };
  }
  throw new ApiError(409, "That name is taken in this room.");
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
  if (room.mode !== "team") throw new ApiError(409, "Individual rooms have no teams.");
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
        .insert({ room_id: room.id, user_id: null, name: BOT_NAME, avatar: BOT_AVATAR, is_bot: true })
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

/** Admin, after the final result: wipe the finished game and return everyone to the lobby. */
export async function playAgain(userId: string, roomId: string) {
  const room = await requireAdmin(roomId, userId);
  if (room.phase !== "finished") throw new ApiError(409, "The game is not over yet.");
  await removeBots(room.id);
  must(await db().from("duels").delete().eq("room_id", room.id));
  must(await db().from("rounds").delete().eq("room_id", room.id));
  must(await db().from("teams").update({ score: 0 }).eq("room_id", room.id));
  must(await db().from("players").update({ team_id: null, seat: null }).eq("room_id", room.id));
  const next = await swapPhase(room, { phase: "lobby", level: 1, duel_index: 0, ...timedPhase(null) });
  if (!next) throw new ApiError(409, "The room changed. Try again.");
  return { roomId: room.id };
}

async function startIndividualGame(room: RoomRow) {
  if (room.phase !== "lobby") throw new ApiError(409, "The game already started.");
  const humans = (await listPlayers(room.id)).filter((p) => !p.is_bot);
  if (humans.length < MIN_HUMANS) throw new ApiError(409, `You need at least ${MIN_HUMANS} players.`);
  await ensureRound(room, 1);
  const next = await swapPhase(room, {
    phase: "duel_intro",
    level: 1,
    duel_index: 0,
    ...timedPhase(DUEL_INTRO_MS),
  });
  if (!next) throw new ApiError(409, "The room changed. Try again.");
  return { roomId: room.id };
}

export async function startGame(userId: string, roomId: string) {
  const room = await requireAdmin(roomId, userId);
  if (room.mode === "individual") return startIndividualGame(room);
  if (room.phase !== "teams_ready") throw new ApiError(409, "Create teams first.");
  const [, resetScores] = await Promise.all([
    ensureLevel(room, 1),
    db().from("teams").update({ score: 0 }).eq("room_id", room.id),
  ]);
  must(resetScores);
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
  mode?: unknown;
  roundType?: unknown;
  teamStyle?: unknown;
  maxLevels?: unknown;
  difficulty?: unknown;
  pacing?: unknown;
}

export async function updateSettings(userId: string, roomId: string, input: SettingsInput) {
  const room = await requireAdmin(roomId, userId);
  const patch: Partial<RoomRow> = {};
  const preGame = room.phase === "lobby" || room.phase === "teams_ready";

  if (input.mode !== undefined) {
    const mode = validMode(input.mode);
    if (mode !== room.mode) {
      if (room.phase !== "lobby") throw new ApiError(409, "The mode is locked once teams are made or the game starts.");
      const humans = (await listPlayers(room.id)).filter((p) => !p.is_bot).length;
      if (humans > maxPlayersFor(mode)) {
        throw new ApiError(409, `${mode} rooms hold at most ${maxPlayersFor(mode)} players.`);
      }
      patch.mode = mode;
    }
  }
  const nextMode = patch.mode ?? room.mode;
  if (input.teamStyle !== undefined || (patch.mode && patch.mode !== room.mode)) {
    const style = validTeamStyle(input.teamStyle ?? (patch.mode ? undefined : room.team_style), nextMode);
    if (style !== room.team_style) {
      if (room.phase !== "lobby") {
        throw new ApiError(409, "The team style is locked once teams are made or the game starts.");
      }
      patch.team_style = style;
    }
  }
  if (input.roundType !== undefined || (patch.mode === "team" && room.round_type !== DEFAULT_ROUND_TYPE)) {
    if (!preGame) throw new ApiError(409, "The round type is locked once the game starts.");
    const roundType = validRoomRoundType(input.roundType ?? DEFAULT_ROUND_TYPE, nextMode);
    if (roundType !== room.round_type) patch.round_type = roundType;
  }
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

