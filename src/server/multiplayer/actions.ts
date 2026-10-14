import { ApiError } from "./db";
import {
  createRoom,
  createTeams,
  heartbeat,
  joinRoom,
  kickPlayer,
  leaveRoom,
  playAgain,
  startGame,
  updateSettings,
} from "./lobby";
import { requireMember } from "./queries";
import { finishRoundEarly, submitRoundGuess } from "./rounds";
import { advancePhase, finishEarly, nextStep, submitGuess, sweep } from "./phases";

export const USER_ACTIONS = [
  "create_room",
  "join_room",
  "create_teams",
  "start_game",
  "play_again",
  "submit_guess",
  "finish_early",
  "advance_phase",
  "next_step",
  "update_settings",
  "leave_room",
  "kick_player",
  "heartbeat",
  "time",
] as const;
export type UserAction = (typeof USER_ACTIONS)[number];

export function isUserAction(value: string): value is UserAction {
  return (USER_ACTIONS as readonly string[]).includes(value);
}

type Body = Record<string, unknown>;

function str(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || !value) throw new ApiError(400, `Missing ${key}.`);
  return value;
}

export async function runUserAction(action: UserAction, userId: string, body: Body): Promise<unknown> {
  switch (action) {
    case "create_room":
      return createRoom(userId, body.name, body);
    case "join_room":
      return joinRoom(userId, body.code, body.name);
    case "create_teams":
      return createTeams(userId, str(body, "roomId"));
    case "start_game":
      return startGame(userId, str(body, "roomId"));
    case "play_again":
      return playAgain(userId, str(body, "roomId"));
    case "submit_guess":
      return body.roundId === undefined
        ? submitGuess(userId, body.duelId, body.itemKey, body.at)
        : submitRoundGuess(userId, body.roundId, body.itemKey, body.at);
    case "finish_early":
      return body.roundId === undefined ? finishEarly(userId, body.duelId) : finishRoundEarly(userId, body.roundId);
    case "advance_phase": {
      const roomId = str(body, "roomId");
      await requireMember(roomId, userId);
      const { advanced } = await advancePhase(roomId, Number(body.expectedVersion));
      return { advanced };
    }
    case "next_step": {
      const { advanced } = await nextStep(userId, str(body, "roomId"), Number(body.expectedVersion));
      return { advanced };
    }
    case "update_settings":
      return updateSettings(userId, str(body, "roomId"), body);
    case "leave_room":
      return leaveRoom(userId, str(body, "roomId"));
    case "kick_player":
      return kickPlayer(userId, str(body, "roomId"), body.playerId);
    case "heartbeat":
      return heartbeat(userId, str(body, "roomId"));
    case "time":
      return { serverNow: Date.now() };
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export { sweep };
