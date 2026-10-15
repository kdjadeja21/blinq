# Blinq Design System

The single source of truth for how Blinq looks and moves. Tokens live in [`src/app/globals.css`](../src/app/globals.css); components live in [`src/components/game/`](../src/components/game) and [`src/components/ui/`](../src/components/ui).

## Principles

1. **Playful, never noisy.** Rounded shapes, saturated violet, soft glow.
2. **Readable at a glance.** Each round is a short memorize-and-recall burst. Numbers, timers and state must be understood instantly.
3. **Mobile and one-handed first.** Single column, large tap targets, primary action at the thumb.
4. **Motion is feedback.** Animate to confirm an action or celebrate an outcome. Never animate only for decoration, and always honor reduced motion.
5. **Tokens over values.** No raw hex, hard-coded colors or one-off radii in components.

## Color

Colors use OKLCH and are defined as CSS variables for `:root` (light) and `.dark`. Tailwind utilities (`bg-primary`, `text-muted-foreground`, ...) map to them via `@theme inline`.

| Token | Meaning | Use for |
| --- | --- | --- |
| `background` / `foreground` | Page surface and default text | Body, page text |
| `card` / `card-foreground` | Raised surface | Cards, tiles, board cells |
| `primary` / `primary-foreground` | Brand violet (hue 292) | Main CTA, active states, focus accents |
| `secondary`, `accent`, `muted` | Quiet surfaces | Secondary buttons, tracks, subtle fills |
| `muted-foreground` | Secondary text | Hints, labels, captions |
| `destructive` | Mistakes and danger | Wrong answers, errors |
| `success` | Correct and positive | Correct recall, daily CTA |
| `gold` | Reward | Stars, score badges |
| `flame` | Momentum | Streaks and combos |
| `team-a` / `team-a-deep` | Team A (Blue) | Multiplayer Team A surfaces, borders, gradients |
| `team-b` / `team-b-deep` | Team B (Crimson) | Multiplayer Team B surfaces, borders, gradients |
| `border`, `input`, `ring` | Structure | Outlines, form fields, focus ring |
| `--blob-a`, `--blob-b` | Ambient background | `.game-bg` only |

Rules:

- Pick tokens by **meaning**, not by hue. A correct answer is `success` even if the palette changes.
- Body text must reach 4.5:1 contrast in both themes. Text on `gold`, `flame` and `success` fills is black, as in the existing badges.
- Opacity modifiers on tokens are fine (`bg-flame/20`, `shadow-primary/30`).
- Exception: the confetti palette in `Confetti.tsx` is decorative and intentionally uses fixed colors.
- The title gradient (`from-primary to-fuchsia-500`), the revealed board cell, and the multiplayer team-clash gradients (`from-team-a-deep via-primary to-team-b-deep` on the `battle` CTA and team banners) are the only gradients. Do not add new ones without updating this doc.

## Typography

| Role | Font | Typical classes |
| --- | --- | --- |
| UI and headings | Fredoka (`--font-sans`, `--font-heading`) | `font-sans` (default) |
| Numbers, timers | Geist Mono (`--font-mono`) when a fixed width is needed, otherwise `tabular-nums` | `tabular-nums`, `font-mono` |

| Style | Classes | Where |
| --- | --- | --- |
| Display | `text-6xl font-extrabold tracking-tight` | Title |
| Hero emoji | `text-7xl` | Home mascot |
| Heading | `text-lg font-bold` to `text-xl font-bold` | Section titles, stat values |
| Body | `text-base` | Default |
| Small | `text-sm text-muted-foreground` | Helper copy |
| Caption | `text-xs text-muted-foreground` | Stat labels |

Always use `tabular-nums` for values that change (score, countdown, percentages).

## Spacing, shape and elevation

- 4px base grid using Tailwind spacing (`gap-2`, `p-3`, `p-4`, `gap-5`).
- Layout is a single column with `gap-5` between sections. Screens fill the height (`flex flex-1 flex-col`).
- Radius derives from `--radius: 1rem` (`rounded-sm` through `rounded-4xl`).

| Element | Shape |
| --- | --- |
| Section card | `rounded-3xl border-2 bg-card p-4 shadow-lg` |
| Stat tile, board cell, choice tile | `rounded-2xl border-2 bg-card shadow-sm` or `shadow-md` |
| Primary CTA | `rounded-3xl`, height `h-16` |
| Secondary CTA | `rounded-2xl`, height `h-12` |
| Badges and pills | `rounded-full` |

- Interactive "chunky" controls have a thicker bottom edge (`border-b-4`) and press down on active. This is built into the `game`, `battle` and `success` button variants and the choice tiles.

## Motion

CSS tokens (in `@theme inline`):

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 150ms | Hover, press, color changes |
| `--duration-base` | 300ms | Element enter and exit |
| `--duration-slow` | 600ms | Celebrations, reveals |
| `--duration-ambient` | 24s | Background drift |
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default easing for non-spring CSS motion |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful overshoot |

Framer Motion spring presets already used in the game (reuse these before inventing new ones):

