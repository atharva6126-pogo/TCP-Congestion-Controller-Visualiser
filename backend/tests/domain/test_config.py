"""Tests for SimulationConfig validation and required-seed determinism."""

import pytest

from tcp_visualizer.domain import DomainError, Link, Node, NodeRole, SimulationConfig

from .support import StubCongestionControlAlgorithm


def test_config_requires_seed_explicitly(link: Link, sender: Node, receiver: Node) -> None:
    config = SimulationConfig(
        seed=42,
        sender=sender,
        receiver=receiver,
        link=link,
        algorithm=StubCongestionControlAlgorithm(),
        total_bytes_to_transfer=10_000,
        maximum_segment_size_bytes=1460,
    )

    assert config.seed == 42


def test_config_rejects_sender_with_wrong_role(link: Link, receiver: Node) -> None:
    with pytest.raises(DomainError):
        SimulationConfig(
            seed=1,
            sender=Node(name="client", role=NodeRole.RECEIVER),
            receiver=receiver,
            link=link,
            algorithm=StubCongestionControlAlgorithm(),
            total_bytes_to_transfer=10_000,
            maximum_segment_size_bytes=1460,
        )


def test_config_rejects_receiver_with_wrong_role(link: Link, sender: Node) -> None:
    with pytest.raises(DomainError):
        SimulationConfig(
            seed=1,
            sender=sender,
            receiver=Node(name="server", role=NodeRole.SENDER),
            link=link,
            algorithm=StubCongestionControlAlgorithm(),
            total_bytes_to_transfer=10_000,
            maximum_segment_size_bytes=1460,
        )


def test_config_rejects_identical_sender_and_receiver_names(link: Link) -> None:
    with pytest.raises(DomainError):
        SimulationConfig(
            seed=1,
            sender=Node(name="same", role=NodeRole.SENDER),
            receiver=Node(name="same", role=NodeRole.RECEIVER),
            link=link,
            algorithm=StubCongestionControlAlgorithm(),
            total_bytes_to_transfer=10_000,
            maximum_segment_size_bytes=1460,
        )


@pytest.mark.parametrize(
    "total_bytes_to_transfer,maximum_segment_size_bytes",
    [(0, 1460), (-1, 1460), (10_000, 0), (10_000, -1)],
)
def test_config_rejects_non_positive_sizes(
    total_bytes_to_transfer: int,
    maximum_segment_size_bytes: int,
    link: Link,
    sender: Node,
    receiver: Node,
) -> None:
    with pytest.raises(DomainError):
        SimulationConfig(
            seed=1,
            sender=sender,
            receiver=receiver,
            link=link,
            algorithm=StubCongestionControlAlgorithm(),
            total_bytes_to_transfer=total_bytes_to_transfer,
            maximum_segment_size_bytes=maximum_segment_size_bytes,
        )
