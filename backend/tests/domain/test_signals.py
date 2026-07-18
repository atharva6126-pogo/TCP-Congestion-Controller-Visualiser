"""Tests for the congestion signal vocabulary."""

import pytest

from tcp_visualizer.domain import AckReceived, DomainError, Timeout, TripleDuplicateAck


def test_ack_received_holds_amount_time_and_ack_point() -> None:
    signal = AckReceived(acknowledged_segments=1.5, current_time=0.25, ack_sequence_number=3000)

    assert signal.acknowledged_segments == 1.5
    assert signal.current_time == 0.25
    assert signal.ack_sequence_number == 3000


def test_loss_signals_hold_time_and_highest_transmitted() -> None:
    duplicate = TripleDuplicateAck(current_time=1.0, highest_transmitted_sequence_number=5000)
    timeout = Timeout(current_time=2.0, highest_transmitted_sequence_number=6000)

    assert duplicate.current_time == 1.0
    assert duplicate.highest_transmitted_sequence_number == 5000
    assert timeout.current_time == 2.0
    assert timeout.highest_transmitted_sequence_number == 6000


def test_ack_received_rejects_non_positive_amount() -> None:
    with pytest.raises(DomainError):
        AckReceived(acknowledged_segments=0.0, current_time=0.0, ack_sequence_number=0)


def test_ack_received_rejects_negative_ack_sequence_number() -> None:
    with pytest.raises(DomainError):
        AckReceived(acknowledged_segments=1.0, current_time=0.0, ack_sequence_number=-1)


def test_loss_signals_reject_negative_highest_transmitted() -> None:
    with pytest.raises(DomainError):
        TripleDuplicateAck(current_time=0.0, highest_transmitted_sequence_number=-1)
    with pytest.raises(DomainError):
        Timeout(current_time=0.0, highest_transmitted_sequence_number=-1)


@pytest.mark.parametrize("current_time", [-0.1, -1.0])
def test_signals_reject_negative_time(current_time: float) -> None:
    with pytest.raises(DomainError):
        AckReceived(acknowledged_segments=1.0, current_time=current_time, ack_sequence_number=0)
    with pytest.raises(DomainError):
        TripleDuplicateAck(current_time=current_time, highest_transmitted_sequence_number=0)
    with pytest.raises(DomainError):
        Timeout(current_time=current_time, highest_transmitted_sequence_number=0)


def test_signals_are_immutable() -> None:
    signal = Timeout(current_time=1.0, highest_transmitted_sequence_number=0)

    with pytest.raises(AttributeError):
        signal.current_time = 2.0  # type: ignore[misc]
