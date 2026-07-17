"""Network endpoints participating in a simulated TCP connection."""

from dataclasses import dataclass
from enum import StrEnum

from tcp_visualizer.domain.errors import DomainError


class NodeRole(StrEnum):
    """The role a node plays in a simulated connection."""

    SENDER = "sender"
    RECEIVER = "receiver"


@dataclass(frozen=True, slots=True)
class Node:
    """A named endpoint (sender or receiver) in the simulated network."""

    name: str
    role: NodeRole

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise DomainError("Node name must not be empty.")
