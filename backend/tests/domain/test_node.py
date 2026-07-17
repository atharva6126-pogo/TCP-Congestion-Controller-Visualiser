"""Tests for the Node entity."""

import pytest

from tcp_visualizer.domain import DomainError, Node, NodeRole


def test_node_holds_name_and_role() -> None:
    node = Node(name="client", role=NodeRole.SENDER)

    assert node.name == "client"
    assert node.role is NodeRole.SENDER


def test_node_rejects_blank_name() -> None:
    with pytest.raises(DomainError):
        Node(name="   ", role=NodeRole.SENDER)


def test_node_is_immutable() -> None:
    node = Node(name="client", role=NodeRole.SENDER)

    with pytest.raises(AttributeError):
        node.name = "other"  # type: ignore[misc]
