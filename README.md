# Blinq

**Memory workout, with fun.** Blinq is a Next.js memory game: memorize items on a grid, then pick them back out of a crowd under time pressure. Play solo (daily challenge, training, ranked levels), or host a **multiplayer battle** room with friends.

Live app: [blinqplay.vercel.app](https://blinqplay.vercel.app)

## Stack

- [Next.js](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS
- [Clerk](https://clerk.com) — solo sign-in and profiles
- [Supabase](https://supabase.com) — multiplayer rooms, realtime, Postgres + RLS

## Quick start

```bash
npm install
cp .env.example .env.local   # fill Supabase + Clerk as needed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Solo modes work with optional Clerk dev keys; multiplayer needs a Supabase project (see below).

Before opening a PR:

```bash
npm run lint
npm run build
```

Full command reference: [docs/DEV_COMMANDS.md](docs/DEV_COMMANDS.md).

## Documentation

| Topic | Doc |
| --- | --- |
| npm, Supabase CLI, tests, CI | [docs/DEV_COMMANDS.md](docs/DEV_COMMANDS.md) |
| Branches, commits, releases | [docs/BRANCHING.md](docs/BRANCHING.md) |
| UI tokens and components | [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) |
| Difficulty engine (levels, timers, twists) | [docs/GAME_ENGINE.md](docs/GAME_ENGINE.md) |
| Multiplayer rules and flow | [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) |
| Supabase + Clerk setup | [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) |

## License

Private project (`package.json` marks the package as private).
