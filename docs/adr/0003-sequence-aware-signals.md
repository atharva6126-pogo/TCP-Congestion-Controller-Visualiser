# 3. Sequence-Aware Signal Payloads and the New Reno Recovery Model

Date: 2026-07-18

## Status

Accepted

## Context

TCP New Reno (RFC 6582) fixes Reno's compounding window reductions under
multiple losses in one window by introducing the *recovery episode*: on
entering fast recovery the sender records ``recover`` — the highest
sequence number transmitted — and judges every subsequent ACK against
it. A *partial ACK* (advances the cumulative point without covering
``recover``) signals another loss from the same window: retransmit and
stay in recovery without reducing again. A *full ACK* (covers
``recover``) ends the episode. This logic is defined entirely in
sequence space, and the Task 5 signal vocabulary carried none:
``AckReceived`` said how much arrived but not where the cumulative point
stood, and loss signals carried only a timestamp. An algorithm therefore
could not distinguish a second loss in the same window from a loss in a
new window. ADR 0002 anticipated this: the cumulative ACK was named as
the network fact that would be added to ``AckReceived``'s payload when
New Reno needed it.

## Decision

### Sequence-aware payloads (over episode tracking by proxy)

Two fields are added, both transport-level observations under ADR 0002's
network-observations-only rule:

- ``AckReceived.ack_sequence_number`` — the cumulative acknowledgment
  point: the byte offset of the next byte the receiver expects,
  mirroring the TCP header's Acknowledgment Number.
- ``TripleDuplicateAck.highest_transmitted_sequence_number`` and
  ``Timeout.highest_transmitted_sequence_number`` — the byte offset one
  past the highest byte transmitted (``snd.nxt``), the value RFC 6582's
  ``recover`` marker records.

The engine gains the corresponding bookkeeping — highest sequence
transmitted, and the contiguous delivered prefix of the stream — which
is cumulative-acknowledgment transport mechanics, fully
algorithm-agnostic. Partial-versus-full judgement stays inside New Reno,
preserving the ADR 0002 boundary: the engine reports facts, the
algorithm interprets them. No event timing, ordering, or counts change.

The alternative — no interface change, with New Reno approximating
episodes by counting acknowledged segments against its window size at
recovery entry — was rejected: episode boundaries become approximate
(window size is only a proxy for flight size), the partial-ACK concept
that New Reno exists to teach becomes invisible and unvisualizable, the
algorithm ends up re-deriving flight-size mechanics internally (the
pattern ADR 0002 rejected), and BBR's need for delivered-progress data
would only be deferred, not avoided.

The new fields are *required*, not defaulted: a placeholder cumulative
value would be semantically meaningless and would mask engine bugs. The
churn is confined to the engine and signal-constructing tests; existing
algorithms match signals by keyword and needed no changes.

### Naming: sequence-number vocabulary, not byte-amount vocabulary

``ack_sequence_number`` was chosen over ``cumulative_acknowledged_bytes``
(and ``highest_transmitted_sequence_number`` over a ``…_bytes`` name).
Every existing ``_bytes`` field in the codebase (``size_bytes``,
``total_bytes_to_transfer``) denotes an *amount*; these fields are
*coordinates* in the stream's sequence space, the same coordinate system
as ``Packet.sequence_number``. The chosen names match the TCP header
term (Acknowledgment Number) and RFC 6582's own phrase, compose
naturally with future SACK blocks (ranges of sequence numbers), stay
unambiguous under variable MSS, and deliberately leave amount-style
naming (e.g. a ``delivered_bytes`` counter) free for BBR's rate
estimator, which is a genuine amount and can differ from the cumulative
point when holes exist.

### New Reno recovery model and the FAST_RECOVERY phase

``TcpNewReno`` halves once on the ``TripleDuplicateAck`` that opens an
episode (``ssthresh = max(cwnd/2, 2)``, ``cwnd = ssthresh``) and records
``recover`` from the signal. During the episode: further
``TripleDuplicateAck`` signals cause no reduction; partial ACKs hold the
window (the engine already retransmits holes); a full ACK ends the
episode and congestion avoidance resumes on the following ACK. A
``Timeout`` in any state collapses to 1 segment, ends the episode, and
restarts slow start. ``CongestionPhase`` gains ``FAST_RECOVERY``:
unlike Reno's instantaneous recovery, New Reno's spans many signals and
is observable — tests assert it and the frontend can shade recovery
periods.

### Simplifications carried forward or introduced

- Fast recovery's window inflation and RFC 6582's partial window
  deflation are not modeled: nothing is inflated, so the window simply
  holds at ``ssthresh`` for the episode (carried from ADR 0002).
- A timeout resets the episode outright; RFC 6582's
  spurious-fast-retransmit guard addresses retransmission ambiguity this
  engine does not model.
- Algorithms grow on every *delivered* segment even when it does not
  advance the cumulative point (a real receiver would emit a duplicate
  ACK instead). This pre-existing engine simplification is inherited;
  New Reno's episode-exit logic remains correctly sequence-based because
  it is a threshold comparison, but the visual partial-ACK ladder is
  coarser than a real trace.

## Consequences

- New Reno is implemented with no interface signature change — the
  payload-evolution path chosen in ADR 0002 worked as designed.
- ``ack_sequence_number`` plus signal timestamps are the inputs BBR's
  delivery-rate estimation consumes; Cubic needs neither new field and
  ignores both.
- Timeline events now expose cumulative progress and highest-transmitted
  data to the frontend (progress indicators, recovery shading) with no
  event-schema changes beyond the richer signal payloads.
- A future ``delivered_bytes`` amount field for BBR remains cleanly
  nameable alongside the coordinate fields.
