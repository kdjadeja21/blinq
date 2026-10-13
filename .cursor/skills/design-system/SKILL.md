---
name: design-system
description: Build or change Blinq UI using the project design system (tokens, components, motion, accessibility). Use when adding or editing any screen, component, color, animation or styling in src/, or when updating docs/DESIGN_SYSTEM.md.
---

# Blinq design system workflow

Source of truth: `docs/DESIGN_SYSTEM.md`. Tokens: `src/app/globals.css`. Components: `src/components/game/` and `src/components/ui/`. Read the doc first.

## Steps

1. **Check for reuse.** Search `src/components/` for an existing component or documented pattern (StatTile, streak pill, reward badge, section card, Button `game` and `success` variants) before writing new markup.
2. **Use tokens only.**
   - Colors by meaning: `primary`, `success`, `destructive`, `gold` (rewards), `flame` (streaks and combos), `muted-foreground` (secondary text). No raw hex, rgb or one-off oklch in components. The confetti palette is the only exception.
   - Shape: section cards `rounded-3xl border-2 bg-card`, tiles `rounded-2xl`, pills `rounded-full`. Primary CTA `h-16 rounded-3xl`, secondary `h-12 rounded-2xl`.
   - Numbers that change use `tabular-nums`.
3. **Need a new value?** Add it as a token in `globals.css` (both `:root` and `.dark`, plus the `@theme inline` mapping) and document it in `docs/DESIGN_SYSTEM.md`.
4. **Motion.**
   - Prefer the documented spring presets and the `--duration-*` and `--ease-*` tokens.
   - Every new animation needs a reduced-motion path: `useReducedMotion()` for Framer Motion, or add the class to the `prefers-reduced-motion` block in `globals.css`.
5. **Accessibility.**
   - Tap targets at least 44px (`min-h-11`).
   - Keep the focus ring.
   - Never use color alone to signal state; add an icon, text or motion.
   - Add `aria-label` on icon-only controls, `aria-hidden` on decoration, and `<dl>` for label and value stats.
6. **Extract on second use.** If a pattern now appears twice, move it into `src/components/game/` and use it in both places.
7. **Update the docs.** If you added or changed a token, component or pattern, update the matching table in `docs/DESIGN_SYSTEM.md`.
8. **Verify.** Run `npm run lint` and `npm run build`. Check the screen at mobile width in light and dark themes, with reduced motion on and off. Attach light and dark screenshots to the PR.

## Related skills

- `composition-patterns`: use when a component grows boolean props or needs a flexible API (compound components, lifting state).
- `react-best-practices`: use when writing or reviewing React and Next.js code for performance (re-renders, bundle size, data fetching).

## Review checklist

- [ ] No raw color values or one-off radii
- [ ] Existing component or pattern reused where possible
- [ ] Reduced-motion fallback present
- [ ] Contrast and tap targets verified in both themes
- [ ] `docs/DESIGN_SYSTEM.md` updated if the system changed
