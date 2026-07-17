"""A single timestamped occurrence within a computed simulation timeline."""

from dataclasses import dataclass
from enum import StrEnum

from tcp_visualizer.domain.errors import DomainError
from tcp_visualizer.domain.node import Node
from tcp_visualizer.domain.packet import Packet


class SimulationEventType(StrEnum):
    """The kind of occurrence a :class:`SimulationEvent` represents."""

    PACKET_SENT = "packet_sent"
    PACKET_ACKNOWLEDGED = "packet_acknowledged"
    PACKET_LOST = "packet_lost"
    CONGESTION_WINDOW_CHANGED = "congestion_window_changed"


@dataclass(frozen=True, slots=True)
class SimulationEvent:
    """One entry in the timeline the frontend replays.

    ``node`` and ``packet`` apply to packet-level events (sent/acknowledged/
    lost); ``congestion_window_segments`` applies to congestion-window-change
    events. Fields irrelevant to a given ``event_type`` are left as ``None``.
    """

    timestamp: float
    event_type: SimulationEventType
    node: Node | None = None
    packet: Packet | None = None
    congestion_window_segments: float | None = None

    def __post_init__(self) -> None:
        if self.timestamp < 0:
            raise DomainError("timestamp must not be negative.")
