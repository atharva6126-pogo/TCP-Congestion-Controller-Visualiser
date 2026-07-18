"""Tests for TCP New Reno congestion control."""

import math

import pytest

from tcp_visualizer.algorithms import CongestionPhase, TcpNewReno, TcpReno, TcpTahoe
from tcp_visualizer.domain import (
    AckReceived,
    CongestionControlAlgorithm,
    CongestionSignal,
    DomainError,
    SimulationEventType,
    Timeout,
    TripleDuplicateAck,
)
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig


def ack(*, amount: float = 1.0, time: float = 0.0, sequence: int = 0) -> AckReceived:
    return AckReceived(
        acknowledged_segments=amount, current_time=time, ack_sequence_number=sequence
    )


def dup_ack(*, time: float = 0.0, highest: int = 0) -> TripleDuplicateAck:
    return TripleDuplicateAck(current_time=time, highest_transmitted_sequence_number=highest)


def timeout(*, time: float = 0.0, highest: int = 0) -> Timeout:
    return Timeout(current_time=time, highest_transmitted_sequence_number=highest)


def ack_full_window(algorithm: TcpNewReno | TcpReno | TcpTahoe) -> None:
    """Acknowledge one full window of single segments, as one RTT round would."""
    for _ in range(math.floor(algorithm.congestion_window_segments)):
        algorithm.on_signal(ack())


def grown_new_reno(rounds: int = 4) -> TcpNewReno:
    """A New Reno instance grown through ``rounds`` loss-free slow-start rounds."""
    new_reno = TcpNewReno(initial_ssthresh_segments=1000.0)
    for _ in range(rounds):
        ack_full_window(new_reno)
    return new_reno


class TestInitialState:
    def test_starts_in_slow_start_with_one_segment_window(self) -> None:
        new_reno = TcpNewReno()

        assert new_reno.congestion_window_segments == 1.0
        assert new_reno.phase is CongestionPhase.SLOW_START
        assert new_reno.name == "new_reno"

    def test_implements_the_strategy_interface(self) -> None:
        assert isinstance(TcpNewReno(), CongestionControlAlgorithm)

    def test_rejects_ssthresh_below_one_segment(self) -> None:
        with pytest.raises(DomainError):
            TcpNewReno(initial_ssthresh_segments=0.5)


class TestGrowthOutsideRecovery:
    def test_slow_start_doubles_every_round_trip(self) -> None:
        new_reno = TcpNewReno(initial_ssthresh_segments=1000.0)
        observed = [new_reno.congestion_window_segments]

        for _ in range(5):
            ack_full_window(new_reno)
            observed.append(new_reno.congestion_window_segments)

        assert observed == [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]

    def test_congestion_avoidance_grows_approximately_linearly(self) -> None:
        new_reno = TcpNewReno(initial_ssthresh_segments=8.0)
        while new_reno.phase is CongestionPhase.SLOW_START:
            new_reno.on_signal(ack())
        assert new_reno.congestion_window_segments == 8.0

        ack_full_window(new_reno)

        assert 8.5 < new_reno.congestion_window_segments <= 9.0


class TestRecoveryEpisode:
    def test_duplicate_ack_loss_halves_once_and_enters_fast_recovery(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        assert new_reno.congestion_window_segments == 16.0

        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))

        assert new_reno.ssthresh_segments == 8.0
        assert new_reno.congestion_window_segments == 8.0
        assert new_reno.phase is CongestionPhase.FAST_RECOVERY

    def test_further_duplicate_ack_losses_in_the_episode_cause_no_reduction(self) -> None:
        """The headline New Reno behavior: one halving per window of losses."""
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))

        new_reno.on_signal(dup_ack(time=1.1, highest=17_000))
        new_reno.on_signal(dup_ack(time=1.2, highest=18_000))

        assert new_reno.congestion_window_segments == 8.0
        assert new_reno.ssthresh_segments == 8.0
        assert new_reno.phase is CongestionPhase.FAST_RECOVERY

    def test_partial_acks_hold_the_window_and_stay_in_recovery(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))

        new_reno.on_signal(ack(time=1.1, sequence=5_000))
        new_reno.on_signal(ack(time=1.2, sequence=12_000))

        assert new_reno.congestion_window_segments == 8.0
        assert new_reno.phase is CongestionPhase.FAST_RECOVERY

    def test_full_ack_ends_recovery_and_resumes_congestion_avoidance(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))

        new_reno.on_signal(ack(time=1.5, sequence=16_000))

        assert new_reno.phase is CongestionPhase.CONGESTION_AVOIDANCE
        assert new_reno.congestion_window_segments == 8.0

        new_reno.on_signal(ack(time=1.6, sequence=17_000))
        assert new_reno.congestion_window_segments == pytest.approx(8.0 + 1.0 / 8.0)

    def test_a_new_episode_after_recovery_halves_again(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))
        new_reno.on_signal(ack(time=1.5, sequence=16_000))
        assert new_reno.congestion_window_segments == 8.0

        new_reno.on_signal(dup_ack(time=2.0, highest=24_000))

        assert new_reno.congestion_window_segments == 4.0
        assert new_reno.phase is CongestionPhase.FAST_RECOVERY

    def test_window_and_ssthresh_floors_apply_on_entering_recovery(self) -> None:
        new_reno = TcpNewReno()
        assert new_reno.congestion_window_segments == 1.0

        new_reno.on_signal(dup_ack(highest=1_000))

        assert new_reno.ssthresh_segments == 2.0
        assert new_reno.congestion_window_segments == 2.0
        assert new_reno.phase is CongestionPhase.FAST_RECOVERY


