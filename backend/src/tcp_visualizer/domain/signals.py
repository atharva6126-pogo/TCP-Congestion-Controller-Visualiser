"""Congestion signals: network observations delivered to algorithms.

Each signal is a first-class, immutable message describing something the
simulated network was observed to do. Signals carry *network observations
only* — never algorithm interpretations (see ADR 0002): "partial ACK" and
"recovery complete" are judgements a Reno-family algorithm makes relative
to its own state, so they are deliberately not part of this vocabulary.

New signal kinds are added as new dataclasses; algorithms ignore signals
they do not recognize, which is what keeps the strategy interface closed
against future extension (e.g. richer ACK payloads for BBR).
"""

from dataclasses import dataclass
from typing import TypeAlias

from tcp_visualizer.domain.errors import DomainError


@dataclass(frozen=True, slots=True)
class AckReceived:
    """New data was acknowledged by the receiver.

    Attributes:
        acknowledged_segments: Newly acknowledged data, in units of maximum
            segment size.
        current_time: Simulation time at which the acknowledgement arrived.
    """

    acknowledged_segments: float
    current_time: float

    def __post_init__(self) -> None:
        if self.acknowledged_segments <= 0:
            raise DomainError("acknowledged_segments must be positive.")
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")


@dataclass(frozen=True, slots=True)
class TripleDuplicateAck:
    """Loss inferred from three duplicate acknowledgements (fast retransmit)."""

    current_time: float

    def __post_init__(self) -> None:
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")


@dataclass(frozen=True, slots=True)
class Timeout:
    """Loss inferred from a retransmission timer expiry."""

    current_time: float

    def __post_init__(self) -> None:
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")


CongestionSignal: TypeAlias = AckReceived | TripleDuplicateAck | Timeout
