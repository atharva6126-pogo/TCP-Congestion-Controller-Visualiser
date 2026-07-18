"""Congestion-control phases.

The enum lives in the domain because the strategy interface reports it;
this module re-exports it so algorithm code can keep importing it from
alongside the algorithms.
"""

from tcp_visualizer.domain.phase import CongestionPhase

__all__ = ["CongestionPhase"]
