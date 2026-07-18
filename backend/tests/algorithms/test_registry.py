"""Tests for algorithm construction by name."""

import pytest

from tcp_visualizer.algorithms import AVAILABLE_ALGORITHMS, create_algorithm
from tcp_visualizer.domain import CongestionControlAlgorithm, DomainError


@pytest.mark.parametrize("name", AVAILABLE_ALGORITHMS)
def test_creates_every_registered_algorithm(name: str) -> None:
    algorithm = create_algorithm(name)

    assert isinstance(algorithm, CongestionControlAlgorithm)
    assert algorithm.name == name


def test_each_call_returns_a_fresh_instance() -> None:
    first = create_algorithm("reno")
    second = create_algorithm("reno")

    assert first is not second


def test_rejects_an_unknown_algorithm() -> None:
    with pytest.raises(DomainError):
        create_algorithm("bbr")
