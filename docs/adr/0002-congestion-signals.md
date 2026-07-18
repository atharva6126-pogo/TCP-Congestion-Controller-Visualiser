# 2. Congestion Signals and the Reno Loss Model

Date: 2026-07-18

## Status

Accepted

## Context

TCP Reno is the first algorithm whose response depends on *which* loss
signal it observes (RFC 5681 section 3.2): a loss inferred from three
duplicate acknowledgements triggers fast retransmit and fast recovery
(halve the window, keep transmitting), while a retransmission timeout
collapses the window to one segment and restarts slow start, exactly as
in Tahoe. The original strategy interface exposed a single
undifferentiated `on_packet_loss` hook, which was sufficient for Tahoe
(whose response to both signals is identical) but cannot express Reno at
all. Looking further ahead, New Reno reacts to ACKs that only partially
cover the data outstanding when recovery began, and BBR consumes rich
per-ACK payloads (delivery-rate and RTT samples) while barely reacting
to loss — so the real, recurring pressure on the interface is richer and
more varied signals overall, most of them ACK-shaped, not merely more
kinds of loss.

## Decision

### Signals are first-class domain objects delivered through one hook

The interface's `on_ack`/`on_packet_loss` pair is replaced by a single
`on_signal(signal: CongestionSignal)` method. `CongestionSignal` is a
union of small immutable dataclasses: `AckReceived(acknowledged_segments,
current_time)`, `TripleDuplicateAck(current_time)`, and
`Timeout(current_time)`. Algorithms pattern-match on the signals they
understand and ignore the rest (a wildcard arm), which is the extension
mechanism: a future signal kind, or an additive payload field on
`AckReceived` (cumulative sequence data for New Reno, rate samples for
BBR), never requires touching existing algorithms or the interface
signature.

A `LossType` enum parameter on the existing fixed methods was rejected:
it patches only the loss channel, while the roadmap's churn (New Reno,
BBR) lands on the ACK channel, forcing a signature change per future
algorithm — each rippling through every implementation. Separate
abstract methods per signal were rejected (every algorithm forced to
implement all of them forever), as was passing raw engine mechanics such
as duplicate-ACK counts (each algorithm would reimplement detection
heuristics, and engine internals would leak).

### Signals carry network observations only

A signal must describe something the simulated network was observed to
do — never an algorithm's interpretation of it. This rule is what keeps
the engine algorithm-agnostic. Two candidate signals were rejected under
it: `PartialAck` ("partial" is defined relative to a Reno-family
algorithm's private recovery marker; the underlying network fact is a
cumulative ACK, which will be added to `AckReceived`'s payload when New
Reno needs it) and `RecoveryComplete` (not an input at all, but a state
transition the algorithm itself concludes; an engine that emitted it
would have to track algorithm state).

### Timeline events reference signals by composition, not inheritance

`SimulationEvent` gains an optional `signal` field rather than
`CongestionSignal` subclassing `SimulationEvent`. A signal is an *input
message* to the strategy at decision time; an event is an *output record*
in the replay log — the record of the observation, not the observation
itself. Inheritance was rejected because it fuses those roles: it forces
the flat, enum-discriminated event model into a polymorphic hierarchy,
makes every new signal a change to the timeline wire schema, creates a
duplication dilemma in the replay stream (a `Timeout` entry *and* a
`PACKET_LOST` entry for one occurrence), hands algorithms access to
event surface such as packet references (reintroducing the rejected
raw-mechanics design), and locks delivery to recording 1:1 — so BBR-era
high-frequency samples could not be delivered to the algorithm without
also bloating the replay log. With composition, a loss event carries its
cause in one timeline entry, the event schema stays stable as the signal
vocabulary grows, and what is delivered versus what is recorded remains
an engine choice rather than a type-system obligation.

### Loss classification rule

The engine classifies each detected loss deterministically: if at least
three *other* packets are in flight at detection time, the loss is
reported as `TripleDuplicateAck` — those packets are what generate the
duplicate acknowledgements fast retransmit needs — otherwise as
`Timeout`. This mirrors the real phenomenon (small windows cannot
produce three duplicate ACKs, so their losses surface as timeouts)
without modeling receiver-side ACK generation.

### Reno modeling simplifications

- Fast recovery's transient window inflation (`cwnd = ssthresh + 3`,
  +1 per additional duplicate ACK, deflation on the recovery ACK) is not
  modeled. The engine emits no per-duplicate-ACK signals and delivery
  continues during recovery regardless, so inflation would be
  unobservable cosmetics; the modeled outcome — halve and continue in
  congestion avoidance — is the behavior the visualizer teaches.
- Both loss kinds are detected one round trip after the send. A real RTO
  is much longer (SRTT + 4·RTTVAR, floored at 1 s); modeling it would
  change classification of nothing but would stall timelines. If
  visually honest timeout stalls are wanted later, that is an
  engine-only change behind the same interface.
- Each loss signal triggers its own response, so several losses within
  one window compound. This qualitatively mirrors real Reno's
  multi-loss weakness; addressing it properly is the New Reno task's
  explicit subject.

## Consequences

- Reno, Cubic, and BBR are implementable without further interface
  changes; New Reno requires only an additive payload field on
  `AckReceived`.
- Tahoe migrates to `on_signal` with byte-identical behavior (both loss
  signals map to its single collapse response).
- `PACKET_ACKNOWLEDGED` and `PACKET_LOST` timeline events record their
  causing signal, giving the frontend loss-kind attribution (e.g. a
  "timeout" vs "fast retransmit" marker) for free.
- The statistics layer can later derive per-kind loss counts by reading
  `event.signal`; no collector changes were required now.
- The signal vocabulary is governed by the network-observations-only
  rule; proposals that encode algorithm state into signals should be
  rejected in review.
