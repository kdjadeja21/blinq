import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ErrorNote } from "./shared";

/** Shown when a join link does not match an open room. */
export function MissingRoom({ code }: { code: string }) {
  const shown = code.trim().slice(0, 32);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Link href="/multiplayer" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="text-center">
        <p aria-hidden className="text-6xl">
          🎟️
        </p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">No room with that code</h1>
        <p className="mt-1 text-sm text-muted-foreground">Check the code with your host, or enter a different one.</p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border-2 bg-gradient-to-b from-primary/15 to-card p-4 shadow-lg">
        {shown ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Room code</span>
            <p className="break-all rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-center font-mono text-3xl font-extrabold tracking-[0.25em]">
              {shown}
            </p>
          </div>
        ) : null}
        <ErrorNote message="No room with that code." />
        <Link href="/join" className={buttonVariants({ variant: "success", className: "h-14 rounded-3xl text-lg" })}>
          Enter another code
        </Link>
      </div>
    </main>
  );
}
