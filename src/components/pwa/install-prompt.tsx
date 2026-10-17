"use client";

import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";

export function InstallPrompt() {
  const { platform, isMobile, dismissed, deferred, dismiss, install } = usePwaInstall();

  if (dismissed || !isMobile || platform === null || platform === "standalone") return null;
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
        <Button variant="game" size="lg" onClick={() => void install()}>
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
