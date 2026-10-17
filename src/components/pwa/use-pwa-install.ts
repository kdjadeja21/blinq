"use client";

import { useSyncExternalStore } from "react";
import { getDisplaySurface, type DisplaySurface } from "@/lib/pwa/display";
import {
  dismissInstallPrompt,
  getDeferredPrompt,
  getInstallDismissed,
  isMobileDevice,
  promptInstall,
  readDeviceProbe,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

function noopSubscribe() {
  return () => {};
}

export function usePwaInstall() {
  const platform = useSyncExternalStore<DisplaySurface | null>(
    noopSubscribe,
    getDisplaySurface,
    () => null,
  );
  const isMobile = useSyncExternalStore(
    noopSubscribe,
    () => isMobileDevice(readDeviceProbe()),
    () => false,
  );
  const dismissed = useSyncExternalStore(subscribeInstallPrompt, getInstallDismissed, () => false);
  const deferred = useSyncExternalStore<BeforeInstallPromptEvent | null>(
    subscribeInstallPrompt,
    getDeferredPrompt,
    () => null,
  );

  return {
    platform,
    isMobile,
    dismissed,
    deferred,
    dismiss: dismissInstallPrompt,
    install: promptInstall,
  };
}
