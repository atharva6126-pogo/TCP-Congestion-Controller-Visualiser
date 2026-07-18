"""Congestion-control phases shared by the Reno-family algorithms."""

from enum import StrEnum


class CongestionPhase(StrEnum):
    """The growth regime a window-based algorithm is currently operating in."""

    SLOW_START = "slow_start"
    CONGESTION_AVOIDANCE = "congestion_avoidance"
