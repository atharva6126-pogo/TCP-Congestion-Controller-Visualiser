"""Tests for TCP Cubic congestion control."""

import pytest

from tcp_visualizer.algorithms import CongestionPhase, TcpCubic, TcpNewReno, TcpReno
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

_CUBIC_C = 0.4
_CUBIC_BETA = 0.7


def ack(*, amount: float = 1.0, time: float = 0.0, sequence: int = 0) -> AckReceived:
    return AckReceived(
        acknowledged_segments=amount, current_time=time, ack_sequence_number=sequence
    )


def dup_ack(*, time: float = 0.0, highest: int = 0) -> TripleDuplicateAck:
    return TripleDuplicateAck(current_time=time, highest_transmitted_sequence_number=highest)


def timeout(*, time: float = 0.0, highest: int = 0) -> Timeout:
    return Timeout(current_time=time, highest_transmitted_sequence_number=highest)


def cubic_in_congestion_avoidance(window: float = 10.0) -> TcpCubic:
    """A Cubic instance slow-started to exactly ``window`` segments."""
    cubic = TcpCubic(initial_ssthresh_segments=window)
    for _ in range(int(window) - 1):
        cubic.on_signal(ack())
    assert cubic.congestion_window_segments == window
    assert cubic.phase is CongestionPhase.CONGESTION_AVOIDANCE
    return cubic


def reduced_cubic_with_epoch(epoch_start: float = 2.0) -> tuple[TcpCubic, float]:
    """A Cubic instance reduced from a peak of 10, with its growth epoch begun.

    Returns the instance and K, the time the cubic curve takes to climb
    back to the 10-segment peak from the reduced 7-segment window.
    """
    cubic = cubic_in_congestion_avoidance(10.0)
    cubic.on_signal(dup_ack(time=1.0, highest=10_000))
    cubic.on_signal(ack(time=epoch_start, sequence=10_000))
    k = ((10.0 - 7.0) / _CUBIC_C) ** (1.0 / 3.0)
    return cubic, k


class TestInitialState:
    def test_starts_in_slow_start_with_one_segment_window(self) -> None:
        cubic = TcpCubic()

        assert cubic.congestion_window_segments == 1.0
        assert cubic.phase is CongestionPhase.SLOW_START
        assert cubic.name == "cubic"

    def test_implements_the_strategy_interface(self) -> None:
        assert isinstance(TcpCubic(), CongestionControlAlgorithm)

    def test_rejects_ssthresh_below_one_segment(self) -> None:
        with pytest.raises(DomainError):
            TcpCubic(initial_ssthresh_segments=0.5)


class TestSlowStart:
    def test_grows_by_the_acknowledged_amount_per_ack(self) -> None:
        cubic = TcpCubic(initial_ssthresh_segments=1000.0)

        cubic.on_signal(ack())

        assert cubic.congestion_window_segments == 2.0

    def test_transitions_to_congestion_avoidance_at_ssthresh(self) -> None:
        cubic = TcpCubic(initial_ssthresh_segments=4.0)

        for _ in range(3):
            cubic.on_signal(ack())

        assert cubic.congestion_window_segments == 4.0
        assert cubic.phase is CongestionPhase.CONGESTION_AVOIDANCE


class TestMultiplicativeDecrease:
    def test_duplicate_ack_loss_reduces_by_beta_not_half(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)

        cubic.on_signal(dup_ack(time=1.0, highest=10_000))

        assert cubic.congestion_window_segments == pytest.approx(7.0)
        assert cubic.ssthresh_segments == pytest.approx(7.0)
        assert cubic.w_max_segments == 10.0

    def test_cubic_cuts_more_gently_than_the_reno_family(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)
        reno = TcpReno(initial_ssthresh_segments=10.0)
        new_reno = TcpNewReno(initial_ssthresh_segments=10.0)
        for _ in range(9):
            reno.on_signal(ack())
            new_reno.on_signal(ack())

        loss = dup_ack(time=1.0, highest=10_000)
        for algorithm in (cubic, reno, new_reno):
            algorithm.on_signal(loss)

        assert cubic.congestion_window_segments == pytest.approx(7.0)
        assert reno.congestion_window_segments == pytest.approx(5.0)
        assert new_reno.congestion_window_segments == pytest.approx(5.0)

    def test_reduction_floors_at_two_segments(self) -> None:
        cubic = TcpCubic()

        cubic.on_signal(dup_ack(highest=1_000))

        assert cubic.congestion_window_segments == 2.0
        assert cubic.ssthresh_segments == 2.0


