"""Tests for the SimulationResult entity."""

import pytest

from tcp_visualizer.domain import (
    DomainError,
    SimulationConfig,
    SimulationEvent,
    SimulationEventType,
    SimulationResult,
)


def test_result_holds_config_and_ordered_events(simulation_config: SimulationConfig) -> None:
    events = (
        SimulationEvent(timestamp=0.0, event_type=SimulationEventType.PACKET_SENT),
        SimulationEvent(timestamp=0.5, event_type=SimulationEventType.PACKET_ACKNOWLEDGED),
    )

    result = SimulationResult(config=simulation_config, events=events)

    assert result.config is simulation_config
    assert result.events == events


def test_result_rejects_out_of_order_events(simulation_config: SimulationConfig) -> None:
    events = (
        SimulationEvent(timestamp=1.0, event_type=SimulationEventType.PACKET_SENT),
        SimulationEvent(timestamp=0.5, event_type=SimulationEventType.PACKET_ACKNOWLEDGED),
    )

    with pytest.raises(DomainError):
        SimulationResult(config=simulation_config, events=events)
