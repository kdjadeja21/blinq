import { auth } from "@clerk/nextjs/server";
import { ApiError } from "@/server/multiplayer/db";
import { recordRound, sync } from "@/server/solo/stats";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/solo/[action]">) {
  const { action } = await ctx.params;
  try {
    const { userId } = await auth();
    if (!userId) throw new ApiError(401, "Sign in to save your progress.");
    const body = await readBody(request);
    switch (action) {
      case "sync":
        return Response.json(await sync(userId, body));
      case "record_round":
        return Response.json(await recordRound(userId, body));
      default:
        throw new ApiError(404, "Unknown action.");
    }
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    console.error(`solo/${action} failed`, error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
