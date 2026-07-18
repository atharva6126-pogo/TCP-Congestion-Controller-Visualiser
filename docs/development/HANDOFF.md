# Development Handoff

Last updated: after Task 12 (packet lane visualization).

## Current architecture

Two independently runnable halves, joined later by one HTTP contract:

- **Backend** (`backend/`, Python 3.11+ src-layout, FastAPI): strict
  layering — `domain` (framework-free entities + `CongestionControlAlgorithm`
  strategy interface + `CongestionSignal` vocabulary) ← `algorithms`
  (Tahoe, Reno, New Reno, Cubic) ← `simulation` (SimPy engine, seeded,
  algorithm-agnostic) ← `statistics` (pure derivation from event
  timelines) ← `api` (FastAPI; only `/health` exists).
- **Frontend** (`frontend/`, Vite + React 19 + TS strict + Tailwind v4):
  `features/replay` (rAF ReplayEngine behind `useReplayClock` /
  `useReplayControls`), `features/simulation` (camelCase timeline types
  mirroring the backend domain + a temporary demo fixture),
  `features/packets` (SVG flight lane + pure derivations),
  `features/stats` (em-dash tiles), `components/layout` (three-rail
  shell + transport bar), `lib/api` (fetch wrapper + health).
- **Contracts**: `docs/design/DESIGN_SPEC.md` (frontend, binding),
  ADRs 0001–0003 (backend architecture), `docs/planning/` (original
  scope).

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

## Remaining tasks

- **Backend simulation API**: `POST` endpoint accepting config
  (algorithm, link, transfer, seed), returning the full timeline +
  statistics as JSON; Pydantic schemas at the API boundary only.
- **Frontend integration**: API mapper (snake_case → `SimulationTimeline`),
  simulation provider/run state, config rail controls + presets + Run
  button, error/loading states per §12–13; **remove the demo fixture**
  (`features/simulation/fixtures/` + one import in `Stage.tsx`).
- **Charts** (§14): Recharts cwnd chart with phase bands, loss markers
  (shape-coded), ghost-future replay; small multiples (throughput, RTT,
  ack progress) on the shared axis.
- **Live statistics** (values-at-cursor into the existing StatTiles) and
  the event inspector.
- **Comparison mode** (§15): multi-algorithm runs, shared seed enforced,
  overlay + small-multiples, Δ table.
- Config-in-URL sharing, export (PNG/CSV/JSON), remaining shortcuts
  (Shift+←/→, 1–8, C, R), density aggregation for >60 packets.
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
- The lane currently runs on a deterministic **demo fixture**, clearly
  marked, standing in for the API.

## Current state

- **Backend**: 128 tests green under `pytest`, `mypy --strict`, `black`
  (venv at `backend/.venv`). Four algorithms complete. No simulation
  endpoint yet — `/health` only.
- **Frontend**: builds clean (`npm run format|lint|build` in
  `frontend/`). Shell, theme, replay engine, transport, keyboard layer,
  and packet lane all functional against the fixture; charts area and
  stats values intentionally empty. No test runner installed yet
  (Vitest planned per TECH_STACK).

## Recommended next task

**Backend simulation API + frontend integration** — expose
`POST /simulations` (config in, timeline + statistics out), map it into
`SimulationTimeline`, build the config rail controls, and delete the
fixture. Doing this before charts means the cwnd chart and statistics
are built against real data with real error/loading states, and the
comparison work inherits a finished single-run pipeline.
