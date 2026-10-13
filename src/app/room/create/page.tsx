import type { Metadata } from "next";
import { CreateRoom } from "@/components/multiplayer/CreateRoom";

export const metadata: Metadata = { title: "Create a room - Blinq" };

export default function CreateRoomPage() {
  return <CreateRoom />;
}
