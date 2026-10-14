"use client";

import { GoogleOneTap, Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Header control for solo play: sign in when signed out, account menu when signed in. */
export function SoloAuthControl({ showSignIn }: { showSignIn: boolean }) {
  return (
    <>
      <Show when="signed-out">
        {showSignIn ? (
          <>
            <SignInButton mode="modal">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </SignInButton>
            <GoogleOneTap />
          </>
        ) : null}
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}

/** Explains guest vs signed-in state on the solo home screen. */
export function SoloAccountCard() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null;

  if (user) {
    const name = user.firstName ?? user.username ?? "player";
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3" role="status">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-black" aria-hidden>
          <Check className="size-4" />
        </span>
        <p className="text-sm">
          <span className="font-bold">Signed in as {name}.</span>{" "}
          <span className="text-muted-foreground">Your solo progress is saved to your account.</span>
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border-2 bg-card p-4" aria-labelledby="guest-title">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden>
          <UserRound className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <h2 id="guest-title" className="text-sm font-bold">
            Playing as a guest
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your progress is saved on this device only. Sign in with Google to keep it on every device.
          </p>
        </div>
      </div>
      <SignInButton mode="modal">
        <Button variant="secondary" className="mt-3 h-11 w-full rounded-2xl">
          Sign in to save progress
        </Button>
      </SignInButton>
      <p className="mt-2 text-center text-xs text-muted-foreground">No account needed to play. Multiplayer never needs one.</p>
    </section>
  );
}
