"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { shareUrl } from "@/lib/multiplayer/share";
import { getDisplaySurface, type DisplaySurface } from "@/lib/pwa/display";
import { queryRelatedPwaInstalled } from "@/lib/pwa/relatedApps";

function noopSubscribe() {
  return () => {};
}

export function OpenInAppHandoff({ code }: { code: string }) {
  const surface = useSyncExternalStore<DisplaySurface | null>(noopSubscribe, getDisplaySurface, () => null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!surface || surface === "standalone") return;
    let cancelled = false;
    void queryRelatedPwaInstalled().then((value) => {
      if (!cancelled) setInstalled(value);
    });
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (!surface || surface === "standalone" || !installed) return null;

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 shadow-lg" aria-label="Open in Blinq">
      <div>
        <p className="text-sm font-bold">Continue in Blinq</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This invite can open in your installed app.
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
