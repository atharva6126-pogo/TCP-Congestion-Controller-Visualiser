# TCP Congestion Control Visualizer — Design Specification

Status: Accepted (Task 8). This document governs the frontend implementation.
The aesthetic target is a premium desktop tool — closer to an instrument
than a dashboard: dark, dense, calm, keyboard-friendly, with the data as
the only decoration.

---

## 1. Information architecture

The application is a **single workspace**, not a multi-page site. Everything
the user does orbits one object: a **Run** (a `SimulationConfig` plus its
computed timeline and statistics). The IA has three levels:

1. **Workspace** — the one screen. Holds the active Run (or Comparison) and
   its replay state.
2. **Run** — configuration, timeline, statistics. A Comparison is a set of
   Runs sharing identical network conditions and seed, differing only by
   algorithm.
3. **Inspection** — transient detail: a hovered event, a selected loss, a
   scrubbed instant. Never a separate page; always an overlay or side panel
   bound to the timeline cursor.

Persistent chrome is limited to: the config rail (left), the replay
transport bar (bottom), and the stats/inspector rail (right). The center
stage belongs entirely to visualization.

## 2. User journey

**First contact → insight in under a minute:**

1. **Arrive** — empty state explains the tool in one sentence and offers
   three preset scenarios ("Lossy Wi-Fi", "Satellite link", "Clean fiber")
   plus a default config already filled in. Primary action: **Run**.
2. **Run** — config posts to the backend; the complete timeline returns
   (typically < 1 s). The stage populates and **replay begins automatically
   at 1× simulation speed** — the user immediately sees packets flying and
   the cwnd curve drawing itself.
3. **Watch** — the sawtooth emerges. Loss markers pulse as they occur;
   phase bands tint the chart background (slow start / congestion
   avoidance / fast recovery).
4. **Interrogate** — pause, scrub, hover. The timeline cursor synchronizes
   every chart, the packet lane, and the stats rail (stats recompute to
   values *as of the cursor*, not just run totals).
5. **Compare** — one click adds algorithms to the same conditions and seed.
   Curves overlay; the difference becomes the story (Tahoe collapses,
   Reno halves, New Reno rides through the burst, Cubic curves back).
6. **Conclude** — the stats table quantifies what the eyes saw. Export
   (PNG of the stage / JSON of the run) for reports.

Returning users start at step 2: config persists in local storage.

## 3. Screen hierarchy

- **Workspace** (only screen)
  - State A — *Empty*: no run yet. Center stage shows the empty state
    (§11); rails are present but quiet.
  - State B — *Single Run*: charts + packet lane + stats for one algorithm.
  - State C — *Comparison*: same layout; charts become overlays/small
    multiples (§15); packet lane shows the focused algorithm only.
- **Overlays** (modal or popover; never navigate away)
  - Help / keyboard shortcuts (`?`)
  - Export dialog
  - Preset picker
- No settings page. Every control lives where its effect is visible.

## 4. Dashboard layout

Fixed three-rail layout on a 12-column grid (desktop reference: 1440×900):

```
┌────────────┬──────────────────────────────────────┬─────────────┐
│ CONFIG     │  STAGE                               │ STATS /     │
│ RAIL       │  ┌────────────────────────────────┐  │ INSPECTOR   │
│ 280px      │  │ Packet lane (custom SVG)  180px│  │ 300px       │
│            │  ├────────────────────────────────┤  │             │
│ algorithm  │  │ cwnd chart (primary)   flexible│  │ live stats  │
│ link       │  │  + phase bands + loss markers  │  │ at cursor   │
│ transfer   │  ├────────────────────────────────┤  │             │
│ seed       │  │ small multiples: throughput,   │  │ event       │
│ presets    │  │ RTT, ack progress        140px │  │ inspector   │
│ [ RUN ]    │  └────────────────────────────────┘  │             │
├────────────┴──────────────────────────────────────┴─────────────┤
│ TRANSPORT BAR: ⏵ ⏸ speed 0.5–8×  ◼━━━━●━━━━━ scrubber  t=1.284s │
└──────────────────────────────────────────────────────────────────┘
```

