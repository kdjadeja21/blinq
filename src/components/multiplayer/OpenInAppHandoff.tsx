"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { shareUrl } from "@/lib/multiplayer/share";
import { getDisplaySurface, type DisplaySurface } from "@/lib/pwa/display";

function noopSubscribe() {
  return () => {};
}

export function OpenInAppHandoff({ code }: { code: string }) {
  const surface = useSyncExternalStore<DisplaySurface | null>(noopSubscribe, getDisplaySurface, () => null);
  if (!surface || surface === "standalone") return null;

  if (surface === "ios") {
    return (
      <section className="rounded-3xl border-2 bg-card p-4 shadow-lg" aria-label="Open Blinq from Home Screen">
        <p className="text-sm font-bold">Already installed?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          iPhone opens this link in Safari. Open Blinq from your Home Screen and enter code{" "}
          <span className="font-mono font-extrabold tracking-widest text-foreground tabular-nums">{code}</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 shadow-lg" aria-label="Open in Blinq">
      <div>
        <p className="text-sm font-bold">Have the Blinq app?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open this invite in the installed app instead of the browser.
        </p>
      </div>
      <a
        href={shareUrl(code)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "game", className: "h-12 rounded-2xl" })}
      >
        <Smartphone />
        Open in Blinq
      </a>
    </section>
  );
}
