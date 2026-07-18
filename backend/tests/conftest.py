"""Fixtures shared across the backend test suite."""

from typing import Protocol

import pytest

from tcp_visualizer.domain import Link, Node, NodeRole, SimulationConfig

from .support import StubCongestionControlAlgorithm


class MakeConfig(Protocol):
    def __call__(
        self,
        *,
        seed: int = ...,
        total_bytes_to_transfer: int = ...,
        maximum_segment_size_bytes: int = ...,
        bandwidth_bytes_per_second: float = ...,
        latency_ms: float = ...,
        loss_probability: float = ...,
    ) -> SimulationConfig: ...


@pytest.fixture
def make_config() -> MakeConfig:
    def _make_config(
        *,
        seed: int = 1,
        total_bytes_to_transfer: int = 5000,
        maximum_segment_size_bytes: int = 1000,
        bandwidth_bytes_per_second: float = 1_000_000.0,
        latency_ms: float = 10.0,
        loss_probability: float = 0.0,
    ) -> SimulationConfig:
        return SimulationConfig(
            seed=seed,
            sender=Node(name="client", role=NodeRole.SENDER),
            receiver=Node(name="server", role=NodeRole.RECEIVER),
            link=Link(
                bandwidth_bytes_per_second=bandwidth_bytes_per_second,
                latency_ms=latency_ms,
                loss_probability=loss_probability,
            ),
            algorithm=StubCongestionControlAlgorithm(),
            total_bytes_to_transfer=total_bytes_to_transfer,
            maximum_segment_size_bytes=maximum_segment_size_bytes,
        )

    return _make_config
