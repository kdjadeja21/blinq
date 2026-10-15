import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";
import { MissingRoom } from "@/components/multiplayer/MissingRoom";
import { signedInDefaultName } from "@/server/multiplayer/playerName";
import { findOpenRoomByCode } from "@/server/multiplayer/queries";

export const metadata: Metadata = { title: "Join a room - Blinq" };

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