| Feel | Config | Used in |
| --- | --- | --- |
| Snappy tap | `stiffness 420-500, damping 14` | Choice tiles, combo pill |
| Pop in | `stiffness 380, damping 18` | Board cells |
| Reward | `stiffness 300-400, damping 12` | Stars, level badge |
| Soft flip | `stiffness 220, damping 20` | Board card flip |

Named animations: `shake` (wrong answer, 0.4s), `drift` (background blobs), confetti on a win, looping emoji floaters on Home.

Reduced motion is mandatory:

- CSS animations are disabled in the `prefers-reduced-motion` block in `globals.css`. Add any new class there.
- Framer Motion code uses `useReducedMotion()` and falls back to `duration: 0` or no looping (see `Board.tsx`, `TimerRing.tsx`).

## Iconography and imagery

- UI icons: `lucide-react`, default `size-4`, `size-6` inside large CTAs. Use `fill-current` or a token fill for emphasis (for example the flame icon).
- Game items are emoji (`src/lib/items.ts`). They are content, not decoration, so items keep accessible names in the choice grid.
- Decorative emoji and background layers are `aria-hidden`.

## Accessibility

- Minimum interactive target: 44px (`min-h-11`).
- Visible focus uses `--ring` (built into Button via `focus-visible:ring-3`). Do not remove outlines.
- Never rely on color alone. Correct and wrong states combine color with a shake, an icon or text.
- Timers expose `role="progressbar"` with a label and `aria-valuenow`. Stats use `<dl>`. Toggles have an `aria-label` and reflect state.
- Both themes must pass the same contrast checks. Theme is stored under the `blinq:theme` key and applied before paint in `layout.tsx`.

## Components

### Foundation: `ui/Button`

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`, plus the game-specific `game` (primary chunky CTA, violet), `battle` (team-clash chunky CTA, Team A blue to Team B crimson gradient) and `success` (positive chunky CTA, green). Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`. In screens, override height and radius for hierarchy: primary `h-16 rounded-3xl`, secondary `h-12 rounded-2xl`, tertiary `variant="ghost"`.

### Game components

| Component | Purpose | Key props |
| --- | --- | --- |
| `Game` | State machine and screen router | none |
| `HomeScreen` | Level start, daily challenge, streak, stats | `stats`, `today`, `onPlayLevel`, `onPlayDaily`, `onTraining` |
| `PlayScreen` | Memorize, hide and recall phases | `round`, `now`, `dispatch`, `onSkipTraining` |
| `ResultScreen` | Stars, score count-up, share, next actions | `round`, `stats`, `onRetry`, `onNextLevel`, `onHome`, `onStartPlaying` |
| `TrainingIntro` | Onboarding steps | `step`, `onNext`, `onSkip` |
| `TrainingPrompt` | First-visit practice offer. Training starts only from its primary button | `onStart`, `onSkip` |
| `Board` | Grid of items to memorize | `items`, `mode`, `recalledIds` |
| `ChoiceGrid` | Answer options with correct and wrong feedback | `choices`, `recalledIds`, `wrongIds`, `hintId`, `onPick` |
| `TimerRing` | Circular countdown, pulses at 5s or less | `seconds`, `progress`, `label`, `hidden` |
| `StatTile` | Label and value tile, used inside a `<dl>` | `label`, `value` |
| `Confetti` | Win celebration | `count` |
| `YouBadge` | Pill with a user icon marking the viewer's own name where there is no highlighted row or chip to carry it (matchup banner, duel progress, duel result tile). Pops in with the "Pop in" spring and respects reduced motion. Use `variant="onColor"` on team gradients | `variant`, `className` |
| `youRowClass` | Own-row treatment, used alone (no badge) in lists such as the leaderboards (`bg-primary/15 ring-2 ring-primary` plus a soft primary shadow) shared by every list with a viewer row | `isMe` |
| `ThemeToggle`, `SoundToggle` | Persistent preferences | none |
| `useCountUp` | Animated number hook | `target`, `durationMs` |

### Patterns to reuse

- **Streak pill:** `flex items-center gap-1 rounded-full bg-flame/20 px-3 py-1 text-sm font-bold` with a flame icon.
- **Reward badge:** `rounded-full bg-gold px-3 py-1 text-sm font-bold text-black`.
- **Section card:** see Spacing, shape and elevation. Label it with `aria-labelledby`.
- **Segmented control:** `SlidingOptions` in `src/components/ui/sliding-options.tsx`, used by `Segmented` and `LeaderboardTabs`. Use it for any new tab or option group. The selected pill slides between options over `--duration-base` with `--ease-out-soft`. Reduced motion skips the slide.

## Adding to the system

For Cursor, the `design-system` skill (`.cursor/skills/design-system/SKILL.md`) walks through this workflow.

1. Check this document and the existing components first.
2. Add new colors or motion values as tokens in `globals.css` (with both light and dark values) and document them here.
3. Extract a component once a pattern appears a second time (as `StatTile` was). Put it in `src/components/game/`.
4. Include light and dark screenshots in the PR.
