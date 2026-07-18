"""Tests for the StatisticsCollector."""

import pytest

from tcp_visualizer.domain import (
    Node,
    NodeRole,
    Packet,
    SimulationEvent,
    SimulationEventType,
    SimulationResult,
)
from tcp_visualizer.simulation import run_simulation
from tcp_visualizer.statistics import CongestionWindowSample, StatisticsCollector

from ..conftest import MakeConfig


def test_collector_derives_exact_metrics_from_a_handcrafted_timeline(
    make_config: MakeConfig,
) -> None:
    sender = Node(name="client", role=NodeRole.SENDER)
    receiver = Node(name="server", role=NodeRole.RECEIVER)
    first = Packet(sequence_number=0, size_bytes=1000)
    second = Packet(sequence_number=1000, size_bytes=1000)
    events = (
        SimulationEvent(
            timestamp=0.0, event_type=SimulationEventType.PACKET_SENT, node=sender, packet=first
        ),
        SimulationEvent(
            timestamp=0.0, event_type=SimulationEventType.PACKET_SENT, node=sender, packet=second
        ),
        SimulationEvent(
            timestamp=1.0, event_type=SimulationEventType.PACKET_LOST, node=receiver, packet=first
        ),
        SimulationEvent(
            timestamp=1.0,
            event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
            node=sender,
            congestion_window_segments=1.0,
        ),
        SimulationEvent(
            timestamp=1.0,
            event_type=SimulationEventType.PACKET_ACKNOWLEDGED,
            node=receiver,
            packet=second,
        ),
        SimulationEvent(
            timestamp=2.0, event_type=SimulationEventType.PACKET_SENT, node=sender, packet=first
        ),
        SimulationEvent(
            timestamp=4.0,
            event_type=SimulationEventType.PACKET_ACKNOWLEDGED,
            node=receiver,
            packet=first,
        ),
        SimulationEvent(
            timestamp=4.0,
            event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
            node=sender,
            congestion_window_segments=2.0,
        ),
    )
    result = SimulationResult(config=make_config(), events=events)

    statistics = StatisticsCollector().collect(result)

    assert statistics.throughput_bytes_per_second == pytest.approx(2000 / 4.0)
    assert statistics.packet_delivery_ratio == pytest.approx(2 / 3)
    assert statistics.retransmission_count == 1
    assert statistics.average_rtt_seconds == pytest.approx((1.0 + 2.0) / 2)
    assert statistics.congestion_window_history == (
        CongestionWindowSample(timestamp=1.0, congestion_window_segments=1.0),
        CongestionWindowSample(timestamp=4.0, congestion_window_segments=2.0),
    )
    assert statistics.packet_loss_count == 1


def test_collector_returns_zeros_for_an_empty_timeline(make_config: MakeConfig) -> None:
    result = SimulationResult(config=make_config(), events=())

    statistics = StatisticsCollector().collect(result)

    assert statistics.throughput_bytes_per_second == 0.0
    assert statistics.packet_delivery_ratio == 0.0
    assert statistics.retransmission_count == 0
    assert statistics.average_rtt_seconds == 0.0
    assert statistics.congestion_window_history == ()
    assert statistics.packet_loss_count == 0


def test_zero_loss_engine_run_yields_perfect_delivery(make_config: MakeConfig) -> None:
    config = make_config(
        total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000, loss_probability=0.0
    )

    result = run_simulation(config)
    statistics = StatisticsCollector().collect(result)

    assert statistics.packet_delivery_ratio == 1.0
    assert statistics.retransmission_count == 0
    assert statistics.packet_loss_count == 0
    # Every segment is 1000 B on a 1 MB/s link with 10 ms one-way latency:
    # 0.001 s transmission + 0.020 s propagation round trip.
    assert statistics.average_rtt_seconds == pytest.approx(0.021)
    assert statistics.throughput_bytes_per_second == pytest.approx(
        5000 / result.events[-1].timestamp
    )


def test_lossy_engine_run_accounts_for_every_transmission(make_config: MakeConfig) -> None:
    config = make_config(
        seed=123,
        total_bytes_to_transfer=40_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.5,
    )

    result = run_simulation(config)
    statistics = StatisticsCollector().collect(result)

    # The engine retransmits every lost segment until delivered, so each
    # loss corresponds to exactly one extra transmission.
    assert statistics.retransmission_count == statistics.packet_loss_count
    assert statistics.packet_loss_count > 0
    assert 0.0 < statistics.packet_delivery_ratio < 1.0
    assert statistics.throughput_bytes_per_second == pytest.approx(
        40_000 / result.events[-1].timestamp
    )
    assert len(statistics.congestion_window_history) > 0


def test_statistics_are_deterministic_given_the_same_seed(make_config: MakeConfig) -> None:
    def run() -> object:
        config = make_config(
            seed=7,
            total_bytes_to_transfer=8000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.4,
        )
        return StatisticsCollector().collect(run_simulation(config))

    assert run() == run()
