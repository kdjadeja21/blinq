"use client";

import { GoogleOneTap, Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
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

/** One-liner under the main play button. Renders nothing once the player is signed in. */
export function GuestHint() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return (
    <p className="-mt-2 text-center text-xs text-muted-foreground">
      Playing as guest, progress stays on this device.{" "}
      <SignInButton mode="modal">
        <button type="button" className="font-bold text-primary underline underline-offset-2">
          Sign in to save
        </button>
      </SignInButton>
    </p>
  );
}
