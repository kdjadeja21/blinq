import type { Metadata } from "next";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";

export const metadata: Metadata = { title: "Join a room - Blinq" };

export default function JoinPage() {
  return <JoinRoom />;
}
