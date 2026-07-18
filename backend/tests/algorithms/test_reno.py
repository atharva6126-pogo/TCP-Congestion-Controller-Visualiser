"""Tests for TCP Reno congestion control."""

import math

import pytest

from tcp_visualizer.algorithms import CongestionPhase, TcpReno, TcpTahoe
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


def ack_full_window(reno: TcpReno) -> None:
    """Acknowledge one full window of single segments, as one RTT round would."""
    for _ in range(math.floor(reno.congestion_window_segments)):
        reno.on_signal(
            AckReceived(acknowledged_segments=1.0, current_time=0.0, ack_sequence_number=0)
        )


def grown_reno(rounds: int = 4) -> TcpReno:
    """A Reno instance grown through ``rounds`` loss-free slow-start rounds."""
    reno = TcpReno(initial_ssthresh_segments=1000.0)
    for _ in range(rounds):
        ack_full_window(reno)
    return reno


class TestInitialState:
    def test_starts_in_slow_start_with_one_segment_window(self) -> None:
        reno = TcpReno()

        assert reno.congestion_window_segments == 1.0
        assert reno.phase is CongestionPhase.SLOW_START
        assert reno.name == "reno"

    def test_implements_the_strategy_interface(self) -> None:
        assert isinstance(TcpReno(), CongestionControlAlgorithm)

    def test_rejects_ssthresh_below_one_segment(self) -> None:
        with pytest.raises(DomainError):
            TcpReno(initial_ssthresh_segments=0.5)


class TestGrowth:
    def test_slow_start_doubles_every_round_trip(self) -> None:
        reno = TcpReno(initial_ssthresh_segments=1000.0)
        observed = [reno.congestion_window_segments]

        for _ in range(5):
            ack_full_window(reno)
            observed.append(reno.congestion_window_segments)

        assert observed == [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]

    def test_congestion_avoidance_grows_approximately_linearly(self) -> None:
        reno = TcpReno(initial_ssthresh_segments=8.0)
        while reno.phase is CongestionPhase.SLOW_START:
            reno.on_signal(
                AckReceived(acknowledged_segments=1.0, current_time=0.0, ack_sequence_number=0)
            )
        assert reno.congestion_window_segments == 8.0

        ack_full_window(reno)

        assert 8.5 < reno.congestion_window_segments <= 9.0


class TestFastRecovery:
    def test_duplicate_ack_loss_halves_the_window_without_collapse(self) -> None:
        reno = grown_reno(rounds=4)
        assert reno.congestion_window_segments == 16.0

        reno.on_signal(TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=0))

        assert reno.ssthresh_segments == 8.0
        assert reno.congestion_window_segments == 8.0
        assert reno.phase is CongestionPhase.CONGESTION_AVOIDANCE

    def test_window_and_ssthresh_never_drop_below_two_on_duplicate_ack_loss(self) -> None:
        reno = TcpReno()
        assert reno.congestion_window_segments == 1.0

        reno.on_signal(TripleDuplicateAck(current_time=0.0, highest_transmitted_sequence_number=0))

        assert reno.ssthresh_segments == 2.0
        assert reno.congestion_window_segments == 2.0

    def test_growth_continues_linearly_after_fast_recovery(self) -> None:
        reno = grown_reno(rounds=4)
        reno.on_signal(TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=0))
        assert reno.congestion_window_segments == 8.0

        ack_full_window(reno)

        assert 8.5 < reno.congestion_window_segments <= 9.0
        assert reno.phase is CongestionPhase.CONGESTION_AVOIDANCE


class TestTimeout:
    def test_timeout_collapses_the_window_like_tahoe(self) -> None:
        reno = grown_reno(rounds=4)
        assert reno.congestion_window_segments == 16.0

        reno.on_signal(Timeout(current_time=1.0, highest_transmitted_sequence_number=0))

        assert reno.ssthresh_segments == 8.0
        assert reno.congestion_window_segments == 1.0
        assert reno.phase is CongestionPhase.SLOW_START

    def test_recovery_after_timeout_slow_starts_to_the_new_ssthresh(self) -> None:
        reno = grown_reno(rounds=4)
        reno.on_signal(Timeout(current_time=1.0, highest_transmitted_sequence_number=0))

        observed = [reno.congestion_window_segments]
        for _ in range(3):
            ack_full_window(reno)
            observed.append(reno.congestion_window_segments)

        assert observed == [1.0, 2.0, 4.0, 8.0]
        assert reno.phase is CongestionPhase.CONGESTION_AVOIDANCE


