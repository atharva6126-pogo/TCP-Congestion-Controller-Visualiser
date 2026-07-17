"""Shared fixtures for the domain layer test suite."""

import pytest

from tcp_visualizer.domain import Link, Node, NodeRole, SimulationConfig

from .support import StubCongestionControlAlgorithm


@pytest.fixture
def link() -> Link:
    return Link(bandwidth_bytes_per_second=1_000_000.0, latency_ms=20.0, loss_probability=0.01)


@pytest.fixture
def sender() -> Node:
    return Node(name="client", role=NodeRole.SENDER)


@pytest.fixture
def receiver() -> Node:
    return Node(name="server", role=NodeRole.RECEIVER)


@pytest.fixture
def simulation_config(link: Link, sender: Node, receiver: Node) -> SimulationConfig:
    return SimulationConfig(
        seed=42,
        sender=sender,
        receiver=receiver,
        link=link,
        algorithm=StubCongestionControlAlgorithm(),
        total_bytes_to_transfer=10_000,
        maximum_segment_size_bytes=1460,
    )
