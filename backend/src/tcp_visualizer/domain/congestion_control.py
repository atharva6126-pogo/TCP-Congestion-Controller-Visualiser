"""Strategy interface for TCP congestion control algorithms."""

from abc import ABC, abstractmethod


class CongestionControlAlgorithm(ABC):
    """A pluggable congestion control strategy (Tahoe, Reno, Cubic, ...).

    Implementations own their internal congestion window state and update it
    in response to acknowledgements and detected packet loss. ``current_time``
    is passed to both hooks so that time-based algorithms (e.g. Cubic, whose
    growth depends on elapsed time since the last congestion event rather than
    on ACK count) can be implemented against this same contract as round- or
    ACK-based algorithms like Reno and Tahoe.
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
    def on_ack(self, *, acknowledged_segments: float, current_time: float) -> None:
        """Update state in response to newly acknowledged data."""

    @abstractmethod
    def on_packet_loss(self, *, current_time: float) -> None:
        """Update state in response to detected packet loss."""
