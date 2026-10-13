import type { DuelRow, PlayerRow, RoomRow, TeamRow } from "@/lib/multiplayer/types";
import { ApiError, db, must } from "./db";

export async function findRoom(roomId: string): Promise<RoomRow> {
  const row = must(await db().from("rooms").select("*").eq("id", roomId).maybeSingle<RoomRow>());
  if (!row) throw new ApiError(404, "Room not found.");
  return row;
}

export async function findRoomByCode(code: string): Promise<RoomRow | null> {
  return must(await db().from("rooms").select("*").eq("code", code).maybeSingle<RoomRow>());
}

export async function listPlayers(roomId: string): Promise<PlayerRow[]> {
  return must(
    await db().from("players").select("*").eq("room_id", roomId).order("joined_at").returns<PlayerRow[]>(),
  );
}

export async function listTeams(roomId: string): Promise<TeamRow[]> {
  return must(await db().from("teams").select("*").eq("room_id", roomId).order("side").returns<TeamRow[]>());
}

export async function findDuel(roomId: string, level: number, duelIndex: number): Promise<DuelRow | null> {
  return must(
    await db()
      .from("duels")
      .select("*")
      .eq("room_id", roomId)
      .eq("level", level)
      .eq("duel_index", duelIndex)
      .maybeSingle<DuelRow>(),
  );
}

export async function memberOf(roomId: string, userId: string): Promise<PlayerRow | null> {
  return must(
    await db().from("players").select("*").eq("room_id", roomId).eq("user_id", userId).maybeSingle<PlayerRow>(),
  );
}

export async function requireMember(roomId: string, userId: string): Promise<PlayerRow> {
  const player = await memberOf(roomId, userId);
  if (!player) throw new ApiError(403, "You are not in this room.");
  return player;
}

export async function requireAdmin(roomId: string, userId: string): Promise<RoomRow> {
  const room = await findRoom(roomId);
  if (room.admin_user_id !== userId) throw new ApiError(403, "Only the room admin can do that.");
  return room;
}

/**
 * Compare-and-swap on `phase_version`. Returns the updated room, or null when
 * somebody else already moved the room on (callers treat that as "done").
 */
export async function swapPhase(room: RoomRow, patch: Partial<RoomRow>): Promise<RoomRow | null> {
  const rows = must(
    await db()
      .from("rooms")
      .update({ ...patch, phase_version: room.phase_version + 1 })
      .eq("id", room.id)
      .eq("phase_version", room.phase_version)
      .select()
      .returns<RoomRow[]>(),
  );
  return rows[0] ?? null;
}

export function timedPhase(durationMs: number | null): Pick<RoomRow, "phase_started_at" | "phase_duration_ms"> {
  return { phase_started_at: new Date().toISOString(), phase_duration_ms: durationMs };
}
