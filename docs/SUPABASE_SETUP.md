# Connect Supabase to Blinq

Multiplayer needs one [Supabase](https://supabase.com) project. Single-player does not use it.

This guide follows the current Supabase docs ([API keys](https://supabase.com/docs/guides/api/api-keys), [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Cron](https://supabase.com/docs/guides/cron), [CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)). Game rules and architecture: [MULTIPLAYER.md](MULTIPLAYER.md).

**In the repo:** schema [`supabase/migrations/`](../supabase/migrations/), cron jobs [`supabase/cron.sql`](../supabase/cron.sql), env template [`.env.example`](../.env.example).

## What you will have at the end

| Piece | Where it lives |
| --- | --- |
| Tables, RLS, Realtime publication | Supabase Postgres (migration) |
| Anonymous sign-in | Supabase Auth |
| Game writes (`/api/mp/*`) | Next.js (secret key, server only) |
| Phase sweeper + room cleanup | [Supabase Cron](https://supabase.com/docs/guides/cron) (`pg_cron` + `pg_net`) |

## 1. Create the project

1. [Create a project](https://supabase.com/dashboard) in a region close to your Vercel deployment.
2. Open the **Connect** dialog (top of the project) and pick **Next.js**. Copy the **Project URL** and **Publishable key** (`sb_publishable_...`) into `.env.local`.
3. For the **secret** key, open **Project Settings → [API Keys](https://supabase.com/docs/guides/api/api-keys)** (not the old “API” page). Copy a **Secret** key (`sb_secret_...`). If your project only shows legacy JWT keys (`anon` / `service_role`), those still work until Supabase retires them (planned end of 2026); prefer creating publishable/secret keys in the same screen.

**Project ref:** the subdomain in `https://<project-ref>.supabase.co`. You need it for `supabase link`.

## 2. Enable anonymous sign-ins

Anonymous users get a real `authenticated` session without email or OAuth ([docs](https://supabase.com/docs/guides/auth/auth-anonymous)).

**Hosted project**

1. **Authentication → [Sign In / Providers](https://supabase.com/docs/guides/auth/general-configuration)**.
2. Turn on **Allow anonymous sign-ins**. It applies immediately (no redeploy).

**Local CLI stack**

Already enabled in [`supabase/config.toml`](../supabase/config.toml). After edits, run `npx supabase stop && npx supabase start`.

**Before you go live:** Supabase enforces a default IP rate limit on anonymous sign-ins (30 requests/hour per IP, adjustable in the dashboard). For production, enable **CAPTCHA** under **Authentication → Bot and Abuse Protection** ([Turnstile / hCaptcha](https://supabase.com/docs/guides/auth/auth-captcha)) and pass `captchaToken` in `signInAnonymously` in `src/lib/supabase/client.ts`. Our RLS policies grant access to `authenticated` users in a room; anonymous JWTs include `is_anonymous` if you need to restrict them later.

## 3. Apply the database schema

### Option A — Supabase CLI (recommended)

From the repo root ([deploy migrations](https://supabase.com/docs/guides/local-development/overview#deploy-your-project)):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

If the remote database already has objects not in git, run `npx supabase db pull` first and reconcile, then `db push`.

### Option B — SQL Editor

1. **SQL → New query**.
2. Paste the full contents of `supabase/migrations/20261013000000_multiplayer.sql` and **Run** once. Re-running can fail on types/tables that already exist.

### Realtime (Postgres Changes)

The migration runs `alter publication supabase_realtime add table ...`. Confirm in the dashboard:

**Database → [Publications](https://supabase.com/docs/guides/realtime/postgres-changes#enable-postgres-replication) → `supabase_realtime`**

These tables must be enabled: `rooms`, `teams`, `players`, `duels`, `duel_progress`, `duel_results`.

If a table is missing, run:

```sql
alter publication supabase_realtime add table public.rooms;
-- repeat for other tables
```

## 4. Environment variables

Copy [`.env.example`](../.env.example) to `.env.local` (and set the same values on Vercel).

| Variable | Supabase source | Browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Connect dialog or API Keys | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → Publishable (`sb_publishable_...`) | yes |
| `SUPABASE_SECRET_KEY` | API Keys → Secret (`sb_secret_...`) | **never** |
| `MULTIPLAYER_SEED_SECRET` | `openssl rand -hex 32` | no |
| `MULTIPLAYER_CRON_SECRET` | `openssl rand -hex 32` | no |

**Legacy names (still supported in code):** `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Rules ([API keys guide](https://supabase.com/docs/guides/api/api-keys)):

- Publishable keys are safe in the client; RLS limits what they can read.
- Secret keys bypass RLS. Never commit them, never prefix with `NEXT_PUBLIC_`, never use them in the browser.
- Do not paste long `eyJ...` keys from old tutorials unless you intentionally use legacy JWT keys.

```bash
npm install
npm run dev
```

Open [http://localhost:3000/multiplayer](http://localhost:3000/multiplayer), create a room, and join from a private window (second anonymous user).

## 5. Deploy the Next.js app

1. **Vercel → Settings → Environment Variables:** add the five variables for Production and Preview. Mark secrets as sensitive.
2. Deploy and note the production URL (for example `https://your-app.vercel.app`).

## 6. Schedule the sweeper (Supabase Cron)

Clients call `advance_phase` when timers expire; **Supabase Cron** is the safety net when nobody is connected ([Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)).

Requires **Postgres 15.1+** on Supabase (sub-minute schedules like `10 seconds`).

### Option A — Dashboard

1. **Integrations → Cron** (or **Database → Cron**, depending on dashboard version).
2. **Create job**
   - **Name:** `blinq-sweeper` (job names are case-sensitive and fixed after creation).
   - **Schedule:** `10 seconds`.
   - **Type:** HTTP request.
   - **URL:** `https://YOUR-APP.vercel.app/api/mp/sweep`
   - **Method:** POST
   - **Headers:** `Content-Type: application/json`, `Authorization: Bearer YOUR_MULTIPLAYER_CRON_SECRET`
   - **Body:** `{}`
3. Create a second job **`blinq-room-cleanup`**, schedule `0 * * * *` (hourly), **SQL:**

   ```sql
   delete from public.rooms where expires_at < now();
   ```

### Option B — SQL (`supabase/cron.sql`)

1. Edit placeholders: `APP_URL` → production origin (no trailing slash), `CRON_SECRET` → same value as `MULTIPLAYER_CRON_SECRET`.
2. Run the file in **SQL Editor** (enables `pg_cron` and `pg_net`, registers both jobs).

**Verify**

```sql
select jobname, schedule, active from cron.job where jobname like 'blinq%';
```

After a minute, inspect HTTP results (exact table/columns can vary by platform version):

```sql
select * from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'blinq-sweeper')
order by start_time desc
limit 5;
```

Expect successful runs; your app should log sweep activity when the cron hits `/api/mp/sweep`.

**Limits:** Supabase recommends at most **8 concurrent** cron jobs and **10 minutes** per job ([Cron](https://supabase.com/docs/guides/cron)).

## 7. Smoke test

| Check | Expected |
| --- | --- |
| `POST /api/mp/time` without `Authorization` | `401` |
| Create room + join from another browser profile | Both names appear in the lobby (Realtime) |
| During `recall`, player cannot read opponent’s table items via RLS | `duel_items` select returns no rows for current duel |
| Client `update` on `rooms` with publishable key + user JWT | Permission denied (writes go through `/api/mp/*`) |
| Auto pacing on `duel_result` | Advances after ~8s without admin tap |

## Local Supabase (optional)

[Local CLI stack](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
npx supabase start    # Docker required; first run downloads images
npx supabase db reset # applies supabase/migrations
npx supabase status   # URL + publishable + secret keys
```

Put **local** URL and keys in `.env.local`. Cron is optional locally:

```bash
curl -X POST http://localhost:3000/api/mp/sweep \
  -H "Authorization: Bearer $MULTIPLAYER_CRON_SECRET"
```

## Hardening before launch

| Topic | Action |
| --- | --- |
| CAPTCHA | [Bot and Abuse Protection](https://supabase.com/docs/guides/auth/auth-captcha) + `captchaToken` on `signInAnonymously` |
| Anonymous abuse | Dashboard rate limits; optional CAPTCHA; monitor `auth.users` growth |
| Profanity | Replace starter list in `src/lib/multiplayer/names.ts` |
| API abuse | App limits (rooms/hour, guesses/sec) + Vercel firewall/rate limits on `/api/mp/*` |
| Security Advisor | Review RLS findings in the dashboard (anonymous users use role `authenticated`) |
| Key rotation | [Rotate leaked keys](https://supabase.com/docs/guides/api/api-keys#leaked-key): create new secret, deploy, delete old |

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| “Multiplayer is not configured yet” | Missing `NEXT_PUBLIC_SUPABASE_URL` or publishable/anon key. Restart dev server after `.env.local` changes. |
| `AuthApiError: Anonymous sign-ins are disabled` | Step 2 not enabled on the hosted project. |
| `Could not sign in` with CAPTCHA on | Enable CAPTCHA in dashboard **and** send `captchaToken` from the client. |
| API “Missing Supabase URL or secret key” | Set `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) on Vercel/server. |
| Lobby not live-updating | Table not in `supabase_realtime` publication (step 3). |
| Stuck countdowns in production | Cron URL wrong, cron secret mismatch, or job inactive. Check `cron.job_run_details`. Clients should still advance when someone has the room open. |
| `permission denied` in API logs | Wrong key type (publishable/anon in server code) or missing table grants. Server must use the **secret** key. |
| Realtime connects but RLS returns empty | User not in `players` for that room, or policy mismatch. Join via `/api/mp/join_room` first. |

## Official links

- [API keys (publishable vs secret)](https://supabase.com/docs/guides/api/api-keys)
- [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Postgres Changes (Realtime)](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Cron / pg_cron](https://supabase.com/docs/guides/cron)
- [Database migrations & `db push`](https://supabase.com/docs/guides/local-development/overview)