- Config rail is collapsible (⌘\) to give the stage the full width during
  presentation.
- All time-based visuals — packet lane, every chart, the transport bar —
  share **one time axis and one cursor**. This is the layout's central law.

## 5. Component hierarchy

```
App
├── SimulationProvider        (runs, comparison set, fetch state)
├── ReplayClockProvider       (sim-time cursor, speed, play state)
└── Workspace
    ├── ConfigRail
    │   ├── AlgorithmSelect          (single or multi for comparison)
    │   ├── LinkControls             (bandwidth, latency, loss sliders)
    │   ├── TransferControls         (size, MSS, seed + "reroll" button)
    │   ├── PresetList
    │   └── RunButton
    ├── Stage
    │   ├── PacketLane               (custom SVG; §16)
    │   ├── CwndChart                (Recharts; §14)
    │   ├── SmallMultiples
    │   │   ├── ThroughputChart
    │   │   ├── RttChart
    │   │   └── AckProgressChart
    │   └── TimeCursorOverlay        (shared crosshair + hover tooltip)
    ├── StatsRail
    │   ├── StatTiles                (six metrics, live at cursor)
    │   ├── EventInspector           (selected event detail)
    │   └── ComparisonTable          (comparison mode only)
    └── TransportBar
        ├── PlayControls
        ├── SpeedControl
        └── TimelineScrubber         (with event tick marks)
```

State philosophy: the **ReplayClock is the single source of truth for
"now"**. Charts, lane, stats, and inspector are pure functions of
(timeline, cursor). No component owns private playback state.

## 6. Navigation philosophy

- **No navigation.** One workspace; modes (single/comparison) are a
  segmented control, not routes. The URL encodes the full config + seed as
  query params so any run is shareable and reproducible — determinism is a
  product feature, not just a test convenience.
- **Keyboard-first**: `Space` play/pause · `←/→` step events · `Shift+←/→`
  jump loss events · `1–8` speed · `C` comparison · `R` re-run · `?` help.
- Direct manipulation over chrome: scrub by dragging on any chart, not
  only the transport bar.

## 7. Color system

Dark-first (light theme derived, not designed twice). Base palette is
near-neutral; **hue is reserved for meaning**.

| Role | Dark | Notes |
|---|---|---|
| Canvas | `#0E1116` | app background |
| Surface | `#161B22` | rails, cards |
| Surface-raised | `#1D242E` | popovers, tooltips |
| Border | `#2A313C` | 1px hairlines only |
| Text-primary | `#E6EDF3` | |
| Text-secondary | `#8B98A9` | labels, axes |
| Text-faint | `#5A6675` | ticks, hints |

**Algorithm identity colors** (fixed forever; colorblind-safe, from an
Okabe–Ito-derived set):

- Tahoe `#56B4E9` (sky) · Reno `#E69F00` (amber) ·
  New Reno `#009E73` (green) · Cubic `#CC79A7` (magenta)

**Semantic colors**: loss/danger `#F85149`; success `#3FB950`; the two
loss kinds are distinguished by **marker shape** (§14), never by color
alone. Phase bands are tints at 6–8% opacity of: slow start `#56B4E9`,
congestion avoidance neutral, fast recovery `#E69F00`.

Rules: no gradients on data; color never appears without a meaning; UI
chrome stays neutral so the algorithm colors own the room.

## 8. Typography system

- **UI**: Inter (fallback: system-ui). Weights 400/500/600 only.
- **Data**: JetBrains Mono for every number — stats, axes, sequence
  numbers, the time readout. Tabular figures; numbers must not jitter as
  they tick.
- Scale (px / line-height): 22/28 page-title (rare) · 15/22 section ·
  13/20 body & controls · 12/16 axis labels & table cells · 11/14
  captions. Mono sizes match their context.
- All-caps 11px 500-weight +0.06em tracking for rail section labels.
  No italics. No text shadows.

## 9. Spacing system

- Base unit **4px**; permitted steps: 4, 8, 12, 16, 24, 32, 48.
- Rail padding 16; card padding 12; control vertical rhythm 8; chart
  gutters 24 left / 12 right so y-axis labels never crowd the data.
