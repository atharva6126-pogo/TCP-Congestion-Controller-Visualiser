# 4. Phase Reporting and the Simulation API

Date: 2026-07-18

## Status

Accepted

## Context

Two things were needed to connect the frontend to real simulations.

First, DESIGN_SPEC §14 requires the congestion window chart to show
which growth regime the window is in — slow start, congestion
avoidance, or fast recovery. The timeline carried the window value but
not the regime, and the frontend cannot honestly derive it: doing so
would mean reimplementing each algorithm's rules against state the
strategy deliberately keeps private (ssthresh, New Reno's recovery
marker), duplicating logic that already exists and drifting from it the
moment an algorithm changes.

Second, the simulation engine had no HTTP surface at all; the only
endpoint was `/health`.

## Decision

### Phase is reported through an optional property on the strategy

`CongestionControlAlgorithm` gains a **non-abstract** `phase` property
returning `CongestionPhase | None`, defaulting to `None`. The engine
records it on congestion-window-change events, and `SimulationEvent`
gains a matching optional `phase` field. `CongestionPhase` moves into
the domain (where the interface can reference it) and is re-exported
from `algorithms.phase` so existing imports keep working.

Being optional and non-abstract is the point. ADR 0002 established that
the interface stays narrow and family-neutral: Reno-specific concepts
such as ssthresh must not leak into it. Phase is not a control input —
nothing in the engine or any algorithm reads it, and it cannot change a
simulation's outcome. It is observability: a label the algorithm
already computes for itself, exposed so the timeline can explain *why*
the window moved. Algorithms with no meaningful window-growth regime
(a future BBR) simply leave the default `None`, so the contract imposes
nothing on them.

An abstract property was rejected because it would force every future
algorithm to invent a phase. Deriving phase in the engine was rejected
because the engine must stay algorithm-agnostic; deriving it in the
frontend was rejected for the duplication described above.

Tests assert that reporting phase leaves windows and timings unchanged,
and that an algorithm which does not report one yields `None`.

### `POST /simulations` returns the whole run

The endpoint accepts the full configuration (algorithm, seed, link,
transfer, MSS), runs the simulation to completion, and returns the
event timeline together with the run statistics — the
backend-computes-everything decision from ADR 0001, now on the wire.
The same request body always produces the same response, so a run is
reproducible and shareable by its configuration alone.

Pydantic models live only at the API boundary (`api/schemas.py`) and
map to and from domain objects there; the domain imports nothing from
the API. Their bounds are tighter than the domain's invariants because
they bound the work and payload of a single request. Notably the loss
probability is capped at 0.5: the domain permits 1.0, but a link that
drops every packet would retransmit forever, since the engine runs
until the transfer completes.

The response omits the statistics collector's
`congestion_window_history`, which would restate window-change events
already in the timeline; every window visual derives from those events.

## Consequences

- The frontend renders phase bands from data the backend supplies, with
  no algorithm logic duplicated across the boundary.
- Adding an algorithm means registering it in `algorithms.registry`;
  the API's algorithm enum is asserted against that registry so the two
  cannot silently diverge.
- Exposing ssthresh the same way would unlock DESIGN_SPEC §14's
  optional ssthresh step-line, still omitted for lack of data.
- Long-running or very large simulations remain a synchronous request;
  the DTO bounds are what keep that acceptable.
