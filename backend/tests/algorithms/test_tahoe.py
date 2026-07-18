"""Tests for TCP Tahoe congestion control."""

import math

import pytest

from tcp_visualizer.algorithms import TahoePhase, TcpTahoe
from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    DomainError,
    SimulationEventType,
    Timeout,
    TripleDuplicateAck,
)
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig


def ack_full_window(tahoe: TcpTahoe) -> None:
    """Acknowledge one full window of single segments, as one RTT round would."""
    for _ in range(math.floor(tahoe.congestion_window_segments)):
        tahoe.on_signal(AckReceived(acknowledged_segments=1.0, current_time=0.0))


class TestInitialState:
    def test_starts_in_slow_start_with_one_segment_window(self) -> None:
        tahoe = TcpTahoe()

        assert tahoe.congestion_window_segments == 1.0
        assert tahoe.phase is TahoePhase.SLOW_START
        assert tahoe.name == "tahoe"

    def test_implements_the_strategy_interface(self) -> None:
        assert isinstance(TcpTahoe(), CongestionControlAlgorithm)

    def test_rejects_ssthresh_below_one_segment(self) -> None:
        with pytest.raises(DomainError):
            TcpTahoe(initial_ssthresh_segments=0.5)


class TestSlowStart:
    def test_each_ack_grows_the_window_by_the_amount_acknowledged(self) -> None:
        tahoe = TcpTahoe()

        tahoe.on_signal(AckReceived(acknowledged_segments=1.0, current_time=0.0))

        assert tahoe.congestion_window_segments == 2.0

    def test_window_doubles_every_round_trip(self) -> None:
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        observed = [tahoe.congestion_window_segments]

        for _ in range(5):
            ack_full_window(tahoe)
            observed.append(tahoe.congestion_window_segments)

        assert observed == [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]


class TestTransitionToCongestionAvoidance:
    def test_phase_switches_once_the_window_reaches_ssthresh(self) -> None:
        tahoe = TcpTahoe(initial_ssthresh_segments=4.0)

        for _ in range(3):
            tahoe.on_signal(AckReceived(acknowledged_segments=1.0, current_time=0.0))

        assert tahoe.congestion_window_segments == 4.0
        assert tahoe.phase is TahoePhase.CONGESTION_AVOIDANCE

    def test_growth_is_approximately_linear_after_the_transition(self) -> None:
        tahoe = TcpTahoe(initial_ssthresh_segments=8.0)
        while tahoe.phase is TahoePhase.SLOW_START:
            tahoe.on_signal(AckReceived(acknowledged_segments=1.0, current_time=0.0))
        assert tahoe.congestion_window_segments == 8.0

        ack_full_window(tahoe)

        # One congestion-avoidance round adds slightly less than one full
        # segment (each ACK adds 1/cwnd while cwnd is already growing).
        assert 8.5 < tahoe.congestion_window_segments <= 9.0


class TestLossResponse:
    def test_loss_halves_ssthresh_and_collapses_the_window(self) -> None:
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(tahoe)
        assert tahoe.congestion_window_segments == 16.0

        tahoe.on_signal(Timeout(current_time=1.0))

        assert tahoe.ssthresh_segments == 8.0
        assert tahoe.congestion_window_segments == 1.0
        assert tahoe.phase is TahoePhase.SLOW_START

    def test_ssthresh_never_drops_below_two_segments(self) -> None:
        tahoe = TcpTahoe()

        tahoe.on_signal(Timeout(current_time=0.0))

        assert tahoe.ssthresh_segments == 2.0

    def test_responds_identically_to_both_loss_signals(self) -> None:
        """Tahoe has no fast recovery: dup-ACK and timeout losses are the same."""
        on_timeout = TcpTahoe(initial_ssthresh_segments=1000.0)
        on_duplicate = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(on_timeout)
            ack_full_window(on_duplicate)

        on_timeout.on_signal(Timeout(current_time=1.0))
        on_duplicate.on_signal(TripleDuplicateAck(current_time=1.0))

        assert on_timeout.congestion_window_segments == on_duplicate.congestion_window_segments
        assert on_timeout.ssthresh_segments == on_duplicate.ssthresh_segments

    def test_recovery_slow_starts_up_to_the_new_ssthresh_then_goes_linear(self) -> None:
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(tahoe)
        tahoe.on_signal(Timeout(current_time=1.0))
        assert tahoe.ssthresh_segments == 8.0

        observed = [tahoe.congestion_window_segments]
        for _ in range(4):
            ack_full_window(tahoe)
            observed.append(tahoe.congestion_window_segments)

        assert observed[:4] == [1.0, 2.0, 4.0, 8.0]
        assert tahoe.phase is TahoePhase.CONGESTION_AVOIDANCE
        assert 8.5 < observed[4] <= 9.0


class TestKnownWindowEvolution:
    def test_matches_the_textbook_tahoe_sawtooth(self) -> None:
        """Classic Tahoe trace: exponential to ssthresh, linear, collapse, repeat."""
        tahoe = TcpTahoe(initial_ssthresh_segments=8.0)
        per_round = [tahoe.congestion_window_segments]

        for _ in range(6):
            ack_full_window(tahoe)
            per_round.append(tahoe.congestion_window_segments)

        # Slow start: 1 -> 2 -> 4 -> 8, then congestion avoidance adds
        # roughly one segment per round.
        assert per_round[:4] == [1.0, 2.0, 4.0, 8.0]
        for previous, current in zip(per_round[3:], per_round[4:]):
            assert 0.5 < current - previous <= 1.0

        tahoe.on_signal(Timeout(current_time=1.0))
        assert tahoe.congestion_window_segments == 1.0
        assert tahoe.ssthresh_segments == pytest.approx(per_round[-1] / 2)


class TestEngineIntegration:
    def test_zero_loss_run_grows_the_window_monotonically(self, make_config: MakeConfig) -> None:
        config = make_config(
            total_bytes_to_transfer=50_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.0,
            algorithm=TcpTahoe(),
        )

        result = run_simulation(config)

        cwnd_values = [
            e.congestion_window_segments
            for e in result.events
            if e.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
            and e.congestion_window_segments is not None
        ]
        assert cwnd_values == sorted(cwnd_values)
        assert cwnd_values[0] == 2.0
        assert cwnd_values[-1] > cwnd_values[0]

    def test_lossy_run_collapses_the_window_after_every_loss(self, make_config: MakeConfig) -> None:
        config = make_config(
            seed=123,
            total_bytes_to_transfer=40_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.3,
            algorithm=TcpTahoe(),
        )

        result = run_simulation(config)

        events = result.events
        losses = 0
        for index, event in enumerate(events):
            if event.event_type is SimulationEventType.PACKET_LOST:
                losses += 1
                following = events[index + 1]
                assert following.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
                assert following.congestion_window_segments == 1.0
        assert losses > 0

    def test_engine_runs_are_deterministic_with_tahoe(self, make_config: MakeConfig) -> None:
        def run() -> object:
            return run_simulation(
                make_config(
                    seed=9,
                    total_bytes_to_transfer=20_000,
                    maximum_segment_size_bytes=1000,
                    loss_probability=0.2,
                    algorithm=TcpTahoe(),
                )
            ).events

        assert run() == run()
