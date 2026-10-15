import { currentUser } from "@clerk/nextjs/server";
import { defaultPlayerName } from "@/lib/multiplayer/names";

/** Display name to prefill on create and join. Empty for guests. */
export async function signedInDefaultName(): Promise<string> {
  const user = await currentUser();
  return defaultPlayerName(user);
}
