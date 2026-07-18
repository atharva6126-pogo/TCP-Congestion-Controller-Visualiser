"""Derives performance statistics from a completed simulation timeline.

The simulation engine emits events only; every metric here is computed
after the fact from the ordered ``SimulationResult.events`` timeline.
Because the timeline is deterministic for a given seed, the derived
statistics are deterministic too.
"""

from collections import deque
from dataclasses import dataclass

from tcp_visualizer.domain import SimulationEventType, SimulationResult


@dataclass(frozen=True, slots=True)
class CongestionWindowSample:
    """The congestion window observed at one moment in the simulation."""

    timestamp: float
    congestion_window_segments: float


@dataclass(frozen=True, slots=True)
class SimulationStatistics:
    """Aggregate performance metrics derived from one simulation run.

    Ratio- and average-style metrics are ``0.0`` when the timeline contains
    no packets to measure (e.g. an empty simulation).

    Attributes:
        throughput_bytes_per_second: Unique delivered payload bytes divided by
            total simulated duration.
        packet_delivery_ratio: Acknowledged transmissions divided by total
            transmissions (retransmissions count as separate transmissions).
        retransmission_count: Transmissions beyond the first for each segment.
        average_rtt_seconds: Mean time between sending a packet and receiving
            its acknowledgement, over acknowledged transmissions only.
        congestion_window_history: Every congestion window change, in
            timeline order.
        packet_loss_count: Number of transmissions lost in transit.
    """

    throughput_bytes_per_second: float
    packet_delivery_ratio: float
    retransmission_count: int
    average_rtt_seconds: float
    congestion_window_history: tuple[CongestionWindowSample, ...]
    packet_loss_count: int


class StatisticsCollector:
    """Computes :class:`SimulationStatistics` from a :class:`SimulationResult`."""

    def collect(self, result: SimulationResult) -> SimulationStatistics:
        sent_count = 0
        acked_count = 0
        lost_count = 0
        delivered_bytes = 0
        sequence_numbers_sent: set[int] = set()
        pending_send_times: dict[int, deque[float]] = {}
        rtt_samples: list[float] = []
        cwnd_history: list[CongestionWindowSample] = []

        for event in result.events:
            if event.event_type is SimulationEventType.PACKET_SENT:
                assert event.packet is not None
                sent_count += 1
                sequence_numbers_sent.add(event.packet.sequence_number)
                pending_send_times.setdefault(event.packet.sequence_number, deque()).append(
                    event.timestamp
                )
            elif event.event_type is SimulationEventType.PACKET_ACKNOWLEDGED:
                assert event.packet is not None
                acked_count += 1
                delivered_bytes += event.packet.size_bytes
                send_time = pending_send_times[event.packet.sequence_number].popleft()
                rtt_samples.append(event.timestamp - send_time)
            elif event.event_type is SimulationEventType.PACKET_LOST:
                assert event.packet is not None
                lost_count += 1
                pending_send_times[event.packet.sequence_number].popleft()
            elif event.event_type is SimulationEventType.CONGESTION_WINDOW_CHANGED:
                assert event.congestion_window_segments is not None
                cwnd_history.append(
                    CongestionWindowSample(
                        timestamp=event.timestamp,
                        congestion_window_segments=event.congestion_window_segments,
                    )
                )

        duration = result.events[-1].timestamp if result.events else 0.0
        return SimulationStatistics(
            throughput_bytes_per_second=delivered_bytes / duration if duration > 0 else 0.0,
            packet_delivery_ratio=acked_count / sent_count if sent_count > 0 else 0.0,
            retransmission_count=sent_count - len(sequence_numbers_sent),
            average_rtt_seconds=sum(rtt_samples) / len(rtt_samples) if rtt_samples else 0.0,
            congestion_window_history=tuple(cwnd_history),
            packet_loss_count=lost_count,
        )