class TestCubicGrowthCurve:
    def test_window_returns_to_the_peak_after_k_seconds(self) -> None:
        cubic, k = reduced_cubic_with_epoch(epoch_start=2.0)

        cubic.on_signal(ack(time=2.0 + k, sequence=11_000))

        assert cubic.congestion_window_segments == pytest.approx(10.0)

    def test_growth_is_concave_before_the_peak_and_convex_beyond_it(self) -> None:
        cubic, k = reduced_cubic_with_epoch(epoch_start=2.0)

        def window_at(elapsed: float) -> float:
            cubic.on_signal(ack(time=2.0 + elapsed, sequence=11_000))
            return cubic.congestion_window_segments

        concave_samples = [window_at(e) for e in (0.0, 0.5, 1.0, 1.5)]
        concave_growth = [b - a for a, b in zip(concave_samples, concave_samples[1:])]
        assert concave_growth == sorted(concave_growth, reverse=True)
        assert all(step >= 0 for step in concave_growth)

        convex_samples = [window_at(k + e) for e in (0.5, 1.0, 1.5, 2.0)]
        convex_growth = [b - a for a, b in zip(convex_samples, convex_samples[1:])]
        assert convex_growth == sorted(convex_growth)
        assert convex_samples[-1] > 10.0

    def test_window_never_decreases_within_an_epoch(self) -> None:
        cubic, _ = reduced_cubic_with_epoch(epoch_start=2.0)

        observed = []
        for elapsed in (0.0, 0.1, 0.7, 1.3, 2.4, 3.0):
            cubic.on_signal(ack(time=2.0 + elapsed, sequence=11_000))
            observed.append(cubic.congestion_window_segments)

        assert observed == sorted(observed)

    def test_exact_cubic_target_beyond_the_peak(self) -> None:
        cubic, k = reduced_cubic_with_epoch(epoch_start=2.0)

        cubic.on_signal(ack(time=2.0 + k + 1.0, sequence=11_000))

        assert cubic.congestion_window_segments == pytest.approx(10.0 + _CUBIC_C)

    def test_first_epoch_without_prior_loss_grows_convexly_from_the_current_window(
        self,
    ) -> None:
        cubic = cubic_in_congestion_avoidance(4.0)

        cubic.on_signal(ack(time=10.0, sequence=1_000))
        assert cubic.congestion_window_segments == 4.0
        assert cubic.w_max_segments == 4.0

        cubic.on_signal(ack(time=12.0, sequence=2_000))

        assert cubic.congestion_window_segments == pytest.approx(4.0 + _CUBIC_C * 2.0**3)


class TestFastConvergence:
    def test_a_lower_peak_is_remembered_at_a_further_reduced_level(self) -> None:
        cubic, _ = reduced_cubic_with_epoch(epoch_start=2.0)
        assert cubic.w_max_segments == 10.0
        assert cubic.congestion_window_segments == 7.0

        cubic.on_signal(dup_ack(time=3.0, highest=20_000))

        assert cubic.w_max_segments == pytest.approx(7.0 * (1 + _CUBIC_BETA) / 2)
        assert cubic.congestion_window_segments == pytest.approx(7.0 * _CUBIC_BETA)


class TestEpisodeSuppression:
    def test_further_duplicate_ack_losses_in_the_episode_cause_no_reduction(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)

        cubic.on_signal(dup_ack(time=1.0, highest=10_000))
        cubic.on_signal(dup_ack(time=1.1, highest=11_000))
        cubic.on_signal(dup_ack(time=1.2, highest=12_000))

        assert cubic.congestion_window_segments == pytest.approx(7.0)

    def test_a_new_episode_after_a_covering_ack_reduces_again(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)
        cubic.on_signal(dup_ack(time=1.0, highest=10_000))
        cubic.on_signal(ack(time=2.0, sequence=10_000))

        cubic.on_signal(dup_ack(time=3.0, highest=20_000))

        assert cubic.congestion_window_segments == pytest.approx(7.0 * _CUBIC_BETA)


class TestTimeout:
    def test_timeout_collapses_to_one_segment_and_restarts_slow_start(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)

        cubic.on_signal(timeout(time=1.0))

        assert cubic.congestion_window_segments == 1.0
        assert cubic.ssthresh_segments == pytest.approx(7.0)
        assert cubic.w_max_segments == 10.0
        assert cubic.phase is CongestionPhase.SLOW_START

    def test_regrowth_after_timeout_slow_starts_then_climbs_toward_the_old_peak(self) -> None:
        cubic = cubic_in_congestion_avoidance(10.0)
        cubic.on_signal(timeout(time=1.0))

        for _ in range(6):
            cubic.on_signal(ack(time=2.0, sequence=11_000))
        assert cubic.congestion_window_segments == pytest.approx(7.0)
        assert cubic.phase is CongestionPhase.CONGESTION_AVOIDANCE

        k = ((10.0 - 7.0) / _CUBIC_C) ** (1.0 / 3.0)
        cubic.on_signal(ack(time=3.0, sequence=12_000))
        cubic.on_signal(ack(time=3.0 + k, sequence=13_000))

        assert cubic.congestion_window_segments == pytest.approx(10.0)


class TestEngineIntegration:
    def test_lossy_run_reduces_by_beta_on_duplicate_ack_losses(
        self, make_config: MakeConfig
    ) -> None:
        config = make_config(
            seed=1,
            total_bytes_to_transfer=100_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.1,
            algorithm=TcpCubic(),
        )

        result = run_simulation(config)

        events = result.events
        last_cwnd = 1.0
        reductions = 0
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
                        pass  # suppressed: same recovery episode
                    else:
                        reductions += 1
                        assert following.congestion_window_segments == pytest.approx(
                            max(last_cwnd * _CUBIC_BETA, 2.0)
                        )
            if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED:
                assert event.congestion_window_segments is not None
                last_cwnd = event.congestion_window_segments
        assert reductions > 0

    def test_engine_runs_are_deterministic_with_cubic(self, make_config: MakeConfig) -> None:
        def run() -> object:
            return run_simulation(
                make_config(
                    seed=9,
                    total_bytes_to_transfer=20_000,
                    maximum_segment_size_bytes=1000,
                    loss_probability=0.2,
                    algorithm=TcpCubic(),
                )
            ).events

        assert run() == run()

    def test_zero_loss_run_completes_with_monotone_window_growth(
        self, make_config: MakeConfig
    ) -> None:
        config = make_config(
            total_bytes_to_transfer=50_000,
            maximum_segment_size_bytes=1000,
            loss_probability=0.0,
            algorithm=TcpCubic(),
        )

        result = run_simulation(config)

        acked = [
            e for e in result.events if e.event_type is SimulationEventType.PACKET_ACKNOWLEDGED
        ]
        assert len(acked) == 50
        cwnd_values = [
            e.congestion_window_segments
            for e in result.events
            if e.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
            and e.congestion_window_segments is not None
        ]
        assert cwnd_values == sorted(cwnd_values)
