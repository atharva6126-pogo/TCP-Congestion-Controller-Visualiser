"""Tests for the CongestionControlAlgorithm strategy interface."""

import pytest

from tcp_visualizer.domain import CongestionControlAlgorithm

from ..support import StubCongestionControlAlgorithm


def test_interface_cannot_be_instantiated_directly() -> None:
    with pytest.raises(TypeError):
        CongestionControlAlgorithm()  # type: ignore[abstract]


def test_concrete_implementation_satisfies_the_contract() -> None:
    algorithm: CongestionControlAlgorithm = StubCongestionControlAlgorithm()

    algorithm.on_ack(acknowledged_segments=1.0, current_time=0.1)
    assert algorithm.congestion_window_segments == 2.0

    algorithm.on_packet_loss(current_time=0.2)
    assert algorithm.congestion_window_segments == 1.0
    assert algorithm.name == "stub"