class TestRenoVersusTahoe:
    def test_reno_keeps_a_larger_window_than_tahoe_after_duplicate_ack_loss(self) -> None:
        """The defining difference: Reno halves where Tahoe collapses to 1."""
        reno = TcpReno(initial_ssthresh_segments=1000.0)
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(reno)
            for _ in range(math.floor(tahoe.congestion_window_segments)):
                tahoe.on_signal(
                    AckReceived(acknowledged_segments=1.0, current_time=0.0, ack_sequence_number=0)
                )
        assert reno.congestion_window_segments == tahoe.congestion_window_segments == 16.0

        reno.on_signal(TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=0))
        tahoe.on_signal(TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=0))

        assert reno.congestion_window_segments == 8.0
        assert tahoe.congestion_window_segments == 1.0

    def test_reno_and_tahoe_respond_identically_to_timeouts(self) -> None:
        reno = grown_reno(rounds=4)
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            for _ in range(math.floor(tahoe.congestion_window_segments)):
                tahoe.on_signal(
                    AckReceived(acknowledged_segments=1.0, current_time=0.0, ack_sequence_number=0)
                )

        reno.on_signal(Timeout(current_time=1.0, highest_transmitted_sequence_number=0))
        tahoe.on_signal(Timeout(current_time=1.0, highest_transmitted_sequence_number=0))

        assert reno.congestion_window_segments == tahoe.congestion_window_segments == 1.0
        assert reno.ssthresh_segments == tahoe.ssthresh_segments == 8.0


class TestKnownWindowEvolution:
    def test_matches_the_textbook_reno_sawtooth(self) -> None:
        """Slow start to ssthresh, linear growth, halve on dup-ACK loss, resume linear."""
        reno = TcpReno(initial_ssthresh_segments=8.0)
        per_round = [reno.congestion_window_segments]
        for _ in range(6):
            ack_full_window(reno)
            per_round.append(reno.congestion_window_segments)

        assert per_round[:4] == [1.0, 2.0, 4.0, 8.0]
        for previous, current in zip(per_round[3:], per_round[4:]):
            assert 0.5 < current - previous <= 1.0

        before_loss = reno.congestion_window_segments
        reno.on_signal(TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=0))

        assert reno.congestion_window_segments == pytest.approx(before_loss / 2)
        assert reno.phase is CongestionPhase.CONGESTION_AVOIDANCE

        ack_full_window(reno)
        assert reno.congestion_window_segments > before_loss / 2


class TestEngineIntegration:
    def test_window_response_matches_the_recorded_loss_signal(
        self, make_config: MakeConfig
    ) -> None:
        config = make_config(
            seed=123,
            total_bytes_to_transfer=40_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.3,
            algorithm=TcpReno(),
        )

        result = run_simulation(config)

        events = result.events
        last_cwnd = 1.0
        timeouts = 0
        fast_retransmits = 0
        for index, event in enumerate(events):
            if event.event_type is SimulationEventType.PACKET_LOST:
                following = events[index + 1]
                assert following.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
                assert following.congestion_window_segments is not None
                if isinstance(event.signal, Timeout):
                    timeouts += 1
                    assert following.congestion_window_segments == 1.0
                else:
                    assert isinstance(event.signal, TripleDuplicateAck)
                    fast_retransmits += 1
                    assert following.congestion_window_segments == pytest.approx(
                        max(last_cwnd / 2, 2.0)
                    )
            if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED:
                assert event.congestion_window_segments is not None
                last_cwnd = event.congestion_window_segments
        assert timeouts + fast_retransmits > 0

    def test_engine_runs_are_deterministic_with_reno(self, make_config: MakeConfig) -> None:
        def run() -> object:
            return run_simulation(
                make_config(
                    seed=9,
                    total_bytes_to_transfer=20_000,
                    maximum_segment_size_bytes=1000,
                    loss_probability=0.2,
                    algorithm=TcpReno(),
                )
            ).events

        assert run() == run()
