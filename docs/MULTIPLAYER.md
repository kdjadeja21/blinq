# Blinq Multiplayer (v2)

Friends play team battles in a private room. The admin creates a room, players join with a 6-character code, teams form automatically, and teams fight through one-on-one memory duels, level by level. The PRD lists real-time multiplayer as a non-goal for v1, so this is a v2 feature that lives beside single player and does not change it.

Setup: [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Game flow

1. **Home:** Single player (the existing screen) or **Multiplayer**.
2. **Create:** name, number of levels (default 3), difficulty, pacing. The creator is the admin and a normal player. A code and share link are generated.
3. **Join:** code (or `/join/CODE`) plus a name for this room.
4. **Lobby:** everyone appears live. The admin can remove players and edit settings.
5. **Create teams (admin):** players are shuffled into Team A and Team B. With an odd count a computer player (Botty) joins the smaller team.
6. **Start game (admin):** duels run one at a time. A banner such as **John X Vin** shows on every screen, including for waiting players.
7. **Duel:** both see the same table (memorize), then pick the items out of a crowd (recall).
8. **Duel result:** winner, points, team totals. Next duel after the admin taps Next, or automatically in auto mode.
9. **Level result:** the team with the most points that level wins it. The next level has more items and freshly shuffled pairings.
10. **Final:** the team with the highest total wins.

## Rules

- **Teams:** two, as even as possible. Pairings are reshuffled every level and avoid earlier pairings while fresh ones exist (n players per team gives n fresh levels, then repeats are allowed). The bot rotates like any player.
- **Admin:** plays by default, controls pacing (manual or auto, switchable any time). If the admin is offline for 60 seconds, rights move to the earliest-joined online human. Host-only mode is future scope.
- **Duel winner:** the first player to recall every item wins and the duel ends at once. Otherwise more correct items wins, then the earlier last correct pick. Still tied is a draw.
- **Points:** `scoreRecall` in `src/lib/scoring.ts`, the same combo, speed-bonus and mistake rules as single player. Team score is the sum of its players' points.
- **Mistakes:** like single player, 3 wrong picks end your recall and each wrong pick costs 3 seconds of your own recall time.
- **Late joiners:** blocked once the game starts. A player who disconnects rejoins on the same device with the room code.
- **Size:** 2 to 12 human players, plus at most one bot.
- **Names:** 2 to 16 characters, unique in the room (case-insensitive), basic profanity filter.

### Difficulty and timers

| Difficulty | Items at level 1 | Added per level |
| --- | --- | --- |
| Easy | 4 | 1 |
| Medium | 6 | 2 |
| Hard | 8 | 2 |

Items are capped at 14. Medium is exactly the single-player ramp (`levelItemCount`). Memorize and recall times come from the existing `roundTimings`, so a duel with N items takes as long as a solo level with N items. The server stores both durations on the duel, so every screen uses the same numbers. Tune both in `src/lib/multiplayer/config.ts`.

### Pacing

- **Manual:** the admin taps Next after each duel result and Next level after each level result. Others see a waiting message.
- **Auto:** results show for 8 seconds (duel) or 10 seconds (level), then the game moves on.

## Room state machine

The room phase is one column, and every screen renders from it.

| Phase | Duration | Moves on when |
| --- | --- | --- |
| `lobby` | open | Admin creates teams |
| `teams_ready` | open | Admin starts the game |
| `duel_intro` | 5s | Timer ends |
| `memorize` | stored on the duel | Timer ends |
| `recall` | stored on the duel | Timer ends, or a player recalls every item |
| `duel_result` | 8s in auto mode | Auto: timer. Manual: admin taps Next |
| `level_result` | 10s in auto mode | Auto: timer. Manual: admin taps Next level |
| `finished` | n/a | Hourly cleanup deletes rooms over 1 hour old with no player active for 15 minutes (24h hard cap) |

## Architecture

```mermaid
flowchart LR
  client[Next.js client] -->|"POST /api/mp/action + JWT"| api[Route handler]
  api -->|service role writes| pg[(Supabase Postgres)]
  pg -->|Realtime Postgres Changes| client
  client -->|"RLS reads, Presence"| pg
  cron[pg_cron every 10s] -->|"pg_net POST /api/mp/sweep"| api
```

- **Auth:** anonymous sign-in gives each device a stable user id. The name is chosen per room.
- **Reads:** clients read only rows of their own room (RLS) and subscribe to changes. Presence shows who is online in the lobby.
- **Writes:** only the API writes game tables, using the service role. Clients cannot cheat on timing or answers.
- **Time:** the server clock is the truth. Rooms store `phase_started_at` and `phase_duration_ms`; clients draw countdowns from them, corrected by a one-time server clock offset (`time` action).
- **Hidden answers:** RLS lets players read `duel_items` only while the room is in `memorize` for that duel (or after the duel is done). `duel_choices` (targets mixed with decoys) opens from `memorize` and never says which are targets. `submissions` has no client access at all.
- **Idempotent phases:** `advance_phase` takes the `phase_version` the caller saw and swaps with a compare-and-set on it. Any client, the admin or the sweeper may call it; only one wins. Level building uses server-secret seeded randomness and ignore-duplicate inserts, so concurrent callers produce the same rows.
- **Bots:** a seeded `bot_plan` (recalls 70-90% of items, finishing between 60% and 90% of the recall time) is stored on the duel. The bot is scored by the same `scoreRecall` at resolve time, and clients animate its progress from the plan, so no live bot process exists.

### Actions

All are `POST /api/mp/<action>` with the user's access token. Code in `src/server/multiplayer/`.

| Action | Caller | What it does |
| --- | --- | --- |
| `create_room` | Anyone | Room, unique code, admin player. Max 5 rooms per hour per user. |
| `join_room` | Anyone | Lobby only, max 12, unique name. Existing members rejoin at any time. |
| `create_teams` | Admin | Shuffle into two teams, add a bot when odd, phase `teams_ready`. |
| `start_game` | Admin | Build level 1 (pairings, items, timers), phase `duel_intro`. |
| `submit_guess` | Duel player | Validates and stores a pick (optional `at`: client tap time on the server clock, clamped to the last 5s), updates live progress. Returns `correct`, `points`, `combo`, `correctCount`, `wrongCount`, `deadlineMs`, `ended`. Ends the duel when someone finds every item, or when both players are finished (out of lives, done early, or a bot opponent). |
| `finish_early` | Duel player | "I'm done": stops recall and banks the remaining time as a speed bonus. |
| `play_again` | Admin | After the final result: deletes the finished game and returns the room to the lobby. |
| `advance_phase` | Member / cron | Moves on after the deadline. Resolves duels, updates team scores, builds the next level. |
| `next_step` | Admin | Skips a result screen. |
| `update_settings` | Admin | Levels and difficulty before the game; pacing any time. |
| `leave_room`, `kick_player` | Player / Admin | Remove from lobby or `teams_ready` (teams reset). |
| `heartbeat` | Member | Marks the player online, triggers admin hand-over. |
| `time` | Anyone signed in | Server clock for countdown correction. |
| `sweep` | Cron secret | Advances overdue rooms. |

Guess limits: 3 per second per player, and no picks after the player's recall deadline plus a 1-second grace.

## How this differs from the original plan

The plan was adapted to the code we already have.

| Plan | In this project | Why |
| --- | --- | --- |
| Typed guesses matched against an item catalog with synonyms | Players tap items from a choice grid; `submit_guess` takes an item key | That is how Blinq is played. No catalog table: items stay in `src/lib/items.ts`, the DB stores keys only. |
| Timers of 5s per item, 20s minimum | The existing `roundTimings` | One source of truth for pacing, duels feel like solo levels. |
| New scoring | `scoreRecall`, built from the same helpers the single-player reducer uses (`nextCombo`, `pointsForCombo`) | No second formula. Lives and time penalties carry over. |
| Supabase Edge Functions | Next.js route handlers | The scoring, choices and RNG code is TypeScript in `src/lib` and is reused as-is, with no duplicate Deno copy. Same security model (service role, JWT check). |
| Live progress via Broadcast | `duel_progress` table via Postgres Changes | Serverless functions cannot hold sockets, and the table gives free RLS and reconnect behavior. |
| Admin offline detection | Heartbeat every 20s (`last_seen_at`) | The server cannot read Presence. Presence still drives the online dots. |
| Separate `items` table | Dropped | See first row. |

## Code map

| Path | Purpose |
| --- | --- |
| `supabase/migrations/` | Schema, RLS, realtime publication |
| `supabase/cron.sql` | Sweeper and cleanup jobs (run manually, needs your URL) |
| `src/lib/multiplayer/` | Pure rules: config, pairing, winner, bots, names, types |
| `src/lib/scoring.ts` | Shared scoring, including `scoreRecall` |
| `src/server/multiplayer/` | Actions and database access (server only) |
| `src/app/api/mp/[action]/route.ts` | HTTP entry point |
| `src/components/multiplayer/` | Screens and the `useRoom` hook |
| `src/app/multiplayer`, `room/create`, `room/[code]`, `join`, `join/[code]` | Routes |

## Future scope

- Host-only mode (admin runs the room without playing).
- Reactions or chat while waiting for a duel.
- Restore a player's own picks after a mid-recall reload (picks are kept server-side; only the local highlight is lost).
- CAPTCHA widget and a maintained profanity list (see Hardening in the setup guide).

## Instant tap feedback

During memorize each duel player already receives the table (RLS only exposes `duel_items` in that phase). `useRoom` keeps those keys as `memorizedKeys`, and `useDuelPicks` judges taps against them locally with the shared `scoreRecall` rules, exactly like single-player. Taps are queued and sent to `submit_guess` in order in the background. The server stays authoritative: if its answer differs, or it rejects a tap, the local state is corrected. A client that joined late (no memorized table) falls back to waiting for the server's answer.

## Avatars and timers

- Every player gets an emoji avatar, assigned server-side when they join. It is unique within a room (partial unique index on `players(room_id, avatar)`); bots use 🤖. Older rows without one fall back to a stable hash of the player id (`avatarFor`).
- Duel timers: memorize and recall each last `7s + 1.5s per item`, capped at 30s (`duelTimings` in `src/lib/multiplayer/config.ts`). Duels already created keep their stored durations.
