import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomView } from "@/components/multiplayer/RoomView";

export const metadata: Metadata = { title: "Room - Blinq" };

async function RoomWithCode({ params }: Pick<PageProps<"/room/[code]">, "params">) {
  const { code } = await params;
  return <RoomView code={code.toUpperCase()} />;
}

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={null}>
      <RoomWithCode params={params} />
    </Suspense>
  );
}
