"use client";

import { ArrowLeft, Download, Share } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import type { DisplaySurface } from "@/lib/pwa/display";
import { manualInstallHint, type BeforeInstallPromptEvent } from "@/lib/pwa/install";

function noopSubscribe() {
  return () => {};
}

function readUserAgent() {
  return navigator.userAgent;
}

function InstallBody({
  platform,
  deferred,
  userAgent,
  install,
}: {
  platform: DisplaySurface | null;
  deferred: BeforeInstallPromptEvent | null;
  userAgent: string;
  install: () => Promise<void>;
}) {
  if (platform === null) {
    return <p className="text-sm text-muted-foreground">Checking this device…</p>;
  }
  if (deferred && platform !== "standalone") {
    return (
      <>
        <p className="text-sm text-muted-foreground">Add Blinq like an app. You can still play in the browser.</p>
        <Button variant="game" className="mt-4 h-12 w-full rounded-2xl" onClick={() => void install()}>
          <Download />
          Install
        </Button>
      </>
    );
  }
  switch (platform) {
    case "standalone":
      return (
        <>
          <p className="text-sm font-bold">Blinq is already on your home screen</p>
          <p className="mt-1 text-sm text-muted-foreground">Open the app icon anytime to play.</p>
          <Link href="/" className={buttonVariants({ variant: "game", className: "mt-4 h-12 w-full rounded-2xl" })}>
            Back to play
          </Link>
        </>
      );
    case "ios":
      return (
        <p className="text-sm text-muted-foreground">
          Tap <Share className="inline size-3.5 align-text-bottom" aria-label="Share" /> then
          &ldquo;Add to Home Screen&rdquo;.
        </p>
      );
    case "other":
      return <p className="text-sm text-muted-foreground">{manualInstallHint(userAgent)}</p>;
    default: {
      const unreachable: never = platform;
      return unreachable;
    }
  }
}

export function InstallPage() {
  const { platform, deferred, install } = usePwaInstall();
  const userAgent = useSyncExternalStore(noopSubscribe, readUserAgent, () => "");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Link href="/" className="flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Home
      </Link>
      <div className="text-center">
        <p className="text-7xl" aria-hidden>
          🧠
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Install Blinq</h1>
        <p className="mt-2 text-sm text-muted-foreground">Play full screen from your home screen.</p>
      </div>
      <section className="rounded-3xl border-2 bg-card p-4 shadow-lg">
        <InstallBody platform={platform} deferred={deferred} userAgent={userAgent} install={install} />
      </section>
    </main>
  );
}