- Density rule: related data may sit 4–8px apart; unrelated blocks get
  ≥24px. Density comes from small type + tight *related* spacing — never
  from shrinking whitespace between unrelated things.
- Hairline borders (1px) or background shifts separate regions — not both.

## 10. Animation philosophy

Two animation classes with different rules:

1. **Content animation (the replay)** — this *is* the product. Packet
   motion, the drawing cursor, marker pulses all run on the simulation
   clock (scaled by speed), driven by `requestAnimationFrame` against the
   ReplayClock. Deterministic: scrubbing to t always shows exactly the
   same frame.
2. **UI animation** — nearly invisible. 120–160ms ease-out for
   hover/focus/popover; 200ms for rail collapse. Nothing bounces, nothing
   slides in from off-screen, nothing animates on page load.

`prefers-reduced-motion`: packet motion is replaced by discrete position
updates at event timestamps; charts render instantly; the scrubber remains
fully functional. The tool must teach equally well as a stepper.

## 11. Empty states

- **First run**: the stage shows a faint, static illustration of a cwnd
  sawtooth (drawn in border-color, 1px) with one sentence — "Simulate how
  TCP decides how fast to send." — and three preset buttons + Run. No
  mascots, no oversized illustrations.
- **Stats rail (no run)**: tiles render with `—` em-dash values in
  text-faint. Structure is visible before data exists.
- **Comparison with one run**: the comparison table shows the single run's
  row plus a ghost row: "Add an algorithm to compare".

## 12. Loading states

Simulations are fast; loading UI must not overshoot the wait.

- < 300ms: no indicator at all (config → charts feels instantaneous).
- ≥ 300ms: the Run button enters a determinate-feeling working state
  (spinner replaces label; button stays in place) and the stage dims to
  85% opacity. No skeleton screens for the stage — the previous run stays
  visible until the new one replaces it (stale-while-revalidate feel).
- Never block the config rail; the user can adjust the next run while the
  current one computes.

## 13. Error states

- **Backend unreachable**: inline banner above the transport bar —
  "Simulation service unreachable" + retry button. The last successful run
  remains fully explorable; errors never clear existing data.
- **Invalid config** (client-validated first, mirrored from domain rules):
  field-level messages in the config rail, red hairline on the offending
  input, Run disabled with reason on hover. Copy states the rule, not the
  blame: "Loss probability must be between 0 and 1."
- **Simulation failed (5xx)**: stage keeps prior run; banner offers
  "Retry" and "Copy error details". No toast queues, no modal alerts.
- All error text is selectable and includes the request seed/config so a
  failure is reproducible by pasting it back.

## 14. Graph layout

**Primary: cwnd vs. simulation time** (the hero, ~55% of stage height):

- Line: 1.5px, algorithm color, no dots on the line itself, no area fill
  in single mode (subtle 8% fill allowed in single-run mode only).
- **Phase bands**: full-height background tints per §7 with 11px labels at
  the top edge on first occurrence (SS / CA / FR).
- **Loss markers on the line**: timeout = hollow diamond ◇, triple-dup-ACK
  = hollow triangle △ (shape encodes kind; both in danger color). A
  1px vertical hairline drops from marker to axis.
- **ssthresh** as a dashed 1px step-line in text-faint (togglable).
- Y-axis: segments, integer ticks, axis line suppressed (ticks + labels
  only). X-axis: seconds, shared with all other time visuals.
- Replay behavior: the drawn portion of the line is full-opacity up to the
  cursor; the future portion renders at 15% (ghost preview) so the viewer
  knows the shape is already computed — honesty about replay-not-live.

**Small multiples** (share x-axis, ~1/3 stage height, individually
collapsible): throughput (bytes/s, step area), RTT per delivered packet
(dots), cumulative ack progress vs. highest-transmitted (two thin lines —
the gap between them *is* the loss story). One synced crosshair across
all charts; a single tooltip anchored to the cursor listing values from
every visible chart (one tooltip, not four).

## 15. Comparison mode layout

