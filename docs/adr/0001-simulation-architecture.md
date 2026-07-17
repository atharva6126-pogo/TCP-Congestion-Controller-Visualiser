# 1. Simulation Architecture

Date: 2026-07-18

## Status

Accepted

## Context

The TCP Congestion Control Visualizer runs simulations of TCP congestion
control algorithms (Tahoe, Reno, New Reno, Cubic, and eventually BBR) over a
modeled network link, then lets a frontend dashboard render the result as
graphs and packet-flow animations. Several foundational decisions shape
every layer built on top of them: how the simulation is executed, how its
output reaches the frontend, whether its output is reproducible, how
algorithms plug into the engine, and how independent the core model is from
any particular framework. This ADR records those decisions together, since
they were made as one coherent architecture rather than in isolation.

## Decision

### SimPy for discrete-event simulation

TCP congestion control is driven by asynchronous events — packet sent, ACK
received, timeout fired, loss detected — that don't occur at evenly spaced
intervals. A fixed-timestep loop would either waste computation stepping
through idle time or require careful step sizing to avoid distorting cwnd
growth curves, which matters for algorithms like Cubic whose growth depends
on precise elapsed time since the last congestion event, not just an ACK
count. SimPy models the simulation as generator-based processes scheduled on
an event queue, which maps naturally onto "send packet → wait propagation
delay → deliver → wait for ACK path → acknowledge" pipelines, and it's a
mature, well-documented library rather than a hand-rolled `heapq`-based event
scheduler we'd have to build and test ourselves.

SimPy is a simulation-execution concern, not a domain concern: it belongs to
an infrastructure/application layer that drives the domain's
`CongestionControlAlgorithm` strategies, not to the domain layer itself (see
below).

### The backend computes the complete simulation before returning it

A given `SimulationConfig` is run to completion in a single request, and the
full event timeline is returned in one response, rather than streamed live
as it's computed. Simulated network time and wall-clock compute time are
unrelated — a simulation spanning tens of seconds of simulated network
activity may compute in milliseconds — so treating the result as "live"
would mean either artificially throttling the backend to match a playback
rate or building connection-lifecycle and backpressure handling into the API
for no real benefit, since nothing is actually being observed live. Returning
the complete timeline instead lets the frontend own playback entirely:
play, pause, scrub, and change speed against a fixed, already-computed
dataset, which is strictly more flexible for an educational visualizer than
a live stream would be.

This keeps the API a plain request/response contract (submit a config,
receive a `SimulationResult`) with no persistent connection required. If a
genuinely interactive simulation becomes a requirement later (for example,
a user injecting a packet loss mid-run), that would be a deliberate,
separate extension rather than a retrofit of this decision.

### Deterministic, seeded simulations

`SimulationConfig.seed` is a required field with no default. Packet loss and
any other stochastic element must be derived from that seed rather than from
system randomness. This matters for three reasons: automated tests can
assert exact outcomes instead of tolerating flaky, randomly-varying results;
comparing algorithms against each other is only meaningful if they face
identical simulated network conditions, including the same loss events at
the same times; and a simulation run — including one used in a demo or
portfolio walkthrough — should be exactly reproducible on request, not
different each time it's re-run.

Pushing loss generation into the frontend instead was rejected: modeling the
network is a backend/domain concern, and splitting it across the boundary
would break that separation for no benefit.

### Strategy pattern for congestion control algorithms

Tahoe, Reno, New Reno, Cubic, and eventually BBR all observe acknowledgements
and packet loss and expose a congestion window, but differ substantially in
their internal update rules — Reno/Tahoe grow per round-trip, Cubic grows as
a function of elapsed time since the last congestion event, and BBR is
model-based rather than loss-reactive at all. The `CongestionControlAlgorithm`
interface lets the simulation engine depend on one abstraction instead of
branching on algorithm type, satisfies the Open/Closed Principle (new
algorithms can be added without modifying the engine or existing
algorithms), and keeps each algorithm unit-testable in isolation.

A single parameterized function or class with conditional branches per
algorithm was rejected as an unmaintainable, hard-to-test alternative that
would only grow worse with each new algorithm. A shared base class using a
template-method pattern was also rejected: Reno/Tahoe's round-based growth
and Cubic's time-based growth are different enough that forcing a common
method template would leak one family's assumptions into the other. The
interface itself deliberately excludes Reno-specific concepts such as
`ssthresh`, since algorithms like Cubic and BBR don't share that model —
narrower is better here (Interface Segregation).

### A framework-independent domain layer

The domain layer — `Node`, `Link`, `Packet`, `SimulationConfig`,
`SimulationResult`, `SimulationEvent`, and `CongestionControlAlgorithm` —
has no dependency on FastAPI, SimPy, or any other framework. It encodes the
actual problem being solved and should be understandable, testable, and
reusable independent of how it's delivered (FastAPI today) or executed
(SimPy today). This keeps domain tests fast and simple — asserting that a
`Link` rejects an invalid loss probability requires no HTTP server and no
SimPy environment — and it insulates the core model from churn in outer
layers, so a FastAPI upgrade or a future change of simulation engine
shouldn't require touching domain code.

Putting Pydantic models directly in the domain layer was rejected, since it
would couple core entities to a web framework's validation conventions and
pull a framework dependency into what should be pure business logic.
Embedding SimPy `Process`/`Environment` objects into domain entities was
also rejected, since domain objects would then require a running SimPy
environment just to construct, slowing down unit tests and blurring the
line between "the model" and "the simulation."

## Consequences

- Simulation execution code (SimPy processes, RNG derived from
  `SimulationConfig.seed`) belongs to an application/infrastructure layer
  that has not been built yet; the domain layer defines the contracts it
  must honor but does not implement or depend on it.
- The API surface is a single synchronous request/response cycle per
  simulation run; no WebSocket/SSE infrastructure is required for
  correctness.
- Any future algorithm (e.g. BBR) is added by implementing
  `CongestionControlAlgorithm`, without modifying the simulation engine or
  other algorithms.
- Translating between domain entities and FastAPI request/response schemas
  (e.g. Pydantic models) is the responsibility of an outer layer, not the
  domain itself.
