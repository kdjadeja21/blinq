import { ApiError, isCronRequest, userIdFromRequest } from "@/server/multiplayer/db";
import { isUserAction, runUserAction, sweep } from "@/server/multiplayer/actions";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/mp/[action]">) {
  const { action } = await ctx.params;
  try {
    if (action === "sweep") {
      if (!isCronRequest(request)) throw new ApiError(401, "Not allowed.");
      return Response.json(await sweep());
    }
    if (!isUserAction(action)) throw new ApiError(404, "Unknown action.");
    const userId = await userIdFromRequest(request);
    return Response.json(await runUserAction(action, userId, await readBody(request)));
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    console.error(`mp/${action} failed`, error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