- Default: **overlay** on the primary chart — one line per algorithm in
  identity colors, common seed and conditions enforced by construction
  (config is shared; only the algorithm list varies). Phase bands are
  disabled in overlay (they'd be ambiguous); loss markers render per
  algorithm at 70% size.
- Toggle: **small-multiples grid** (2×2 max) with locked y-domains across
  cells, for when overlays tangle.
- Packet lane shows one *focused* algorithm; focus follows the legend
  selection (legend doubles as focus control; the focused row is bold).
- Stats rail becomes a **comparison table**: metrics as rows, algorithms
  as columns, best value per row subtly marked (500-weight, not color).
  A "Δ vs. Reno" toggle re-renders values as deltas against a baseline.
- Replay stays synchronized across all runs — same clock, same scrubber.

## 16. Packet visualization layout

Custom SVG, one horizontal **flight lane** (sender left, receiver right):

```
 SENDER ┃●──▶   ●──▶    ◀──○     ✕      ┃ RECEIVER
        ┃   seq 12000   ack 9000  loss  ┃
```

- Data packets: filled circles in algorithm color traveling left→right
  over their transmission+propagation duration; ACKs: smaller hollow
  circles returning right→left. Position is a pure function of sim time —
  scrub-safe.
- Loss: the packet fades and collapses to a ✕ at its loss point; the ✕
  persists for 1.5 sim-seconds then fades to 20% and remains as a scar
  until the next scrub.
- A thin **sequence strip** under the lane maps the byte stream: delivered
  prefix (filled), in-flight (hatched), holes (danger tint). This is the
  cumulative-ACK story made visible, and it's where retransmissions
  visibly fill gaps.
- Hovering any packet shows seq range, size, send time, and fate; clicking
  pins it in the EventInspector and (if lost) highlights its
  retransmission.
- Cap simultaneous rendered packets (~60); beyond that, aggregate into
  density bands — the lane must stay legible on 100k-byte runs.

## 17. Responsive strategy

Desktop-first; this is an instrument, not a phone app.

- **≥ 1280px**: full three-rail layout (reference design).
- **1024–1279px**: stats rail collapses into tabs over the config rail
  space; stage keeps priority.
- **768–1023px**: rails become edge drawers; stage stacks (lane above
  charts); transport bar persists. Fully functional, denser.
- **< 768px**: read-only "report" mode — charts and stats stack
  vertically, replay works (tap to pause, drag to scrub), config editing
  deferred to a full-screen sheet. No attempt to miniaturize the lane;
  it hides below 600px in favor of the sequence strip.
- Charts are fluid at every width; rails are fixed-width. Breakpoints are
  about *which regions exist*, never about reflowing text.

## 18. Accessibility considerations

- **Never color-alone**: loss kinds use shape; algorithms use color *and*
  line label + legend order; phase bands carry text labels.
- Contrast: all text ≥ 4.5:1 on its surface; data lines ≥ 3:1 against
  canvas (the chosen identity colors pass on `#0E1116`).
- **Keyboard**: complete operation without a pointer (§6 shortcuts; all
  controls tabbable in visual order; scrubber is a proper slider with
  arrow-key stepping; focus rings 2px, never suppressed).
- **Screen readers**: the replay announces state changes via a polite
  live region at most once per second ("t = 1.2 s, window 14 segments,
  fast recovery"); charts expose an off-screen data-table alternative
  (per-RTT samples) — the same table that powers CSV export.
- `prefers-reduced-motion` honored per §10; `prefers-color-scheme`
  respected with manual override.
- Hit targets ≥ 24×24px even in dense areas (markers get invisible
  padding); tooltips are hoverable and dismissible with `Esc`.

---

### Implementation notes (binding)

- Recharts renders every chart; the packet lane and sequence strip are
  hand-written SVG (per TECH_STACK and Task decisions).
- The ReplayClock abstraction must exist before any chart is built —
  every visual is a function of (timeline, cursor).
- Identity colors, marker shapes, and the time-axis law (§4) are
  non-negotiable invariants; spacing and exact pixel values may flex
  during implementation within the stated scales.
