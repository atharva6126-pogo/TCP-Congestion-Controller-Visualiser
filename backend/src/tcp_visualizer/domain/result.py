"""The complete, computed output of one simulation run."""

from dataclasses import dataclass

from tcp_visualizer.domain.config import SimulationConfig
from tcp_visualizer.domain.errors import DomainError
from tcp_visualizer.domain.events import SimulationEvent


@dataclass(frozen=True, slots=True)
class SimulationResult:
    """The full event timeline produced by running a :class:`SimulationConfig`.

    The backend computes this in its entirety before returning it; the
    frontend replays ``events`` rather than receiving a live stream.
    """

    config: SimulationConfig
    events: tuple[SimulationEvent, ...]

    def __post_init__(self) -> None:
        timestamps = [event.timestamp for event in self.events]
        if timestamps != sorted(timestamps):
            raise DomainError("events must be ordered by non-decreasing timestamp.")
