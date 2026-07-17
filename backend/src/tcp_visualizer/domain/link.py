"""The simulated network link connecting a sender and a receiver."""

from dataclasses import dataclass

from tcp_visualizer.domain.errors import DomainError


@dataclass(frozen=True, slots=True)
class Link:
    """Physical characteristics of the simulated network path.

    Attributes:
        bandwidth_bytes_per_second: Maximum sustained transfer rate of the link.
        latency_ms: One-way propagation delay.
        loss_probability: Probability, in [0, 1], that any given packet is dropped.
    """

    bandwidth_bytes_per_second: float
    latency_ms: float
    loss_probability: float

    def __post_init__(self) -> None:
        if self.bandwidth_bytes_per_second <= 0:
            raise DomainError("bandwidth_bytes_per_second must be positive.")
        if self.latency_ms < 0:
            raise DomainError("latency_ms must not be negative.")
        if not 0.0 <= self.loss_probability <= 1.0:
            raise DomainError("loss_probability must be between 0 and 1.")
