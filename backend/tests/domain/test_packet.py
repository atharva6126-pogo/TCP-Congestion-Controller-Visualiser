"""Tests for the Packet entity."""

import pytest

from tcp_visualizer.domain import DomainError, Packet


def test_packet_holds_sequence_and_size() -> None:
    packet = Packet(sequence_number=0, size_bytes=1460)

    assert packet.sequence_number == 0
    assert packet.size_bytes == 1460


def test_packet_rejects_negative_sequence_number() -> None:
    with pytest.raises(DomainError):
        Packet(sequence_number=-1, size_bytes=1460)


def test_packet_rejects_non_positive_size() -> None:
    with pytest.raises(DomainError):
        Packet(sequence_number=0, size_bytes=0)
