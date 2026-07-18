"""Strategy interface for TCP congestion control algorithms."""

from abc import ABC, abstractmethod

from tcp_visualizer.domain.signals import CongestionSignal


class CongestionControlAlgorithm(ABC):
    """A pluggable congestion control strategy (Tahoe, Reno, Cubic, ...).

    Implementations own their internal congestion window state and update
    it in response to :class:`~tcp_visualizer.domain.signals.CongestionSignal`
    messages delivered by the simulation engine — acknowledgements
    (``AckReceived``) and loss observations (``TripleDuplicateAck``,
    ``Timeout``). Signals carry network observations only; how to interpret
    and respond to them is entirely the algorithm's concern.

    Implementations should ignore signal kinds they do not recognize
    (a wildcard ``case _: pass`` arm), so new signals can be introduced for
    future algorithms without touching existing ones. Signal timestamps let
    time-based algorithms (e.g. Cubic) share this contract with round- and
    ACK-based ones (Reno, Tahoe).
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """A short, human-readable identifier for this algorithm."""

    @property
    @abstractmethod
    def congestion_window_segments(self) -> float:
        """The current congestion window, in units of maximum segment size."""

    @abstractmethod
    def on_signal(self, signal: CongestionSignal) -> None:
        """Update state in response to an observed network signal."""
