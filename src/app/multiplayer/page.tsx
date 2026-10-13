import type { Metadata } from "next";
import { MultiplayerMenu } from "@/components/multiplayer/MultiplayerMenu";

export const metadata: Metadata = { title: "Team battle - Blinq" };

export default function MultiplayerPage() {
  return <MultiplayerMenu />;
}
