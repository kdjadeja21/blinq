import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinRoom } from "@/components/multiplayer/JoinRoom";

export const metadata: Metadata = { title: "Join a room - Blinq" };

async function JoinWithCode({ params }: Pick<PageProps<"/join/[code]">, "params">) {
  const { code } = await params;
  return <JoinRoom initialCode={code} />;
}

export default function JoinCodePage({ params }: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={null}>
      <JoinWithCode params={params} />
    </Suspense>
  );
}
