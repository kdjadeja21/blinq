"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HEARTBEAT_MS } from "@/lib/multiplayer/config";
import { callMp, withTimeout } from "@/lib/multiplayer/api";
import type {
  DuelProgressRow,
  DuelResultRow,
  DuelRow,
  PlayerRow,
  RoomRow,
  TeamRow,
} from "@/lib/multiplayer/types";
import { ensureUser, supabase } from "@/lib/supabase/client";

const INIT_TIMEOUT_MS = 15000;

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
  /** item keys on the table; only filled while the server allows reading them */
  itemKeys: string[];
  choiceKeys: string[];
  /** the table as seen during memorize; kept so recall can judge taps without a server round trip */
  memorizedKeys: string[];
  online: Set<string>;
  me: PlayerRow | null;
  isAdmin: boolean;
  duel: DuelRow | null;
  /** Server-corrected clock in ms. */
  now: () => number;
  /** Re-reads the room immediately instead of waiting for a realtime event. */
  refresh: () => Promise<void>;
}

const EMPTY: Omit<RoomState, "now" | "refresh"> = {
  status: "loading",
  error: null,
  room: null,
  players: [],
  teams: [],
  duels: [],
  results: [],
  progress: [],
  itemKeys: [],
  choiceKeys: [],
  memorizedKeys: [],
  online: new Set(),
  me: null,
  isAdmin: false,
  duel: null,
};

type Data = Omit<RoomState, "now" | "refresh" | "online" | "status" | "error" | "me" | "isAdmin" | "duel">;
const EMPTY_DATA: Data = {
  room: null,
  players: [],
  teams: [],
  duels: [],
  results: [],
  progress: [],
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
  const memorizedRef = useRef<{ duelId: string; keys: string[] } | null>(null);

  const epochRef = useRef(0);

  // Next keeps a visited room mounted but hidden (Activity). Drop everything we learned when it is hidden, so a
  // re-shown instance starts from "loading" and re-reads, instead of acting on a stale "not_member" and
  // redirecting before any fresh read. The epoch also discards reads that were still in flight when it hid.
  useLayoutEffect(() => {
    return () => {
      epochRef.current += 1;
      roomIdRef.current = null;
      memorizedRef.current = null;
      setStatus(EMPTY.status);
      setError(null);
      setData(EMPTY_DATA);
      setOnline(EMPTY.online);
    };
  }, [code]);

  const now = useCallback(() => Date.now() + offsetRef.current, []);

  const refresh = useCallback(async () => {
    const epoch = epochRef.current;
    const client = supabase();
    const lookup = async () => client.from("rooms").select("*").eq("code", code).maybeSingle<RoomRow>();
    let { data: room, error: roomError } = await lookup();
    // Right after joining, the first read can race the session/membership; retry before deciding we are not a member.
    for (let attempt = 0; attempt < 3 && !room; attempt++) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      ({ data: room, error: roomError } = await lookup());
    }
    if (epoch !== epochRef.current) return;
    if (roomError) throw new Error(roomError.message);
    if (!room) {
      setStatus("not_member");
      return;
    }
    roomIdRef.current = room.id;
    const [players, teams, duels] = await Promise.all([
      client.from("players").select("*").eq("room_id", room.id).order("joined_at").returns<PlayerRow[]>(),
      client.from("teams").select("*").eq("room_id", room.id).order("name").returns<TeamRow[]>(),
      client.from("duels").select("*").eq("room_id", room.id).order("level").order("duel_index").returns<DuelRow[]>(),
    ]);
    const duelList = duels.data ?? [];
    const current = duelList.find((d) => d.level === room.level && d.duel_index === room.duel_index);
    const [results, progress, items, choices] = await Promise.all([
      duelList.length
        ? client.from("duel_results").select("*").in("duel_id", duelList.map((d) => d.id)).returns<DuelResultRow[]>()
        : null,
      current ? client.from("duel_progress").select("*").eq("duel_id", current.id).returns<DuelProgressRow[]>() : null,
      current
        ? client.from("duel_items").select("item_key, position").eq("duel_id", current.id).order("position")
        : null,
      current
        ? client.from("duel_choices").select("item_key, position").eq("duel_id", current.id).order("position")
        : null,
    ]);
    if (epoch !== epochRef.current) return;
    const itemKeys = (items?.data ?? []).map((r: { item_key: string }) => r.item_key);
    if (current && itemKeys.length > 0) memorizedRef.current = { duelId: current.id, keys: itemKeys };
    const memorized = memorizedRef.current;
    setData({
      room,
      players: players.data ?? [],
      teams: teams.data ?? [],
      duels: duelList,
      results: results?.data ?? [],
      progress: progress?.data ?? [],
      itemKeys,
      memorizedKeys: current && memorized?.duelId === current.id ? memorized.keys : [],
      choiceKeys: (choices?.data ?? []).map((r: { item_key: string }) => r.item_key),
    });
    setStatus("ready");
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh().catch((e: Error) => setError(e.message)), 80);
    };

    (async () => {
      try {
        await withTimeout(
          (async () => {
            const { userId: id } = await ensureUser();
            if (cancelled) return;
            setUserId(id);
            const t0 = Date.now();
            const clock = await callMp<{ serverNow: number }>("time");
            offsetRef.current = clock.serverNow - (t0 + Date.now()) / 2;
            await refresh();
          })(),
          INIT_TIMEOUT_MS,
          "Loading the room timed out. Please try again.",
        );
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
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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

  const duel = useMemo(
    () => (room ? (data.duels.find((d) => d.level === room.level && d.duel_index === room.duel_index) ?? null) : null),
    [data.duels, room],
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

  return { ...data, status, error, online, me, isAdmin, duel, now, refresh };
}
