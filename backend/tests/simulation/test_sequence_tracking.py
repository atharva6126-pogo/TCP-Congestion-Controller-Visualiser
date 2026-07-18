"""Tests for the engine's sequence bookkeeping reported on signals.

AckReceived carries the cumulative acknowledgment point (contiguous
prefix delivered); loss signals carry the highest sequence transmitted.
Both use byte offsets consistent with Packet.sequence_number.
"""

from tcp_visualizer.domain import AckReceived, SimulationEventType, TripleDuplicateAck, Timeout
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig
from ..support import FixedWindowAlgorithm


def test_zero_loss_ack_point_advances_in_order_to_the_transfer_total(
    make_config: MakeConfig,
) -> None:
    config = make_config(
        total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000, loss_probability=0.0
    )

    result = run_simulation(config)

    ack_points = [
        e.signal.ack_sequence_number
        for e in result.events
        if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED
        and isinstance(e.signal, AckReceived)
    ]
    assert ack_points == [1000, 2000, 3000, 4000, 5000]


def test_partial_final_segment_is_reflected_in_the_final_ack_point(
    make_config: MakeConfig,
) -> None:
    config = make_config(
        total_bytes_to_transfer=3000, maximum_segment_size_bytes=1460, loss_probability=0.0
    )

    result = run_simulation(config)

    ack_points = [
        e.signal.ack_sequence_number
        for e in result.events
        if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED
        and isinstance(e.signal, AckReceived)
    ]
    assert ack_points[-1] == 3000


def test_lossy_run_ack_point_is_monotone_stalls_at_holes_and_completes(
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

    ack_events = [
        e
        for e in result.events
        if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED
        and isinstance(e.signal, AckReceived)
    ]
    ack_points = [
        e.signal.ack_sequence_number for e in ack_events if isinstance(e.signal, AckReceived)
    ]

    assert ack_points == sorted(ack_points)
    assert ack_points[-1] == 30_000
    # At least one delivery lands beyond a hole: its ACK cannot advance the
    # cumulative point past the missing segment.
    assert any(
        isinstance(e.signal, AckReceived)
        and e.packet is not None
        and e.signal.ack_sequence_number <= e.packet.sequence_number
        for e in ack_events
    )


def test_loss_signals_report_the_highest_transmitted_sequence(make_config: MakeConfig) -> None:
    config = make_config(
        seed=3,
        total_bytes_to_transfer=30_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.3,
        algorithm=FixedWindowAlgorithm(window_segments=10.0),
    )

    result = run_simulation(config)

    highest_seen = 0
    for event in result.events:
        if event.event_type is SimulationEventType.PACKET_SENT and event.packet is not None:
            end = event.packet.sequence_number + event.packet.size_bytes
            highest_seen = max(highest_seen, end)
        if event.event_type is SimulationEventType.PACKET_LOST:
            assert isinstance(event.signal, TripleDuplicateAck | Timeout)
            assert event.signal.highest_transmitted_sequence_number == highest_seen
            assert event.packet is not None
            assert (
                event.signal.highest_transmitted_sequence_number
                >= event.packet.sequence_number + event.packet.size_bytes
            )
    assert highest_seen == 30_000
