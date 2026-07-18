"""Tests for the engine's loss-signal classification rule.

A loss detected with at least three other packets in flight is reported
as TripleDuplicateAck (those packets generate the duplicate ACKs fast
retransmit needs); otherwise as Timeout. FixedWindowAlgorithm pins the
window so the number of in-flight packets is controlled by the test.
"""

from tcp_visualizer.domain import (
    AckReceived,
    SimulationEventType,
    Timeout,
    TripleDuplicateAck,
)
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig
from ..support import FixedWindowAlgorithm


def test_single_packet_window_losses_are_always_timeouts(make_config: MakeConfig) -> None:
    config = make_config(
        seed=5,
        total_bytes_to_transfer=10_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.5,
        algorithm=FixedWindowAlgorithm(window_segments=1.0),
    )

    result = run_simulation(config)

    loss_events = [e for e in result.events if e.event_type is SimulationEventType.PACKET_LOST]
    assert len(loss_events) > 0
    assert all(isinstance(e.signal, Timeout) for e in loss_events)


def test_small_window_losses_are_always_timeouts(make_config: MakeConfig) -> None:
    """With a 3-segment window at most 2 other packets are in flight."""
    config = make_config(
        seed=5,
        total_bytes_to_transfer=20_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.5,
        algorithm=FixedWindowAlgorithm(window_segments=3.0),
    )

    result = run_simulation(config)

    loss_events = [e for e in result.events if e.event_type is SimulationEventType.PACKET_LOST]
    assert len(loss_events) > 0
    assert all(isinstance(e.signal, Timeout) for e in loss_events)


def test_large_window_losses_are_classified_as_duplicate_ack_losses(
    make_config: MakeConfig,
) -> None:
    config = make_config(
        seed=3,
        total_bytes_to_transfer=30_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.3,
        algorithm=FixedWindowAlgorithm(window_segments=10.0),
    )

    result = run_simulation(config)

    loss_events = [e for e in result.events if e.event_type is SimulationEventType.PACKET_LOST]
    assert len(loss_events) > 0
    assert any(isinstance(e.signal, TripleDuplicateAck) for e in loss_events)
    assert all(isinstance(e.signal, TripleDuplicateAck | Timeout) for e in loss_events)


def test_every_acknowledgement_event_records_its_ack_signal(make_config: MakeConfig) -> None:
    config = make_config(
        total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000, loss_probability=0.0
    )

    result = run_simulation(config)

    ack_events = [
        e for e in result.events if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED
    ]
    assert len(ack_events) == 5
    for event in ack_events:
        assert isinstance(event.signal, AckReceived)
        assert event.signal.acknowledged_segments == 1.0
        assert event.signal.current_time == event.timestamp
