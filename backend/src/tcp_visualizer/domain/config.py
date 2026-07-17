"""Complete input configuration for a single simulation run."""

from dataclasses import dataclass

from tcp_visualizer.domain.congestion_control import CongestionControlAlgorithm
from tcp_visualizer.domain.errors import DomainError
from tcp_visualizer.domain.link import Link
from tcp_visualizer.domain.node import Node, NodeRole


@dataclass(frozen=True, slots=True)
class SimulationConfig:
    """Everything needed to deterministically reproduce one simulation run.

    ``seed`` is required (no default) so that every simulation is
    reproducible: the same config always produces the same
    :class:`~tcp_visualizer.domain.result.SimulationResult`.
    """

    seed: int
    sender: Node
    receiver: Node
    link: Link
    algorithm: CongestionControlAlgorithm
    total_bytes_to_transfer: int
    maximum_segment_size_bytes: int

    def __post_init__(self) -> None:
        if self.sender.role is not NodeRole.SENDER:
            raise DomainError("sender must have the SENDER role.")
        if self.receiver.role is not NodeRole.RECEIVER:
            raise DomainError("receiver must have the RECEIVER role.")
        if self.sender.name == self.receiver.name:
            raise DomainError("sender and receiver must be distinct nodes.")
        if self.total_bytes_to_transfer <= 0:
            raise DomainError("total_bytes_to_transfer must be positive.")
        if self.maximum_segment_size_bytes <= 0:
            raise DomainError("maximum_segment_size_bytes must be positive.")
