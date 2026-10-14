"use client";

import { GoogleOneTap, Show, SignInButton, UserButton } from "@clerk/nextjs";
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
