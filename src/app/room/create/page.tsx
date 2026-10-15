import type { Metadata } from "next";
import { CreateRoom } from "@/components/multiplayer/CreateRoom";
import { signedInDefaultName } from "@/server/multiplayer/playerName";

export const metadata: Metadata = { title: "Create a room - Blinq" };

export default async function CreateRoomPage() {
  return <CreateRoom defaultName={await signedInDefaultName()} />;
}
