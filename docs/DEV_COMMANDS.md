# Developer commands

One reference for day-to-day commands on **Blinq**. For deeper setup (Supabase dashboard, Cron, Clerk production), see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). For git workflow, see [BRANCHING.md](./BRANCHING.md).

Run all commands from the **repository root** unless noted.

---

## First-time setup

| Command | Description |
| --- | --- |
| `npm install` | Install Node dependencies (use `npm ci` in CI or when you want a clean lockfile install). |
| `cp .env.example .env.local` | Create local env file. Fill in Supabase and Clerk values as needed (see [`.env.example`](../.env.example)). |
| `openssl rand -hex 32` | Generate a random secret (run twice for `MULTIPLAYER_SEED_SECRET` and `MULTIPLAYER_CRON_SECRET`). |

**Solo (Clerk) — optional for local dev**

| Command | Description |
| --- | --- |
| `npx -y clerk@latest init` | Writes temporary accountless Clerk dev keys into `.env.local`. |
| `npx -y clerk@latest auth login` | Sign in to Clerk before pulling or deploying production auth config. |
| `npx -y clerk@latest deploy` | Deploy Clerk instance config to production (after you own the app and OAuth). |

Clerk dashboard workflows (`clerk config pull`, `config patch --dry-run`) are documented in [SUPABASE_SETUP.md § Solo sign-in](./SUPABASE_SETUP.md#solo-sign-in-clerk).

---

## Next.js app (npm scripts)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server (default [http://localhost:3000](http://localhost:3000)). Hot reload for app and API routes. |
| `npm run build` | Production build. **Required to pass before opening a PR** (same as CI). |
| `npm run start` | Serve the last `npm run build` output locally (production mode). |
| `npm run lint` | Run ESLint. **Required to pass before opening a PR.** |
| `npm test` | Run unit tests (`tsx --test` on `src/**/*.test.ts`). Engine and game logic tests live here. |
| `npm run engine:table` | Print difficulty curves (levels 1–30) for easy / medium / hard: items, timers, lives, bot skill, twists. |
| `npm run engine:table 50` | Same table, levels 1–50 (pass max level as CLI arg to the script). |

After changing `.env.local`, restart `npm run dev` so Next.js picks up new variables.

---

## Quality gate (match CI)

CI runs on every PR and push to `main` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

```bash
npm ci
npm run lint
npm run build
```

Optionally before pushing:

```bash
npm test
npm run engine:table   # after editing src/lib/engine/profiles.ts
```

---

## Supabase — hosted project (migrations)

Link once, then push schema changes from `supabase/migrations/`.

| Command | Description |
| --- | --- |
| `npx supabase login` | Authenticate the Supabase CLI with your account. |
| `npx supabase link --project-ref YOUR_PROJECT_REF` | Link this repo to a hosted project (`YOUR_PROJECT_REF` is the subdomain in `https://<ref>.supabase.co`). |
| `npx supabase db push` | Apply local migrations to the **linked remote** database. Use after pulling new migration files from git. |
| `npx supabase db pull` | Pull remote schema into a new migration when the dashboard drifted ahead of git. Reconcile, then `db push`. |

**Without CLI:** run each file under `supabase/migrations/` in **filename order** in the Supabase SQL Editor (see [SUPABASE_SETUP.md § Apply the database schema](./SUPABASE_SETUP.md#3-apply-the-database-schema)).

Migrations include multiplayer tables, solo account tables (`20261014000000_solo_accounts.sql`), individual mode, and related RLS / Realtime publication changes.

---

## Supabase — local stack (optional)

Requires [Docker](https://docs.docker.com/get-docker/). Useful for offline multiplayer testing.

| Command | Description |
| --- | --- |
| `npx supabase start` | Start local Postgres, Auth, Realtime, etc. First run downloads images. |
| `npx supabase stop` | Stop local services. |
| `npx supabase stop && npx supabase start` | Restart after editing [`supabase/config.toml`](../supabase/config.toml) (e.g. anonymous auth). |
| `npx supabase db reset` | Drop and recreate local DB; reapplies all files in `supabase/migrations/`. |
| `npx supabase status` | Print local API URL, publishable key, and secret key for `.env.local`. |

Point `.env.local` at the **local** URL and keys from `supabase status`.

**Manual phase sweeper (local cron substitute):**

```bash
curl -X POST http://localhost:3000/api/mp/sweep \
  -H "Authorization: Bearer $MULTIPLAYER_CRON_SECRET"
```

Production Cron setup (dashboard or `supabase/cron.sql`) is in [SUPABASE_SETUP.md § Schedule the sweeper](./SUPABASE_SETUP.md#6-schedule-the-sweeper-supabase-cron).

---

## Git workflow (short)

| Command | Description |
| --- | --- |
| `git switch main && git pull --ff-only` | Update `main` before branching. |
| `git switch -c feat/short-description` | Create a feature branch (`fix/`, `docs/`, `chore/`, etc.). See [BRANCHING.md](./BRANCHING.md). |
| `git push -u origin <branch>` | Push and open a PR into `main`. |

---

## Game engine tuning

| Step | Command / action |
| --- | --- |
| Edit curves | Change [`src/lib/engine/profiles.ts`](../src/lib/engine/profiles.ts). |
| Preview levels | `npm run engine:table` or `npm run engine:table 50`. |
| Verify | `npm test`. |
| Version bump | If stored rounds must be distinguished, bump `ENGINE_VERSION` in `src/lib/engine/spec.ts`. |

Full design: [GAME_ENGINE.md](./GAME_ENGINE.md).

---

## Useful URLs (local)

| URL | Purpose |
| --- | --- |
| [http://localhost:3000](http://localhost:3000) | App home |
| [http://localhost:3000/multiplayer](http://localhost:3000/multiplayer) | Create/join a room (needs Supabase env) |

---

## Related docs

| Doc | Contents |
| --- | --- |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Env vars, Realtime, Cron, smoke tests, troubleshooting |
| [MULTIPLAYER.md](./MULTIPLAYER.md) | Multiplayer architecture and rules |
| [GAME_ENGINE.md](./GAME_ENGINE.md) | Difficulty engine and tuning |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens and UI conventions |
| [BRANCHING.md](./BRANCHING.md) | Branches, commits, PR checklist |