class TestTimeout:
    def test_timeout_outside_recovery_collapses_like_tahoe(self) -> None:
        new_reno = grown_new_reno(rounds=4)

        new_reno.on_signal(timeout(time=1.0))

        assert new_reno.ssthresh_segments == 8.0
        assert new_reno.congestion_window_segments == 1.0
        assert new_reno.phase is CongestionPhase.SLOW_START

    def test_timeout_during_recovery_collapses_and_ends_the_episode(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))
        phase_during_recovery = new_reno.phase
        assert phase_during_recovery is CongestionPhase.FAST_RECOVERY

        new_reno.on_signal(timeout(time=2.0, highest=16_000))

        assert new_reno.congestion_window_segments == 1.0
        assert new_reno.ssthresh_segments == 4.0
        assert new_reno.phase is CongestionPhase.SLOW_START

    def test_a_duplicate_ack_loss_after_a_timeout_starts_a_fresh_episode(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        new_reno.on_signal(dup_ack(time=1.0, highest=16_000))
        new_reno.on_signal(timeout(time=2.0, highest=16_000))

        new_reno.on_signal(dup_ack(time=3.0, highest=20_000))

        assert new_reno.phase is CongestionPhase.FAST_RECOVERY
        assert new_reno.congestion_window_segments == 2.0


class TestComparative:
    def test_three_losses_in_one_window_separate_the_three_algorithms(self) -> None:
        """Reno compounds its halvings, New Reno halves once, Tahoe collapses."""
        new_reno = grown_new_reno(rounds=4)
        reno = TcpReno(initial_ssthresh_segments=1000.0)
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(reno)
            ack_full_window(tahoe)
        assert (
            new_reno.congestion_window_segments
            == reno.congestion_window_segments
            == tahoe.congestion_window_segments
            == 16.0
        )

        burst: list[CongestionSignal] = [
            dup_ack(time=1.0, highest=16_000),
            dup_ack(time=1.1, highest=16_000),
            dup_ack(time=1.2, highest=16_000),
        ]
        for signal in burst:
            new_reno.on_signal(signal)
            reno.on_signal(signal)
            tahoe.on_signal(signal)

        assert new_reno.congestion_window_segments == 8.0
        assert reno.congestion_window_segments == 2.0
        assert tahoe.congestion_window_segments == 1.0

    def test_all_three_algorithms_respond_identically_to_a_timeout(self) -> None:
        new_reno = grown_new_reno(rounds=4)
        reno = TcpReno(initial_ssthresh_segments=1000.0)
        tahoe = TcpTahoe(initial_ssthresh_segments=1000.0)
        for _ in range(4):
            ack_full_window(reno)
            ack_full_window(tahoe)

        for algorithm in (new_reno, reno, tahoe):
            algorithm.on_signal(timeout(time=1.0))

        assert (
            new_reno.congestion_window_segments
            == reno.congestion_window_segments
            == tahoe.congestion_window_segments
            == 1.0
        )
        assert (
            new_reno.ssthresh_segments == reno.ssthresh_segments == tahoe.ssthresh_segments == 8.0
        )


class TestEngineIntegration:
    def test_at_most_one_reduction_per_recovery_episode(self, make_config: MakeConfig) -> None:
        # Moderate loss on a long transfer: windows grow large enough to
        # suffer several duplicate-ACK losses inside one recovery episode.
        config = make_config(
            seed=1,
            total_bytes_to_transfer=100_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.1,
            algorithm=TcpNewReno(),
        )

        result = run_simulation(config)

        events = result.events
        last_cwnd = 1.0
        reductions = 0
        ignored_in_episode = 0
        for index, event in enumerate(events):
            if event.event_type is SimulationEventType.PACKET_LOST:
                following = events[index + 1]
                assert following.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
                assert following.congestion_window_segments is not None
                if isinstance(event.signal, Timeout):
                    assert following.congestion_window_segments == 1.0
                else:
                    assert isinstance(event.signal, TripleDuplicateAck)
                    if following.congestion_window_segments == last_cwnd:
                        ignored_in_episode += 1
                    else:
                        reductions += 1
                        assert following.congestion_window_segments == pytest.approx(
                            max(last_cwnd / 2, 2.0)
                        )
            if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED:
                assert event.congestion_window_segments is not None
                last_cwnd = event.congestion_window_segments
        assert reductions > 0
        assert ignored_in_episode > 0

    def test_engine_runs_are_deterministic_with_new_reno(self, make_config: MakeConfig) -> None:
        def run() -> object:
            return run_simulation(
                make_config(
                    seed=9,
                    total_bytes_to_transfer=20_000,
                    maximum_segment_size_bytes=1000,
                    loss_probability=0.2,
                    algorithm=TcpNewReno(),
                )
            ).events

        assert run() == run()
