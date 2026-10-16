import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";
import { MissingRoom } from "@/components/multiplayer/MissingRoom";
import { signedInDefaultName } from "@/server/multiplayer/playerName";
import { findOpenRoomByCode } from "@/server/multiplayer/queries";

const TITLE = "You're invited to a Blinq multiplayer battle";
const DESCRIPTION = "Think you've got a sharp memory? Join the room before we start.";

export const metadata: Metadata = {
  title: "Join a room - Blinq",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Blinq — Memory workout, with fun" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

async function JoinWithCode({ params }: Pick<PageProps<"/join/[code]">, "params">) {
  const { code } = await params;
  const [room, defaultName] = await Promise.all([findOpenRoomByCode(code), signedInDefaultName()]);
  if (!room) return <MissingRoom code={code} />;
  return <JoinRoom initialCode={room.code} defaultName={defaultName} />;
}

export default function JoinCodePage({ params }: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={null}>
      <JoinWithCode params={params} />
    </Suspense>
  );
}
