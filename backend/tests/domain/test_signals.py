"""Tests for the congestion signal vocabulary."""

import pytest

from tcp_visualizer.domain import AckReceived, DomainError, Timeout, TripleDuplicateAck


def test_ack_received_holds_amount_and_time() -> None:
    signal = AckReceived(acknowledged_segments=1.5, current_time=0.25)

    assert signal.acknowledged_segments == 1.5
    assert signal.current_time == 0.25


def test_loss_signals_hold_time() -> None:
    assert TripleDuplicateAck(current_time=1.0).current_time == 1.0
    assert Timeout(current_time=2.0).current_time == 2.0


def test_ack_received_rejects_non_positive_amount() -> None:
    with pytest.raises(DomainError):
        AckReceived(acknowledged_segments=0.0, current_time=0.0)


@pytest.mark.parametrize("current_time", [-0.1, -1.0])
def test_signals_reject_negative_time(current_time: float) -> None:
    with pytest.raises(DomainError):
        AckReceived(acknowledged_segments=1.0, current_time=current_time)
    with pytest.raises(DomainError):
        TripleDuplicateAck(current_time=current_time)
    with pytest.raises(DomainError):
        Timeout(current_time=current_time)


def test_signals_are_immutable() -> None:
    signal = Timeout(current_time=1.0)

    with pytest.raises(AttributeError):
        signal.current_time = 2.0  # type: ignore[misc]
