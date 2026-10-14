"use client";

import { GoogleOneTap, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Header control for solo play: sign in when signed out, account menu when signed in. */
export function SoloAuthControl({ showSignIn }: { showSignIn: boolean }) {
  return (
    <>
      <Show when="signed-out">
        {showSignIn ? (
          <>
            <SignInButton mode="modal">
              <Button
                size="sm"
                variant="outline"
                title="Playing as a guest: progress is saved on this device only. Sign in to keep it on every device."
              >
                <UserRound /> Guest
                <span className="font-bold text-primary">Sign in</span>
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
