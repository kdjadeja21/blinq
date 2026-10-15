import type { Metadata } from "next";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";
import { signedInDefaultName } from "@/server/multiplayer/playerName";

export const metadata: Metadata = { title: "Join a room - Blinq" };

export default async function JoinPage() {
  return <JoinRoom defaultName={await signedInDefaultName()} />;
}
