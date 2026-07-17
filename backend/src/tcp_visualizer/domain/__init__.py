"""Domain layer: framework-independent core of the TCP visualizer.

Pure data model and strategy contracts for simulating TCP congestion
control. Nothing in this package depends on FastAPI, SimPy, or any other
framework.
"""

from tcp_visualizer.domain.config import SimulationConfig
from tcp_visualizer.domain.congestion_control import CongestionControlAlgorithm
from tcp_visualizer.domain.errors import DomainError
from tcp_visualizer.domain.events import SimulationEvent, SimulationEventType
from tcp_visualizer.domain.link import Link
from tcp_visualizer.domain.node import Node, NodeRole
from tcp_visualizer.domain.packet import Packet
from tcp_visualizer.domain.result import SimulationResult

__all__ = [
    "CongestionControlAlgorithm",
    "DomainError",
    "Link",
    "Node",
    "NodeRole",
    "Packet",
    "SimulationConfig",
    "SimulationEvent",
    "SimulationEventType",
    "SimulationResult",
]
