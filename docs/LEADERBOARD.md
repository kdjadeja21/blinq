# Daily leaderboard

Route: `/leaderboard?scope=daily|weekly|all` (default `daily`). Anyone can read it; only signed-in players appear, because only their rounds reach `solo_rounds`.

Code: [`src/lib/solo/leaderboard.ts`](../src/lib/solo/leaderboard.ts) (pure ranking), [`src/server/solo/leaderboard.ts`](../src/server/solo/leaderboard.ts) (query), [`src/components/leaderboard/`](../src/components/leaderboard/) (UI).

- **Data:** daily rows of `solo_rounds` (one per player per UTC day, enforced by a unique index) joined with `solo_profiles` for name and avatar. No schema change. Only display name, avatar and totals are sent to the browser.
- **Windows (UTC):** Daily is today. Weekly is Monday to today. All time is everything up to today.
- **Ranking:** total score, then total correct, then name. Full ties share a rank (1, 1, 3), like the multiplayer leaderboard.
- **Position change:** each board is compared with the same board as of the day before (daily compares with yesterday's daily board; weekly and all time with their standings through yesterday). The arrow is hidden for players who were not ranked there, and on the first day of a week for the weekly board. Arrows reuse `RankChange` from the multiplayer leaderboard.
- **Size:** the top 100 are shown, plus the viewer's own row if they rank lower.
- **Shared table:** [`src/components/leaderboard/table/`](../src/components/leaderboard/table/) holds `LeaderboardTable`, used by this route and by the multiplayer results (`src/components/multiplayer/Leaderboard.tsx`). Each caller maps its rows to `LeaderboardEntry` and fills the avatar, accessory and trailing slots. The list scrolls, and the viewer's row keeps its place in it. While that row is scrolled out of view, a copy of it is pinned to the top or bottom edge, and the copy is hidden again once the real row is fully visible.
- **Mock data (dev only):** `/leaderboard?mock=20&me=14` shows 20 fake rows with the viewer at rank 14. `mock` is the row count (capped at 200, rows beyond 100 are shown as the viewer's gapped row), `me` is the viewer's rank (omit for no viewer row). Ignored in production. Tab switches keep the params.
