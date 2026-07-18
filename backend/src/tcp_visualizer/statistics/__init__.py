"""Statistics layer: derives performance metrics from simulation timelines.

Depends on the domain layer only. The simulation engine emits events;
this package turns those events into aggregate statistics after the run.
"""

from tcp_visualizer.statistics.collector import (
    CongestionWindowSample,
    SimulationStatistics,
    StatisticsCollector,
)

__all__ = [
    "CongestionWindowSample",
    "SimulationStatistics",
    "StatisticsCollector",
]
