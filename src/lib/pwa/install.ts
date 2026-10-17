export const DISMISS_KEY = "blinq:install-dismissed:v1";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type DeviceProbe = {
  userAgent: string;
  maxTouchPoints: number;
  pointerCoarse: boolean;
  maxWidth768: boolean;
};

export function readDeviceProbe(): DeviceProbe {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints;
  if (typeof matchMedia !== "function") {
    return { userAgent: ua, maxTouchPoints, pointerCoarse: false, maxWidth768: false };
  }
  return {
    userAgent: ua,
    maxTouchPoints,
    pointerCoarse: matchMedia("(pointer: coarse)").matches,
    maxWidth768: matchMedia("(max-width: 768px)").matches,
  };
}

/** Phones and tablets. Desktop/laptop is false even in a narrow window. */
export function isMobileDevice(probe: DeviceProbe = readDeviceProbe()): boolean {
  const ua = probe.userAgent;
  const phoneUa = /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  const iPad = /iPad/i.test(ua) || (ua.includes("Mac") && probe.maxTouchPoints > 1);
  if (phoneUa || iPad) return true;
  return probe.pointerCoarse && probe.maxWidth768;
}

export function manualInstallHint(userAgent: string): string {
  if (/Edg\//.test(userAgent)) {
    return "Open the browser menu and choose Install Blinq.";
  }
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent) && !/OPR\//.test(userAgent)) {
    return "Open the Chrome menu and choose Install Blinq.";
  }
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|Android/i.test(userAgent)) {
    return "Use Share or File, then Add to Dock or Home Screen.";
  }
  return "Use your browser menu to install this site, or open Blinq in Chrome or Edge.";
}

export function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

type Listener = () => void;

const listeners = new Set<Listener>();

let deferred: BeforeInstallPromptEvent | null = null;
let dismissed = false;
let listening = false;
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

function hydrateDismissed() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  dismissed = readDismissed();
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  hydrateDismissed();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribeInstallPrompt(listener: Listener) {
  ensureListening();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredPrompt() {
  return deferred;
}

export function getInstallDismissed() {
  hydrateDismissed();
  return dismissed;
}

export function dismissInstallPrompt() {
  dismissed = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // private mode or disabled storage
  }
  emit();
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  emit();
}
