"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "blinq:install-dismissed:v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "standalone" | "ios" | "other";

function noopSubscribe() {
  return () => {};
}

function getPlatform(): Platform {
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  return isIos ? "ios" : "other";
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const platform = useSyncExternalStore<Platform | null>(noopSubscribe, getPlatform, () => null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (dismissed || platform === null || platform === "standalone") return null;
  const showIosHint = platform === "ios";
  if (!showIosHint && !deferred) return null;

  return (
    <div
      role="region"
      aria-label="Install Blinq"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Install Blinq</p>
        {showIosHint ? (
          <p className="text-xs text-muted-foreground">
            Tap <Share className="inline size-3.5 align-text-bottom" aria-label="Share" /> then
            &ldquo;Add to Home Screen&rdquo;.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Play full screen from your home screen.</p>
        )}
      </div>
      {!showIosHint && (
        <Button variant="game" size="lg" onClick={install}>
          <Download data-icon="inline-start" />
          Install
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss install prompt">
        <X />
      </Button>
    </div>
  );
}
