"""Tests for the SimPy-based simulation engine."""

from tcp_visualizer.domain import SimulationEventType
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig


def test_zero_loss_delivers_every_segment_exactly_once(make_config: MakeConfig) -> None:
    config = make_config(
        total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000, loss_probability=0.0
    )

    result = run_simulation(config)

    sent = [e for e in result.events if e.event_type is SimulationEventType.PACKET_SENT]
    acked = [e for e in result.events if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED]
    lost = [e for e in result.events if e.event_type is SimulationEventType.PACKET_LOST]
    cwnd_changes = [
        e for e in result.events if e.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
    ]

    assert len(sent) == 5
    assert len(acked) == 5
    assert len(lost) == 0
    assert len(cwnd_changes) == 5
    assert {e.packet.sequence_number for e in acked if e.packet is not None} == {
        0,
        1000,
        2000,
        3000,
        4000,
    }


def test_last_segment_carries_the_remaining_bytes(make_config: MakeConfig) -> None:
    config = make_config(
        total_bytes_to_transfer=3000, maximum_segment_size_bytes=1460, loss_probability=0.0
    )

    result = run_simulation(config)

    sent = [e for e in result.events if e.event_type is SimulationEventType.PACKET_SENT]
    packets = {e.packet.sequence_number: e.packet.size_bytes for e in sent if e.packet is not None}

    assert packets == {0: 1460, 1460: 1460, 2920: 80}


def test_congestion_window_grows_monotonically_without_loss(make_config: MakeConfig) -> None:
    config = make_config(
        total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000, loss_probability=0.0
    )

    result = run_simulation(config)

    cwnd_values = [
        e.congestion_window_segments
        for e in result.events
        if e.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
        and e.congestion_window_segments is not None
    ]

    assert cwnd_values == sorted(cwnd_values)
    assert cwnd_values[-1] > cwnd_values[0]


def test_result_references_the_input_config(make_config: MakeConfig) -> None:
    config = make_config()

    result = run_simulation(config)

    assert result.config is config


def test_simulation_is_deterministic_given_the_same_seed(make_config: MakeConfig) -> None:
    result_a = run_simulation(
        make_config(
            seed=7,
            total_bytes_to_transfer=8000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.4,
        )
    )
    result_b = run_simulation(
        make_config(
            seed=7,
            total_bytes_to_transfer=8000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.4,
        )
    )

    assert result_a.events == result_b.events


def test_different_seeds_can_produce_different_timelines(make_config: MakeConfig) -> None:
    result_a = run_simulation(
        make_config(
            seed=1,
            total_bytes_to_transfer=40_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.4,
        )
    )
    result_b = run_simulation(
        make_config(
            seed=2,
            total_bytes_to_transfer=40_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.4,
        )
    )

    assert result_a.events != result_b.events


def test_lossy_link_eventually_delivers_all_data_and_resets_cwnd_on_loss(
    make_config: MakeConfig,
) -> None:
    config = make_config(
        seed=123,
        total_bytes_to_transfer=40_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.5,
    )

    result = run_simulation(config)

    acked = [e for e in result.events if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED]
    lost = [e for e in result.events if e.event_type is SimulationEventType.PACKET_LOST]

    assert {e.packet.sequence_number for e in acked if e.packet is not None} == set(
        range(0, 40_000, 1000)
    )
    assert len(lost) > 0

    events = result.events
    for index, event in enumerate(events):
        if event.event_type is SimulationEventType.PACKET_LOST:
            following = events[index + 1]
            assert following.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
            assert following.congestion_window_segments == 1.0
