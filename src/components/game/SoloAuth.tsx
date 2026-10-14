"use client";

import { GoogleOneTap, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { GUEST_MAX_LEVEL } from "@/lib/solo/guest";

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

/** Solo-only note shown under the play button for guests. Never rendered for signed-in players. */
export function GuestHint({ locked }: { locked: boolean }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      {locked ? "Guest levels cleared. " : `Solo guests can play levels 1-${GUEST_MAX_LEVEL}. `}
      <SignInButton mode="modal">
        <button type="button" className="font-bold text-primary underline underline-offset-2">
          {locked ? "Sign in to keep going" : "Sign in to unlock more"}
        </button>
      </SignInButton>
    </p>
  );
}
