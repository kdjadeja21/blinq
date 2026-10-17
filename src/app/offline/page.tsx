import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — Blinq",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-7xl" aria-hidden>
        🧠
      </div>
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        Blinq needs a connection to play. Reconnect and your memory workout will be right here.
      </p>
    </main>
  );
}
