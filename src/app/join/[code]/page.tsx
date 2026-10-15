import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";
import { MissingRoom } from "@/components/multiplayer/MissingRoom";
import { normalizeCode } from "@/lib/multiplayer/names";
import { roomInviteMetaDescription, roomInviteMetaTitle } from "@/lib/multiplayer/share";
import { signedInDefaultName } from "@/server/multiplayer/playerName";
import { findHostName, findOpenRoomByCode } from "@/server/multiplayer/queries";

const FALLBACK_TITLE = "Join a room - Blinq";

export async function generateMetadata({ params }: PageProps<"/join/[code]">): Promise<Metadata> {
  const { code: raw } = await params;
  const room = await findOpenRoomByCode(raw);
  if (!room) return { title: FALLBACK_TITLE };
  const title = roomInviteMetaTitle(await findHostName(room));
  const description = roomInviteMetaDescription(room.code);
  const host = (await headers()).get("host");
  const proto = host?.startsWith("localhost") ? "http" : "https";
  const image = `${host ? `${proto}://${host}` : ""}/api/share/room?c=${normalizeCode(raw) ?? room.code}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

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
