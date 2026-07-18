"""Test doubles shared across the backend test suite."""

from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    CongestionSignal,
    Timeout,
    TripleDuplicateAck,
)


class StubCongestionControlAlgorithm(CongestionControlAlgorithm):
    """Minimal concrete implementation used only to exercise the interface.

    Not a real TCP algorithm: it grows linearly by whatever is acknowledged
    and resets to 1 segment on any loss signal, purely so tests can
    construct a valid ``CongestionControlAlgorithm`` without depending on a
    real algorithm implementation (Tahoe, Reno, ...).
    """

    def __init__(self) -> None:
        self._congestion_window_segments = 1.0

    @property
    def name(self) -> str:
        return "stub"

    @property
    def congestion_window_segments(self) -> float:
        return self._congestion_window_segments

    def on_signal(self, signal: CongestionSignal) -> None:
        match signal:
            case AckReceived(acknowledged_segments=acknowledged):
                self._congestion_window_segments += acknowledged
            case TripleDuplicateAck() | Timeout():
                self._congestion_window_segments = 1.0
            case _:
                pass


class FixedWindowAlgorithm(CongestionControlAlgorithm):
    """Keeps a constant congestion window and ignores every signal.

    Lets engine tests pin the number of packets in flight, which is what
    the engine's loss-signal classification rule depends on.
    """

    def __init__(self, *, window_segments: float) -> None:
        self._window_segments = window_segments

    @property
    def name(self) -> str:
        return "fixed"

    @property
    def congestion_window_segments(self) -> float:
        return self._window_segments

    def on_signal(self, signal: CongestionSignal) -> None:
        pass
