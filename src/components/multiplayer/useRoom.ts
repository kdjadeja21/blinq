"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HEARTBEAT_MS, isSquad } from "@/lib/multiplayer/config";
import { myDuel } from "@/lib/multiplayer/squad";
import { callMp } from "@/lib/multiplayer/api";
import { RESULTS_TRANSITION_DELAY_MS } from "@/lib/roundEnd";
import type {
  DuelProgressRow,
  DuelResultRow,
  DuelRow,
  PlayerRow,
  RoomPhase,
  RoomRow,
  RoundDoneRow,
  RoundResultRow,
  RoundRow,
  TeamRow,
} from "@/lib/multiplayer/types";
import { ensureSession, supabase } from "@/lib/supabase/client";

export type RoomStatus = "loading" | "ready" | "not_member" | "error";

export interface RoomState {
  status: RoomStatus;
  error: string | null;
  room: RoomRow | null;
  players: PlayerRow[];
  teams: TeamRow[];
  duels: DuelRow[];
  results: DuelResultRow[];
  progress: DuelProgressRow[];
  /** individual mode: one shared round per level */
  rounds: RoundRow[];
  roundResults: RoundResultRow[];
  roundDone: RoundDoneRow[];
  /** item keys on the table; only filled while the server allows reading them */
  itemKeys: string[];
  choiceKeys: string[];
  /** the table as seen during memorize; kept so recall can judge taps without a server round trip */
  memorizedKeys: string[];
  online: Set<string>;
  me: PlayerRow | null;
  isAdmin: boolean;
  duel: DuelRow | null;
  round: RoundRow | null;
  /** Server-corrected clock in ms. */
  now: () => number;
  /** Re-reads the room immediately instead of waiting for a realtime event. */
  refresh: () => Promise<void>;
  /** Call on every local recall tap so the results screen waits for its feedback. */
  noteTap: () => void;
}

const EMPTY: Omit<RoomState, "now" | "refresh" | "noteTap"> = {
  status: "loading",
  error: null,
  room: null,
  players: [],
  teams: [],
  duels: [],
  results: [],
  progress: [],
  rounds: [],
  roundResults: [],
  roundDone: [],
  itemKeys: [],
  choiceKeys: [],
  memorizedKeys: [],
  online: new Set(),
  me: null,
  isAdmin: false,
  duel: null,
  round: null,
};

type Data = Omit<RoomState, "now" | "refresh" | "noteTap" | "online" | "status" | "error" | "me" | "isAdmin" | "duel" | "round">;
const EMPTY_DATA: Data = {
  room: null,
  players: [],
  teams: [],
  duels: [],
  results: [],
  progress: [],
  rounds: [],
  roundResults: [],
  roundDone: [],
  itemKeys: [],
  choiceKeys: [],
  memorizedKeys: [],
};

