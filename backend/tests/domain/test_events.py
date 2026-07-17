"""Tests for the SimulationEvent entity."""

import pytest

from tcp_visualizer.domain import DomainError, Node, Packet, SimulationEvent, SimulationEventType


def test_packet_sent_event_carries_packet_and_node(sender: Node) -> None:
    packet = Packet(sequence_number=0, size_bytes=1460)

    event = SimulationEvent(
        timestamp=0.0,
        event_type=SimulationEventType.PACKET_SENT,
        node=sender,
        packet=packet,
    )

    assert event.timestamp == 0.0
    assert event.event_type is SimulationEventType.PACKET_SENT
    assert event.node is sender
    assert event.packet is packet


def test_congestion_window_changed_event_carries_cwnd() -> None:
    event = SimulationEvent(
        timestamp=1.5,
        event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
        congestion_window_segments=2.0,
    )

    assert event.congestion_window_segments == 2.0


def test_event_rejects_negative_timestamp() -> None:
    with pytest.raises(DomainError):
        SimulationEvent(timestamp=-0.1, event_type=SimulationEventType.PACKET_SENT)
