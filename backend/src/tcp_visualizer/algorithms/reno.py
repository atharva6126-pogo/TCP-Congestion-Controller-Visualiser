"""TCP Reno congestion control (RFC 5681, sections 3.1 and 3.2)."""

from tcp_visualizer.algorithms.phase import CongestionPhase
from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    CongestionSignal,
    DomainError,
    Timeout,
    TripleDuplicateAck,
)


class TcpReno(CongestionControlAlgorithm):
    """TCP Reno: Tahoe's growth rules plus fast recovery on duplicate ACKs.

    Slow start and congestion avoidance are identical to Tahoe (RFC 5681
    section 3.1, in segment units). What distinguishes Reno is that its
    response depends on *which* loss signal arrives (section 3.2):

    - ``TripleDuplicateAck`` (fast retransmit): ``ssthresh = max(cwnd/2, 2)``
      and ``cwnd = ssthresh`` — the window halves and transmission continues
      in congestion avoidance rather than collapsing.
    - ``Timeout``: identical to Tahoe — ``ssthresh = max(cwnd/2, 2)``,
      ``cwnd = 1``, and slow start restarts.

    Modeling simplifications (see ADR 0002): fast recovery's transient
    window inflation (``cwnd = ssthresh + 3``, +1 per further duplicate
    ACK, deflation on the recovery ACK) is not modeled — the engine emits
    no per-duplicate-ACK signals and delivery continues during recovery, so
    inflation would be unobservable; the modeled outcome (halve, continue)
    is the behavior the visualizer teaches. Each loss signal triggers its
    own response, so several losses within one window compound — which
    qualitatively mirrors real Reno's well-known multi-loss weakness that
    New Reno was designed to fix.
    """

    def __init__(self, *, initial_ssthresh_segments: float = 64.0) -> None:
        if initial_ssthresh_segments < 1:
            raise DomainError("initial_ssthresh_segments must be at least 1.")
        self._congestion_window_segments = 1.0
        self._ssthresh_segments = initial_ssthresh_segments

    @property
    def name(self) -> str:
        return "reno"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    @property
    def ssthresh_segments(self) -> float:
        """The current slow-start threshold, in segments."""
        return self._ssthresh_segments

    @property
    def phase(self) -> CongestionPhase:
        """Which growth regime the next ACK will be handled under."""
        if self._congestion_window_segments < self._ssthresh_segments:
            return CongestionPhase.SLOW_START
        return CongestionPhase.CONGESTION_AVOIDANCE

    def on_signal(self, signal: CongestionSignal) -> None:
        match signal:
            case AckReceived(acknowledged_segments=acknowledged):
                if self.phase is CongestionPhase.SLOW_START:
                    self._congestion_window_segments += acknowledged
                else:
                    self._congestion_window_segments += (
                        acknowledged / self._congestion_window_segments
                    )
            case TripleDuplicateAck():
                self._ssthresh_segments = max(self._congestion_window_segments / 2, 2.0)
                self._congestion_window_segments = self._ssthresh_segments
            case Timeout():
                self._ssthresh_segments = max(self._congestion_window_segments / 2, 2.0)
                self._congestion_window_segments = 1.0
            case _:
                pass