export function useRoom(code: string): RoomState {
  const [status, setStatus] = useState<RoomStatus>(EMPTY.status);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data>(EMPTY_DATA);
  const [online, setOnline] = useState<Set<string>>(EMPTY.online);
  const [userId, setUserId] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const roomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const memorizedRef = useRef<{ stageId: string; keys: string[] } | null>(null);

  const now = useCallback(() => Date.now() + offsetRef.current, []);

  const lastTapRef = useRef(0);
  const phaseRef = useRef<RoomPhase | null>(null);
  const pendingRef = useRef<Data | null>(null);
  const holdRef = useRef<number | undefined>(undefined);
  const noteTap = useCallback(() => {
    lastTapRef.current = Date.now();
  }, []);

  const commit = useCallback((next: Data) => {
    phaseRef.current = next.room?.phase ?? null;
    setData(next);
  }, []);

  // Server-driven round ends only change what this player sees after the last tap had time to show.
  // The update is held back (latest one wins), never dropped, and nothing is sent or changed on the server.
  const apply = useCallback(
    (next: Data) => {
      if (holdRef.current !== undefined) {
        pendingRef.current = next;
        return;
      }
      const wait = lastTapRef.current + RESULTS_TRANSITION_DELAY_MS - Date.now();
      if (phaseRef.current === "recall" && next.room?.phase !== "recall" && wait > 0) {
        pendingRef.current = next;
        holdRef.current = window.setTimeout(() => {
          holdRef.current = undefined;
          const held = pendingRef.current;
          pendingRef.current = null;
          if (held) commit(held);
        }, wait);
        return;
      }
      commit(next);
    },
    [commit],
  );

  const refresh = useCallback(async () => {
    const client = supabase();
    const { data: room } = await client.from("rooms").select("*").eq("code", code).maybeSingle<RoomRow>();
    if (!room) {
      setStatus("not_member");
      return;
    }
    roomIdRef.current = room.id;
    const individual = room.mode === "individual";
    const [players, teams, duels, rounds] = await Promise.all([
      client.from("players").select("*").eq("room_id", room.id).order("joined_at").returns<PlayerRow[]>(),
      client.from("teams").select("*").eq("room_id", room.id).order("name").returns<TeamRow[]>(),
      individual
        ? null
        : client.from("duels").select("*").eq("room_id", room.id).order("level").order("duel_index").returns<DuelRow[]>(),
      individual
        ? client.from("rounds").select("*").eq("room_id", room.id).order("level").returns<RoundRow[]>()
        : null,
    ]);
    const duelList = duels?.data ?? [];
    const roundList = rounds?.data ?? [];
    const myPlayerId = (players.data ?? []).find((p) => p.user_id === userIdRef.current)?.id;
    const currentDuel = isSquad(room)
      ? myDuel(duelList, room.level, myPlayerId)
      : duelList.find((d) => d.level === room.level && d.duel_index === room.duel_index);
    const currentRound = roundList.find((r) => r.level === room.level);
    const stageId = currentRound?.id ?? currentDuel?.id;
    const itemsTable = individual ? "round_items" : "duel_items";
    const choicesTable = individual ? "round_choices" : "duel_choices";
    const stageColumn = individual ? "round_id" : "duel_id";
    const [results, progress, roundResults, roundDone, items, choices] = await Promise.all([
      duelList.length
        ? client.from("duel_results").select("*").in("duel_id", duelList.map((d) => d.id)).returns<DuelResultRow[]>()
        : null,
      currentDuel ? client.from("duel_progress").select("*").eq("duel_id", currentDuel.id).returns<DuelProgressRow[]>() : null,
      roundList.length
        ? client.from("round_results").select("*").in("round_id", roundList.map((r) => r.id)).returns<RoundResultRow[]>()
        : null,
      currentRound ? client.from("round_done").select("*").eq("round_id", currentRound.id).returns<RoundDoneRow[]>() : null,
      stageId ? client.from(itemsTable).select("item_key, position").eq(stageColumn, stageId).order("position") : null,
      stageId ? client.from(choicesTable).select("item_key, position").eq(stageColumn, stageId).order("position") : null,
    ]);
    const itemKeys = (items?.data ?? []).map((r: { item_key: string }) => r.item_key);
    if (stageId && itemKeys.length > 0) memorizedRef.current = { stageId, keys: itemKeys };
    const memorized = memorizedRef.current;
    apply({
      room,
      players: players.data ?? [],
      teams: teams.data ?? [],
      duels: duelList,
      results: results?.data ?? [],
      progress: progress?.data ?? [],
      rounds: roundList,
      roundResults: roundResults?.data ?? [],
      roundDone: roundDone?.data ?? [],
      itemKeys,
      memorizedKeys: stageId && memorized?.stageId === stageId ? memorized.keys : [],
      choiceKeys: (choices?.data ?? []).map((r: { item_key: string }) => r.item_key),
    });
    setStatus("ready");
  }, [code, apply]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh().catch((e: Error) => setError(e.message)), 80);
    };

    (async () => {
      try {
        await ensureSession();
        const { data: auth } = await supabase().auth.getUser();
        if (cancelled) return;
        userIdRef.current = auth.user?.id ?? null;
        setUserId(auth.user?.id ?? null);
        const t0 = Date.now();
        const clock = await callMp<{ serverNow: number }>("time");
        offsetRef.current = clock.serverNow - (t0 + Date.now()) / 2;
        await refresh();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load the room.");
          setStatus("error");
        }
      }
    })();

    const client = supabase();
    const channel = client
      .channel(`room-changes:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "duel_progress" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "duel_results" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "round_done" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "round_results" }, schedule)
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(holdRef.current);
      holdRef.current = undefined;
      pendingRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [code, refresh]);

  const roomId = data.room?.id ?? null;
  const me = useMemo(() => data.players.find((p) => p.user_id === userId) ?? null, [data.players, userId]);
  const myPlayerId = me?.id ?? null;

  useEffect(() => {
    if (!roomId || !myPlayerId) return;
    const client = supabase();
    const presence = client.channel(`presence:${roomId}`, { config: { presence: { key: myPlayerId } } });
    presence
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(presence.presenceState()))))
      .subscribe((state) => {
        if (state === "SUBSCRIBED") void presence.track({ at: Date.now() });
      });
    const beat = () => void callMp("heartbeat", { roomId }).catch(() => undefined);
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    return () => {
      window.clearInterval(id);
      void client.removeChannel(presence);
    };
  }, [roomId, myPlayerId]);

  const room = data.room;
  const version = room?.phase_version ?? -1;
  const deadline =
    room?.phase_started_at && room.phase_duration_ms !== null
      ? Date.parse(room.phase_started_at) + room.phase_duration_ms
      : null;
  const isAdmin = Boolean(room && userId && room.admin_user_id === userId);

  const duel = useMemo(() => {
    if (!room) return null;
    if (isSquad(room)) return myDuel(data.duels, room.level, myPlayerId) ?? null;
    return data.duels.find((d) => d.level === room.level && d.duel_index === room.duel_index) ?? null;
  }, [data.duels, room, myPlayerId]);

  const round = useMemo(
    () => (room ? (data.rounds.find((r) => r.level === room.level) ?? null) : null),
    [data.rounds, room],
  );

  const duelist = Boolean(myPlayerId && duel && (duel.player_a === myPlayerId || duel.player_b === myPlayerId));

  useEffect(() => {
    if (!roomId || deadline === null) return;
    // The admin and the two duelists fire right away; spectators wait so one call usually wins.
    const first = isAdmin || duelist;
    const stagger = first ? Math.random() * 120 : 600 + Math.random() * 900;
    const wait = Math.max(0, deadline - (Date.now() + offsetRef.current)) + stagger;
    let retry: number | undefined;
    const fire = () => {
      void callMp("advance_phase", { roomId, expectedVersion: version }).catch(() => undefined);
      retry = window.setTimeout(fire, 2500);
    };
    const id = window.setTimeout(fire, wait);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(retry);
    };
  }, [roomId, version, deadline, isAdmin, duelist]);

  return { ...data, status, error, online, me, isAdmin, duel, round, now, refresh, noteTap };
}
