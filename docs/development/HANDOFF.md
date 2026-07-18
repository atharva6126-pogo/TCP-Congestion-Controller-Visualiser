# Development Handoff

Last updated: after Task 15 (timeline and packet inspectors).

## Current architecture

Two independently runnable halves, joined later by one HTTP contract:

- **Backend** (`backend/`, Python 3.11+ src-layout, FastAPI): strict
  layering — `domain` (framework-free entities + `CongestionControlAlgorithm`
  strategy interface + `CongestionSignal` vocabulary) ← `algorithms`
  (Tahoe, Reno, New Reno, Cubic) ← `simulation` (SimPy engine, seeded,
  algorithm-agnostic) ← `statistics` (pure derivation from event
  timelines) ← `api` (FastAPI: `/health`, `POST /simulations`).
- **Frontend** (`frontend/`, Vite + React 19 + TS strict + Tailwind v4):
  `features/replay` (rAF ReplayEngine behind `useReplayClock` /
  `useReplayControls`), `features/simulation` (timeline types, config +
  validation, run state), `features/packets` (SVG flight lane + pure
  derivations), `features/charts` (cwnd chart + pure derivations),
  `features/stats` (run totals), `features/inspector` (event log +
  detail panel, pure lookups), `components/layout` (three-rail shell +
  transport bar), `lib/api` (fetch wrapper, health, simulations).
- **Contracts**: `docs/design/DESIGN_SPEC.md` (frontend, binding),
  ADRs 0001–0004 (backend architecture and the wire contract),
  `docs/planning/` (original scope).

## Completed tasks

1. Repo bootstrap + backend skeleton (`/health`, tooling).
2. Domain model (immutable entities, strategy interface, required seed).
3. SimPy engine (+3.5: StatisticsCollector). ADR 0001.
4. TCP Tahoe.
5. Signal-oriented interface (`on_signal`) + TCP Reno + loss
   classification. ADR 0002.
6. Sequence-aware signals (`ack_sequence_number`,
   `highest_transmitted_sequence_number`) + TCP New Reno. ADR 0003.
7. TCP Cubic (RFC 8312, time-based growth).
8. Frontend design specification.
9. Frontend foundation (tokens, theme, shell skeleton, ReplayClock
   contract, API client structure).
10. Application shell (transport bar, collapse, drawers, help overlay,
    keyboard layer, stats empty state).
11. Replay engine (rAF interpolation, seek/speed/completion/stepping,
    minimal re-rendering via external store).
12. Packet lane (§16: lane + sequence strip, pure time-derived, demo
    fixture).
13. Congestion window chart (§14: Recharts, phase bands, shape-coded
    loss markers, ghost future, hover inspection, sr-only data table).
14. Backend integration: `POST /simulations`, phase reporting (ADR
    0004), config panel with validation, loading/error states; the
    demo fixture is gone.
15. Timeline and packet inspectors: replay log with the current event
    marked, click/keyboard to seek, and full metadata for any event or
    transmission attempt.

## Remaining tasks

- **Charts** (§14): small multiples (throughput, RTT, ack progress) on
  the shared time axis, plus the synced crosshair and single combined
  tooltip across charts. (The cwnd chart itself is done.)
- **Live statistics**: the rail shows whole-run totals; the
  cursor-relative values of §2 step 4 remain.
- **Comparison mode** (§15): multi-algorithm runs, shared seed enforced,
  overlay + small-multiples, Δ table.
- Config-in-URL sharing, export (PNG/CSV/JSON), remaining shortcuts
  (Shift+←/→, 1–8, C, R), density aggregation for >60 packets,
  presets (§2).
- CI (GitHub Actions), Docker, deployment; BBR (future, per ADR 0003).

## Architectural invariants (do not violate)

1. **Backend domain and engine are framework-free**; the engine is
   algorithm-agnostic and drives strategies only via
   `on_signal(CongestionSignal)`.
2. **Signals carry network observations only** — never algorithm
   interpretations (ADR 0002; e.g. no `PartialAck`, no `RecoveryComplete`).
3. **Events reference signals by composition**, never inheritance
   (ADR 0002).
4. **Every simulation is seeded and deterministic**; identical config ⇒
   identical timeline. Comparisons share one seed by construction.
5. **ReplayClock is the single source of simulation time** on the
   frontend. No component may own playback state or timers; every
   visual is a pure function of (timeline, cursor).
6. **Design tokens only**: hex values live in `tokens.css`; algorithm
   identity colors and loss-marker shapes (◇ timeout, △ dup-ACK) are
   fixed; never encode meaning by color alone.
7. Strict typing everywhere (`mypy --strict`; TS strict, no `any`).
8. **No speculative abstractions**: extend the existing architecture;
   new abstractions must remove real duplication or enable a real
   capability.

## Known simplifications (deliberate, documented)

- Engine: both loss kinds detected one RTT after send (no RTO timer);
  loss classified as dup-ACK when ≥3 other packets are in flight;
  algorithms grow on every delivered segment (no receiver dup-ACK
  modeling); no fast-recovery window inflation/deflation (Reno, New
  Reno).
- Cubic: TCP-friendly region, HyStart, and per-ACK `W(t+RTT)` stepping
  omitted (all need an RTT estimate not yet in the signal vocabulary);
  window follows the cubic curve directly.
- Frontend lane: data-leg/ACK-leg split is a fixed 0.6/0.4 visual
  convention; loss marks fade to a 20% scar; 60-packet render cap.
- Frontend chart: §14's optional ssthresh step-line is omitted — the
  domain model carries no ssthresh (ADR 0004). Recharts' built-in
  animations are disabled everywhere so the ReplayClock is the only
  source of motion.
- API bounds are tighter than the domain's (ADR 0004): loss
  probability is capped at 0.5, since a link dropping every packet
  would retransmit forever. Link bandwidth is fixed at 1 MB/s in the
  UI and is not an exposed control.

## Current state

- **Backend**: 158 tests green under `pytest`, `mypy --strict`, `black`
  (venv at `backend/.venv`). Four algorithms complete;
  `POST /simulations` serves real runs. Start it with
  `backend/.venv/bin/uvicorn tcp_visualizer.main:app --port 8000`.
- **Frontend**: builds clean (`npm run format|lint|build` in
  `frontend/`). Shell, theme, replay engine, transport, keyboard layer,
  packet lane, congestion window chart, config panel, run-total
  statistics, and both inspectors all functional against the live
  backend (`npm run dev`
  proxies `/api` to port 8000); small multiples and cursor-relative
  statistics are still to come. The
  bundle is ~576 kB (Recharts dominates); code-splitting is available
  if that ever matters. No test runner installed yet (Vitest planned
  per TECH_STACK).

## Recommended next task

**Comparison mode (§15)** — the single-run pipeline is complete, so the
natural next step is running several algorithms against one shared seed
and link, overlaying their windows in identity colors, and adding the
comparison table. Everything it needs already exists: the API is
deterministic per configuration, and both visualizations already take a
timeline as a prop.

Alternatively, **cursor-relative statistics** is a smaller,
self-contained piece of the same journey (§2 step 4): the inspectors
already derive everything from (timeline, cursor), so the stat tiles
can follow the same pattern.
