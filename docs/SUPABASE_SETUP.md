# Connect Supabase to Blinq

Multiplayer needs one Supabase project. Single-player does not use it and keeps working without any of this.

Everything is checked in: the schema is [`supabase/migrations/`](../supabase/migrations), the scheduled jobs are [`supabase/cron.sql`](../supabase/cron.sql), and the env variables are listed in [`.env.example`](../.env.example). For how multiplayer works, read [MULTIPLAYER.md](MULTIPLAYER.md).

## What you will have at the end

| Piece | Where it lives |
| --- | --- |
| Tables, RLS policies, realtime publication | Supabase Postgres (from the migration) |
| Anonymous sign-in | Supabase Auth |
| Game actions (`/api/mp/*`) | This Next.js app, using the service-role key |
| Sweeper and room cleanup | Supabase `pg_cron` calling `/api/mp/sweep` |

## 1. Create the project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). Pick a region close to your Vercel region.
2. Open **Project Settings > API** and keep this page open. You need the project URL, the `anon` (or publishable) key and the `service_role` key.

## 2. Enable anonymous sign-ins

**Authentication > Sign In / Providers > Anonymous Sign-Ins: on.**

Every device gets a user id with no signup. Optionally turn on **Attack Protection > CAPTCHA** (see Hardening below).

## 3. Create the schema

Pick one.

**A. Supabase CLI (recommended, repeatable)**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # the id in your project URL
npx supabase db push
```

**B. SQL editor (no CLI)**

Open **SQL Editor**, paste the whole file in `supabase/migrations/20261013000000_multiplayer.sql` and run it once. Do not run it twice.

Then check **Database > Replication** (or **Publications > supabase_realtime**): `rooms`, `teams`, `players`, `duels`, `duel_progress` and `duel_results` must be listed.

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill it in.

| Variable | Where to find it | Exposed to the browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > `anon` / publishable key | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings > API > `service_role` key | **no, server only** |
| `MULTIPLAYER_SEED_SECRET` | `openssl rand -hex 32` | no |
| `MULTIPLAYER_CRON_SECRET` | `openssl rand -hex 32` | no |

Rules:

- Never prefix the service-role key with `NEXT_PUBLIC_` and never commit `.env.local`. The service role bypasses RLS.
- `MULTIPLAYER_SEED_SECRET` keeps the item draws and pairings unpredictable. Changing it mid-game changes nothing already stored, but keep it stable.

Run it locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/multiplayer](http://localhost:3000/multiplayer), create a room, and open the share link in a second browser profile (a private window works too, it gets its own anonymous user).

## 5. Deploy

1. Add the same five variables in **Vercel > Project > Settings > Environment Variables** (Production and Preview). Mark the three secrets as sensitive.
2. Deploy. Note the production URL, for example `https://blinq.example.com`.

## 6. Schedule the sweeper and cleanup

The sweeper advances rooms whose timer ran out when no player is around to do it, and hands admin rights to someone else when the admin has been offline for 60 seconds. Clients also advance rooms themselves, so the sweeper is a safety net.

1. Open `supabase/cron.sql`.
2. Replace `APP_URL` with your production URL (no trailing slash) and `CRON_SECRET` with the value of `MULTIPLAYER_CRON_SECRET`.
3. Run it in the **SQL Editor**. It enables `pg_cron` and `pg_net`, runs the sweeper every 10 seconds and deletes expired rooms hourly.

Check it with `select * from cron.job;` and, after a minute, `select status_code, created from net._http_response order by created desc limit 5;` (expect `200`).

Do not paste the secret into a file you commit. If you rotate it, run `cron.sql` again.

## 7. Verify

| Check | Expected |
| --- | --- |
| `POST /api/mp/time` with no auth | `401` |
| Create a room, open the link in another profile, join | Both names show live in the lobby |
| While a duel is in `recall`, read `duel_items` as a player (browser console: `await supabase.from("duel_items").select()` is not exposed, so use the Network tab or a REST call with the player's token) | `[]` (items are hidden outside memorize) |
| Client tries to write: `supabase.from("rooms").update({phase:"finished"})` | permission denied |
| Leave a duel in `duel_result` with pacing auto | Moves on by itself |

## Local Supabase (optional)

```bash
npx supabase start          # needs Docker
npx supabase db reset       # applies supabase/migrations
```

Use the URL and keys that `supabase start` prints in `.env.local`. Skip `cron.sql` locally: clients advance rooms on their own, and you can call the sweeper by hand:

```bash
curl -X POST http://localhost:3000/api/mp/sweep -H "Authorization: Bearer $MULTIPLAYER_CRON_SECRET"
```

## Hardening before a public launch

- **CAPTCHA:** enable it under Authentication > Attack Protection, then pass `options: { captchaToken }` in `signInAnonymously` (`src/lib/supabase/client.ts`) using a Turnstile or hCaptcha widget.
- **Profanity:** `src/lib/multiplayer/names.ts` ships a tiny starter list. Swap in a maintained package.
- **Rate limits:** room creation (5 per hour per user) and guesses (3 per second per player) are enforced in the API. Add a platform-level rate limit on `/api/mp/*` as well.
- **Backups and monitoring:** rooms are disposable, so no backups are needed for game data. Watch the Vercel function logs for `mp/<action> failed`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Multiplayer is not configured yet" | `NEXT_PUBLIC_SUPABASE_*` missing. Restart `npm run dev` after editing `.env.local`. |
| "Could not sign in" | Anonymous sign-ins are off (step 2), or CAPTCHA is on without a token. |
| API returns "Missing environment variable ..." | A server variable is missing in Vercel or `.env.local`. |
| Lobby does not update live | A table is missing from the `supabase_realtime` publication (step 3). |
| Everyone is stuck at a countdown | The deployment URL or secret in `cron.sql` is wrong. Check `net._http_response`. Clients should still advance it. |
| `permission denied for table ...` in the API logs | The service-role key is wrong (it must be `service_role`, not `anon`). |
