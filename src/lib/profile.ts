import { useSyncExternalStore } from "react";

const KEY = "blinq:profiles:v1";
export const DEFAULT_PROFILE_ID = "default";
export const MAX_PROFILES = 6;
const MAX_NAME_LENGTH = 16;

export interface Profile {
  id: string;
  name: string;
  /** kids profile: easy-style timing, smaller grids, visual skills first */
  kids: boolean;
}

export interface ProfileState {
  active: string;
  profiles: Profile[];
}

export const DEFAULT_PROFILES: ProfileState = {
  active: DEFAULT_PROFILE_ID,
  profiles: [{ id: DEFAULT_PROFILE_ID, name: "Me", kids: false }],
};

/** The default profile keeps the original storage keys so existing progress is untouched. */
export function scopedKey(base: string, profileId: string): string {
  return profileId === DEFAULT_PROFILE_ID ? base : `${base}:${profileId}`;
}

export function parseProfiles(raw: string | null): ProfileState {
  if (!raw) return DEFAULT_PROFILES;
  try {
    const data = JSON.parse(raw) as Partial<ProfileState>;
    const profiles = (data.profiles ?? []).filter(
      (p): p is Profile => typeof p?.id === "string" && typeof p.name === "string" && typeof p.kids === "boolean",
    );
    if (!profiles.some((p) => p.id === DEFAULT_PROFILE_ID)) profiles.unshift(DEFAULT_PROFILES.profiles[0]);
    const active = profiles.some((p) => p.id === data.active) ? (data.active as string) : DEFAULT_PROFILE_ID;
    return { active, profiles };
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function addProfile(state: ProfileState, name: string, kids: boolean, id: string): ProfileState {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed || state.profiles.length >= MAX_PROFILES || state.profiles.some((p) => p.id === id)) return state;
  return { active: id, profiles: [...state.profiles, { id, name: trimmed, kids }] };
}

export function selectProfile(state: ProfileState, id: string): ProfileState {
  return state.profiles.some((p) => p.id === id) ? { ...state, active: id } : state;
}

export function activeProfile(state: ProfileState): Profile {
  return state.profiles.find((p) => p.id === state.active) ?? state.profiles[0];
}

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribeProfiles(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function loadProfiles(): ProfileState {
  return parseProfiles(readRaw());
}

export function saveProfiles(state: ProfileState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: profiles last for this session only
  }
  listeners.forEach((l) => l());
}

export function activeProfileId(): string {
  return activeProfile(loadProfiles()).id;
}

/** The active profile, or null on the server and during hydration. */
export function useProfiles(): ProfileState | null {
  const raw = useSyncExternalStore(subscribeProfiles, () => readRaw() ?? "", () => null);
  return raw === null ? null : parseProfiles(raw || null);
}
