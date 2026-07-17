"""Tests for the Link entity."""

import pytest

from tcp_visualizer.domain import DomainError, Link


def test_link_holds_physical_properties() -> None:
    link = Link(bandwidth_bytes_per_second=1_000_000.0, latency_ms=20.0, loss_probability=0.01)

    assert link.bandwidth_bytes_per_second == 1_000_000.0
    assert link.latency_ms == 20.0
    assert link.loss_probability == 0.01


@pytest.mark.parametrize(
    "bandwidth_bytes_per_second,latency_ms,loss_probability",
    [
        (0.0, 20.0, 0.01),
        (-1.0, 20.0, 0.01),
        (1_000.0, -1.0, 0.01),
        (1_000.0, 20.0, -0.01),
        (1_000.0, 20.0, 1.01),
    ],
)
def test_link_rejects_invalid_values(
    bandwidth_bytes_per_second: float, latency_ms: float, loss_probability: float
) -> None:
    with pytest.raises(DomainError):
        Link(
            bandwidth_bytes_per_second=bandwidth_bytes_per_second,
            latency_ms=latency_ms,
            loss_probability=loss_probability,
        )
