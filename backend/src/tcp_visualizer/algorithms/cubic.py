"""TCP Cubic congestion control (RFC 8312)."""

from tcp_visualizer.algorithms.phase import CongestionPhase
from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    CongestionSignal,
    DomainError,
    Timeout,
    TripleDuplicateAck,
)

# RFC 8312 constants: C scales window growth (segments per second cubed);
# beta is the multiplicative decrease factor applied on congestion.
_C = 0.4
_BETA = 0.7


class TcpCubic(CongestionControlAlgorithm):
    """TCP Cubic: window growth as a cubic function of time since congestion.

    Unlike the Reno family, whose windows grow per acknowledgement, Cubic
    (RFC 8312) grows toward the pre-congestion peak ``W_max`` along a cubic
    curve of *elapsed wall-clock time*: ``W(t) = C*(t - K)^3 + W_max``,
    where ``K`` is the time the curve takes to return to ``W_max`` from the
    post-reduction window (``K = cbrt((W_max - cwnd)/C)``, the general form
    used by production implementations). Growth is therefore concave while
    approaching the old peak, plateaus near it, and turns convex beyond it
    while probing for new capacity.

    Behavior:

    - Slow start below ``ssthresh`` is standard (RFC 5681), as RFC 8312
      permits.
    - On ``TripleDuplicateAck``: remember the peak (``W_max = cwnd``, or
      ``cwnd * (1+beta)/2`` under fast convergence when the peak is lower
      than the previous one), then reduce multiplicatively:
      ``ssthresh = cwnd * beta`` (floored at 2 segments) and
      ``cwnd = ssthresh`` — a gentler cut than Reno's halving. The signal's
      ``highest_transmitted_sequence_number`` marks the episode; further
      duplicate-ACK losses before an ACK covers it cause no additional
      reduction, matching one-reduction-per-congestion-event semantics.
    - On ``Timeout``: remember the peak, then collapse to 1 segment and
      restart slow start.
    - The growth epoch restarts on the first congestion-avoidance ACK after
      any reduction; the window then follows the cubic curve directly
      (never decreasing within an epoch).

    Simplifications relative to RFC 8312, kept deliberately:

    - The TCP-friendly region (section 4.2) is omitted — it requires an RTT
      estimate, which is not part of the signal vocabulary; if an RTT
      sample is added to ``AckReceived`` for BBR later, the region can be
      added without interface changes.
    - Hybrid slow start (HyStart) is not modeled; standard slow start is
      used.
    - The window is set to the cubic target directly on each ACK rather
      than incremented toward ``W(t + RTT)`` per ACK (section 4.1), again
      because no RTT estimate exists; the visualized trajectory is the
      cubic curve itself.
    - During an episode the window keeps following the cubic curve rather
      than being frozen by a recovery mechanism (this engine has no
      proportional-rate-reduction analogue).
    """

    def __init__(self, *, initial_ssthresh_segments: float = 64.0) -> None:
        if initial_ssthresh_segments < 1:
            raise DomainError("initial_ssthresh_segments must be at least 1.")
        self._congestion_window_segments = 1.0
        self._ssthresh_segments = initial_ssthresh_segments
        self._w_max_segments = 0.0
        self._epoch_start_time: float | None = None
        self._k_seconds = 0.0
        self._recover_sequence_number: int | None = None

    @property
    def name(self) -> str:
        return "cubic"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    @property
    def ssthresh_segments(self) -> float:
        """The current slow-start threshold, in segments."""
        return self._ssthresh_segments

    @property
    def w_max_segments(self) -> float:
        """The remembered pre-congestion peak window, in segments."""
        return self._w_max_segments

    @property
    def phase(self) -> CongestionPhase:
        """The regime the next acknowledgement will be handled under."""
        if self._congestion_window_segments < self._ssthresh_segments:
            return CongestionPhase.SLOW_START
        return CongestionPhase.CONGESTION_AVOIDANCE

    def on_signal(self, signal: CongestionSignal) -> None:
        match signal:
            case AckReceived(
                acknowledged_segments=acknowledged,
                current_time=current_time,
                ack_sequence_number=ack_sequence,
            ):
                if (
                    self._recover_sequence_number is not None
                    and ack_sequence >= self._recover_sequence_number
                ):
                    self._recover_sequence_number = None
                if self.phase is CongestionPhase.SLOW_START:
                    self._congestion_window_segments += acknowledged
                else:
                    self._grow_along_cubic_curve(current_time)
            case TripleDuplicateAck(highest_transmitted_sequence_number=highest_transmitted):
                if self._recover_sequence_number is None:
                    self._recover_sequence_number = highest_transmitted
                    self._remember_peak()
                    self._ssthresh_segments = max(self._congestion_window_segments * _BETA, 2.0)
                    self._congestion_window_segments = self._ssthresh_segments
                    self._epoch_start_time = None
            case Timeout():
                self._remember_peak()
                self._ssthresh_segments = max(self._congestion_window_segments * _BETA, 2.0)
                self._congestion_window_segments = 1.0
                self._epoch_start_time = None
                self._recover_sequence_number = None
            case _:
                pass

    def _remember_peak(self) -> None:
        # Fast convergence (RFC 8312 section 4.6): when the new peak is
        # lower than the last one, capacity has shrunk — release it faster
        # by remembering a further-reduced peak.
        if self._congestion_window_segments < self._w_max_segments:
            self._w_max_segments = self._congestion_window_segments * (1 + _BETA) / 2
        else:
            self._w_max_segments = self._congestion_window_segments

    def _grow_along_cubic_curve(self, current_time: float) -> None:
        if self._epoch_start_time is None:
            self._epoch_start_time = current_time
            if self._w_max_segments > self._congestion_window_segments:
                self._k_seconds = (
                    (self._w_max_segments - self._congestion_window_segments) / _C
                ) ** (1.0 / 3.0)
            else:
                self._w_max_segments = self._congestion_window_segments
                self._k_seconds = 0.0
        elapsed = current_time - self._epoch_start_time
        target = _C * (elapsed - self._k_seconds) ** 3 + self._w_max_segments
        if target > self._congestion_window_segments:
            self._congestion_window_segments = target
