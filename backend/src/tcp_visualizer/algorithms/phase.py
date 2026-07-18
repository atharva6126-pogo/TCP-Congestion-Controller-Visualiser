"""Congestion-control phases shared by the Reno-family algorithms."""

from enum import StrEnum


class CongestionPhase(StrEnum):
    """The growth regime a window-based algorithm is currently operating in.

    ``FAST_RECOVERY`` is only reported by algorithms whose recovery spans
    time (New Reno); Reno's recovery is instantaneous in this model and is
    never observable as a phase.
    """

    SLOW_START = "slow_start"
    CONGESTION_AVOIDANCE = "congestion_avoidance"
    FAST_RECOVERY = "fast_recovery"
