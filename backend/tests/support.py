"""Test doubles shared across the backend test suite."""

from tcp_visualizer.domain import CongestionControlAlgorithm


class StubCongestionControlAlgorithm(CongestionControlAlgorithm):
    """Minimal concrete implementation used only to exercise the interface.

    Not a real TCP algorithm: it grows linearly by whatever is acknowledged
    and resets to 1 segment on loss, purely so tests can construct a valid
    ``CongestionControlAlgorithm`` without depending on a real algorithm
    implementation (Tahoe, Reno, ...).
    """

    def __init__(self) -> None:
        self._congestion_window_segments = 1.0

    @property
    def name(self) -> str:
        return "stub"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    def on_ack(self, *, acknowledged_segments: float, current_time: float) -> None:
        self._congestion_window_segments += acknowledged_segments

    def on_packet_loss(self, *, current_time: float) -> None:
        self._congestion_window_segments = 1.0
