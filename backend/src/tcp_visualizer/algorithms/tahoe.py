"""TCP Tahoe congestion control (RFC 5681 semantics, without fast recovery)."""

from enum import StrEnum

from tcp_visualizer.domain import CongestionControlAlgorithm, DomainError


class TahoePhase(StrEnum):
    """The congestion-control phase Tahoe is currently operating in."""

    SLOW_START = "slow_start"
    CONGESTION_AVOIDANCE = "congestion_avoidance"


class TcpTahoe(CongestionControlAlgorithm):
    """TCP Tahoe: slow start, congestion avoidance, and full window collapse on loss.

    Follows RFC 5681 with congestion window and ssthresh expressed in
    segments rather than bytes:

    - Slow start (cwnd < ssthresh): cwnd grows by the amount acknowledged,
      doubling roughly once per round-trip time.
    - Congestion avoidance (cwnd >= ssthresh): cwnd grows by
      ``acknowledged / cwnd`` per ACK — RFC 5681's ``SMSS*SMSS / cwnd`` in
      segment units — roughly one segment per round-trip time.
    - On loss: ``ssthresh = max(cwnd / 2, 2)`` and ``cwnd = 1``, returning to
      slow start.

    Tahoe reacts identically to both of its loss-detection mechanisms —
    fast retransmit (three duplicate ACKs) and retransmission timeout —
    because it has no fast recovery; that is Reno's addition. In this
    simulator, loss detection and retransmission timing belong to the
    engine, which signals every detected loss through ``on_packet_loss``,
    so the single response below covers both detection paths.

    Tahoe's window updates depend only on ACK and loss signals, never on
    elapsed time, so ``current_time`` is accepted (per the strategy
    interface) and ignored.
    """

    def __init__(self, *, initial_ssthresh_segments: float = 64.0) -> None:
        if initial_ssthresh_segments < 1:
            raise DomainError("initial_ssthresh_segments must be at least 1.")
        self._congestion_window_segments = 1.0
        self._ssthresh_segments = initial_ssthresh_segments

    @property
    def name(self) -> str:
        return "tahoe"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    @property
    def ssthresh_segments(self) -> float:
        """The current slow-start threshold, in segments."""
        return self._ssthresh_segments

    @property
    def phase(self) -> TahoePhase:
        """Which growth regime the next ACK will be handled under."""
        if self._congestion_window_segments < self._ssthresh_segments:
            return TahoePhase.SLOW_START
        return TahoePhase.CONGESTION_AVOIDANCE

    def on_ack(self, *, acknowledged_segments: float, current_time: float) -> None:
        if self.phase is TahoePhase.SLOW_START:
            self._congestion_window_segments += acknowledged_segments
        else:
            self._congestion_window_segments += (
                acknowledged_segments / self._congestion_window_segments
            )

    def on_packet_loss(self, *, current_time: float) -> None:
        self._ssthresh_segments = max(self._congestion_window_segments / 2, 2.0)
        self._congestion_window_segments = 1.0
