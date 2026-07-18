"""Congestion signals: network observations delivered to algorithms.

Each signal is a first-class, immutable message describing something the
simulated network was observed to do. Signals carry *network observations
only* — never algorithm interpretations (see ADR 0002): "partial ACK" and
"recovery complete" are judgements a Reno-family algorithm makes relative
to its own state, so they are deliberately not part of this vocabulary.

Sequence positions use the same coordinate system as
``Packet.sequence_number``: 0-based byte offsets into the transferred
stream (see ADR 0003). New signal kinds are added as new dataclasses;
algorithms ignore signals they do not recognize, which is what keeps the
strategy interface closed against future extension (e.g. richer ACK
payloads for BBR).
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
        ack_sequence_number: The cumulative acknowledgment point — the byte
            offset of the next byte the receiver expects, i.e. everything
            before it has been delivered contiguously. Mirrors the TCP
            header's Acknowledgment Number.
    """

    acknowledged_segments: float
    current_time: float
    ack_sequence_number: int

    def __post_init__(self) -> None:
        if self.acknowledged_segments <= 0:
            raise DomainError("acknowledged_segments must be positive.")
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")
        if self.ack_sequence_number < 0:
            raise DomainError("ack_sequence_number must not be negative.")


@dataclass(frozen=True, slots=True)
class TripleDuplicateAck:
    """Loss inferred from three duplicate acknowledgements (fast retransmit).

    Attributes:
        current_time: Simulation time at which the loss was detected.
        highest_transmitted_sequence_number: The byte offset one past the
            highest byte transmitted so far (``snd.nxt``). Reno-family
            algorithms record this as RFC 6582's ``recover`` marker: an ACK
            at or beyond it covers everything outstanding at detection time.
    """

    current_time: float
    highest_transmitted_sequence_number: int

    def __post_init__(self) -> None:
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")
        if self.highest_transmitted_sequence_number < 0:
            raise DomainError("highest_transmitted_sequence_number must not be negative.")


@dataclass(frozen=True, slots=True)
class Timeout:
    """Loss inferred from a retransmission timer expiry.

    Attributes:
        current_time: Simulation time at which the loss was detected.
        highest_transmitted_sequence_number: The byte offset one past the
            highest byte transmitted so far (``snd.nxt``), as on
            :class:`TripleDuplicateAck`.
    """

    current_time: float
    highest_transmitted_sequence_number: int

    def __post_init__(self) -> None:
        if self.current_time < 0:
            raise DomainError("current_time must not be negative.")
        if self.highest_transmitted_sequence_number < 0:
            raise DomainError("highest_transmitted_sequence_number must not be negative.")


CongestionSignal: TypeAlias = AckReceived | TripleDuplicateAck | Timeout
