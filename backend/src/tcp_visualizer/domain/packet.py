"""A single TCP packet exchanged during a simulation."""

from dataclasses import dataclass

from tcp_visualizer.domain.errors import DomainError


@dataclass(frozen=True, slots=True)
class Packet:
    """An individual segment sent from sender to receiver.

    Attributes:
        sequence_number: Position of this packet's first byte in the stream.
        size_bytes: Size of the packet payload, in bytes.
    """

    sequence_number: int
    size_bytes: int

    def __post_init__(self) -> None:
        if self.sequence_number < 0:
            raise DomainError("sequence_number must not be negative.")
        if self.size_bytes <= 0:
            raise DomainError("size_bytes must be positive.")
