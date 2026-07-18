# Frontend

React + TypeScript dashboard for the TCP Congestion Control Visualizer.
The design contract is `docs/design/DESIGN_SPEC.md` at the repository
root; its invariants (single shared time axis, algorithm identity
colors, marker shapes) are binding.

## Commands

```sh
npm run dev           # Vite dev server; proxies /api to the backend on :8000
npm run build         # type-check (tsc -b) and build
npm run lint          # oxlint
npm run format        # prettier --write
npm run format:check
```

## Structure

```
src/
├── app/            Global provider composition (AppProviders)
├── components/
│   ├── layout/     App shell: ConfigRail, Stage, StatsRail, TransportBar
│   └── ui/         Small reusable primitives (SectionLabel, …)
├── features/       One folder per capability; components + state + logic
│   ├── replay/     ReplayClock contract and provider (the shared cursor)
│   └── theme/      Dark/light theme state (dark-first)
├── lib/
│   └── api/        HTTP client (client.ts) and endpoint modules (health.ts)
└── styles/         Design tokens as CSS variables (tokens.css)
```

Planned feature folders (added with their tasks, never speculatively):
`features/simulation` (run state + API), `features/charts`,
`features/packets` (SVG flight lane), `features/stats`,
`features/comparison`.

## Conventions

- Strict TypeScript; no `any`.
- Every time-based visual reads the cursor from `useReplayClock` — no
  private playback state (DESIGN_SPEC §5).
- Colors, type sizes, and fonts come from the token-backed Tailwind
  theme (`bg-canvas`, `text-fg-muted`, `text-ui`, `font-mono`, …);
  hex values appear only in `src/styles/tokens.css`.
- Spacing uses Tailwind's 4px scale, restricted to 4/8/12/16/24/32/48.
