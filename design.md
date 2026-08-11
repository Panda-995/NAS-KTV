# Design — NASKTV TV App (Tauri Android TV)

A locked design system for the TV app. Every page reads this file before emitting
code. Do not regenerate per page — extend or amend this file when the system needs
to grow.

## Genre
atmospheric — dark canvas, single warm/cool accent, elevated cards instead of hairlines,
fade-only motion, 10-foot readability (base ≥ 24px).

## Macrostructure family

- Stage pages (NowPlaying): `video-stage overlay` — full-bleed media stage, top info bar
  auto-hides, OSD feedback circles, D-pad focus.
- Browse pages (Home): `stage & grid` — a "now playing" hero strip + responsive card grid.
- Timeline pages (Queue): `timeline-led` — playing hero card, numbered up-next list,
  history timeline.
- Waiting pages (Bootstrap / Unauthorized): `waiting-room` — one focal element (room code)
  with glow, QR as the secondary act.

## Theme (Midnight — locked)

- `--color-paper`      oklch(15% 0.02 250)   — canvas
- `--color-paper-2`    oklch(20% 0.02 250)   — elevated card
- `--color-paper-3`    oklch(25% 0.025 250)  — hover lift
- `--color-ink`        oklch(98% 0.005 250)  — primary text
- `--color-ink-2`      oklch(80% 0.01 250)   — secondary
- `--color-ink-3`      oklch(60% 0.015 250)  — tertiary
- `--color-accent`     oklch(70% 0.15 220)   — cool blue, ≤5% per viewport
- `--color-focus`      oklch(75% 0.18 220)   — focus ring ≥3:1
- `--color-glow`       oklch(70% 0.15 220 / 0.35) — glow shadow tint (focus/active)

## Typography

- Display: Space Grotesk 600, normal. Tracking -0.03em.
- Body: Inter 400/500. Mono: JetBrains Mono (room codes, numbers, eyebrows).
- All headings roman. No italic headers.

## Spacing
4-point named scale (`--space-xs`…`--space-5xl`) in `styles/tokens.css`.

## Motion
- Easings: `--ease-out` / `--ease-in` / `--ease-in-out`.
- Reveal: fade only (opacity), ≤ 400ms. Glow pulse allowed on focal elements only.
- Reduced-motion: global fallback in `index.css` (all animation/transition → 0.01ms).

## Microinteractions stance
- Silent success; focus ring instant (never animated).
- Cards: hover = bg-paper-3 lift; focus-visible = ring + glow shadow; active = scale 0.98.
- Buttons: hover/active/focus-visible/disabled states; icon+label pattern.

## CTA voice
- Primary: accent fill, pill radius, bold label.
- Secondary: paper-2 fill, hairline-free, border border-ink-3.
- Banned: gradient text, glassmorphism, italic headers, multiple accents.

## Per-page allowances
- Stage pages: media-driven, no card chrome.
- Browse/timeline: elevated cards only (no hairline on paper).
- Waiting pages: one glow-pulse focal element each.

## What pages MUST share
- The NASKTV wordmark (font-display, tracking-wide).
- The accent hue and its ≤5% placement.
- The card elevation language (paper-2/paper-3, radius-lg, no hairline).
- The D-pad focus contract: `data-focusable`, tabIndex, focus-visible ring.
- The room code presentation (font-mono, tracking-widest, accent).

## What pages MAY differ on
- Page-level arrangement (family shapes above).
- Focal element choice (hero strip / playing card / room code).

## Exports
See `styles/tokens.css` for the token source of truth (OKLCH, 4pt, type scale).
