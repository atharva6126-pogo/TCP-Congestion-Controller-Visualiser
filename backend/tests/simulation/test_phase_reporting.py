"""Tests for phase reporting on congestion-window-change events."""

from tcp_visualizer.algorithms import TcpNewReno
from tcp_visualizer.domain import CongestionPhase, SimulationEventType
from tcp_visualizer.simulation import run_simulation

from ..conftest import MakeConfig


def test_window_changes_report_the_algorithm_phase(make_config: MakeConfig) -> None:
    config = make_config(
        seed=1,
        total_bytes_to_transfer=40_000,
        maximum_segment_size_bytes=1000,
        loss_probability=0.1,
        algorithm=TcpNewReno(),
    )

    result = run_simulation(config)

    changes = [
        event
        for event in result.events
        if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
    ]
    assert len(changes) > 0
    assert all(isinstance(event.phase, CongestionPhase) for event in changes)


def test_phase_is_none_for_algorithms_that_do_not_report_one(make_config: MakeConfig) -> None:
    """The stub algorithm leaves the interface's optional phase unset."""
    config = make_config(total_bytes_to_transfer=5000, maximum_segment_size_bytes=1000)

    result = run_simulation(config)

    changes = [
        event
        for event in result.events
        if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
    ]
    assert len(changes) > 0
    assert all(event.phase is None for event in changes)


def test_reporting_phase_does_not_change_the_simulation(make_config: MakeConfig) -> None:
    """Phase is observability only: windows and timings are untouched."""

    def windows_and_times() -> list[tuple[float, float | None]]:
        result = run_simulation(
            make_config(
                seed=7,
                total_bytes_to_transfer=20_000,
                maximum_segment_size_bytes=1000,
                loss_probability=0.2,
                algorithm=TcpNewReno(),
            )
        )
        return [
            (event.timestamp, event.congestion_window_segments)
            for event in result.events
            if event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED
        ]

    assert windows_and_times() == windows_and_times()
