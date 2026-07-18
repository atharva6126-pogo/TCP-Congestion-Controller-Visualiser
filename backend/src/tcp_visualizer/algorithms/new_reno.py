"""TCP New Reno congestion control (RFC 6582)."""

from tcp_visualizer.algorithms.phase import CongestionPhase
from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    CongestionSignal,
    DomainError,
    Timeout,
    TripleDuplicateAck,
)


class TcpNewReno(CongestionControlAlgorithm):
    """TCP New Reno: Reno with recovery that survives multiple losses per window.

    Growth outside recovery is identical to Reno (RFC 5681 section 3.1, in
    segment units). The difference is the recovery episode (RFC 6582): on a
    ``TripleDuplicateAck`` the window halves *once* and the signal's
    ``highest_transmitted_sequence_number`` is recorded as the ``recover``
    marker. Until an acknowledgement covers ``recover``:

    - further ``TripleDuplicateAck`` signals belong to the same episode and
      cause no additional reduction — the fix for Reno's compounding
      halvings under burst loss;
    - a *partial ACK* (``ack_sequence_number`` below ``recover``) confirms
      another segment from the same window was lost; the engine retransmits
      it, and the window holds at ``ssthresh``;
    - a *full ACK* (``ack_sequence_number`` at or beyond ``recover``) ends
      the episode and congestion avoidance resumes; growth restarts on the
      following acknowledgement.

    A ``Timeout`` in any state collapses the window to 1 segment, ends any
    recovery episode, and restarts slow start, exactly as in Tahoe/Reno.

    Modeling simplifications (see ADR 0003): fast recovery's transient
    window inflation and partial window deflation are not modeled — the
    window simply holds at ``ssthresh`` for the episode; and a timeout
    resets the episode outright, since the spurious-retransmission
    ambiguity RFC 6582 guards against does not arise in this engine.
    """

    def __init__(self, *, initial_ssthresh_segments: float = 64.0) -> None:
        if initial_ssthresh_segments < 1:
            raise DomainError("initial_ssthresh_segments must be at least 1.")
        self._congestion_window_segments = 1.0
        self._ssthresh_segments = initial_ssthresh_segments
        self._recover_sequence_number: int | None = None

    @property
    def name(self) -> str:
        return "new_reno"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    @property
    def ssthresh_segments(self) -> float:
        """The current slow-start threshold, in segments."""
        return self._ssthresh_segments

    @property
    def phase(self) -> CongestionPhase:
        """The regime the next signal will be handled under."""
        if self._recover_sequence_number is not None:
            return CongestionPhase.FAST_RECOVERY
        if self._congestion_window_segments < self._ssthresh_segments:
            return CongestionPhase.SLOW_START
        return CongestionPhase.CONGESTION_AVOIDANCE

    def on_signal(self, signal: CongestionSignal) -> None:
        match signal:
            case AckReceived(acknowledged_segments=acknowledged, ack_sequence_number=ack_sequence):
                if self._recover_sequence_number is not None:
                    if ack_sequence >= self._recover_sequence_number:
                        # Full ACK: the episode's window has been delivered.
                        self._recover_sequence_number = None
                    return
                if self.phase is CongestionPhase.SLOW_START:
                    self._congestion_window_segments += acknowledged
                else:
                    self._congestion_window_segments += (
                        acknowledged / self._congestion_window_segments
                    )
            case TripleDuplicateAck(highest_transmitted_sequence_number=highest_transmitted):
                if self._recover_sequence_number is None:
                    self._ssthresh_segments = max(self._congestion_window_segments / 2, 2.0)
                    self._congestion_window_segments = self._ssthresh_segments
                    self._recover_sequence_number = highest_transmitted
            case Timeout():
                self._ssthresh_segments = max(self._congestion_window_segments / 2, 2.0)
                self._congestion_window_segments = 1.0
                self._recover_sequence_number = None
            case _:
                pass
