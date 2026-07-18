"""Request and response models for the simulation API.

These Pydantic models are the wire contract and exist only at the API
boundary; the domain layer never imports them (ADR 0001). Bounds here
are deliberately tighter than the domain's invariants: they keep a
single request's work and response size bounded. In particular the loss
probability is capped below 1.0 — a link that drops every packet would
retransmit forever, since the engine runs until the whole transfer is
delivered.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from tcp_visualizer.algorithms import AVAILABLE_ALGORITHMS
from tcp_visualizer.domain import (
    AckReceived,
    CongestionSignal,
    SimulationEvent,
    SimulationResult,
    Timeout,
    TripleDuplicateAck,
)
from tcp_visualizer.statistics import SimulationStatistics

AlgorithmName = Literal["tahoe", "reno", "new_reno", "cubic"]

# Keeps the literal above honest if an algorithm is ever added.
assert set(AVAILABLE_ALGORITHMS) == {"tahoe", "reno", "new_reno", "cubic"}


class SimulationRequest(BaseModel):
    """Everything needed to reproduce one run."""

    algorithm: AlgorithmName
    seed: Annotated[int, Field(ge=0, le=2**31 - 1)]
    bandwidth_bytes_per_second: Annotated[float, Field(gt=0, le=1_000_000_000)]
    latency_ms: Annotated[float, Field(ge=0, le=500)]
    loss_probability: Annotated[float, Field(ge=0, le=0.5)]
    total_bytes_to_transfer: Annotated[int, Field(gt=0, le=500_000)]
    maximum_segment_size_bytes: Annotated[int, Field(ge=500, le=9000)]


class PacketModel(BaseModel):
    sequence_number: int
    size_bytes: int


class SignalModel(BaseModel):
    """A congestion signal, discriminated by ``kind``."""

    kind: Literal["ack_received", "triple_duplicate_ack", "timeout"]
    current_time: float
    acknowledged_segments: float | None = None
    ack_sequence_number: int | None = None
    highest_transmitted_sequence_number: int | None = None


class SimulationEventModel(BaseModel):
    timestamp: float
    event_type: str
    packet: PacketModel | None = None
    congestion_window_segments: float | None = None
    phase: str | None = None
    signal: SignalModel | None = None


class StatisticsModel(BaseModel):
    """Run totals.

    ``congestion_window_history`` from the domain statistics is
    deliberately not carried here: it restates the window-change events
    already present in the timeline, and every window visual derives
    from those events.
    """

    throughput_bytes_per_second: float
    packet_delivery_ratio: float
    retransmission_count: int
    average_rtt_seconds: float
    packet_loss_count: int


class SimulationResponse(BaseModel):
    algorithm: AlgorithmName
    seed: int
    total_bytes_to_transfer: int
    maximum_segment_size_bytes: int
    duration_seconds: float
    events: list[SimulationEventModel]
    statistics: StatisticsModel


def _to_signal_model(signal: CongestionSignal) -> SignalModel:
    match signal:
        case AckReceived():
            return SignalModel(
                kind="ack_received",
                current_time=signal.current_time,
                acknowledged_segments=signal.acknowledged_segments,
                ack_sequence_number=signal.ack_sequence_number,
            )
        case TripleDuplicateAck():
            return SignalModel(
                kind="triple_duplicate_ack",
                current_time=signal.current_time,
                highest_transmitted_sequence_number=signal.highest_transmitted_sequence_number,
            )
        case Timeout():
            return SignalModel(
                kind="timeout",
                current_time=signal.current_time,
                highest_transmitted_sequence_number=signal.highest_transmitted_sequence_number,
            )


def _to_event_model(event: SimulationEvent) -> SimulationEventModel:
    return SimulationEventModel(
        timestamp=event.timestamp,
        event_type=str(event.event_type),
        packet=(
            None
            if event.packet is None
            else PacketModel(
                sequence_number=event.packet.sequence_number,
                size_bytes=event.packet.size_bytes,
            )
        ),
        congestion_window_segments=event.congestion_window_segments,
        phase=None if event.phase is None else str(event.phase),
        signal=None if event.signal is None else _to_signal_model(event.signal),
    )


def to_simulation_response(
    request: SimulationRequest,
    result: SimulationResult,
    statistics: SimulationStatistics,
) -> SimulationResponse:
    """Map domain objects onto the wire contract."""
    events = [_to_event_model(event) for event in result.events]
    return SimulationResponse(
        algorithm=request.algorithm,
        seed=request.seed,
        total_bytes_to_transfer=request.total_bytes_to_transfer,
        maximum_segment_size_bytes=request.maximum_segment_size_bytes,
        duration_seconds=result.events[-1].timestamp if result.events else 0.0,
        events=events,
        statistics=StatisticsModel(
            throughput_bytes_per_second=statistics.throughput_bytes_per_second,
            packet_delivery_ratio=statistics.packet_delivery_ratio,
            retransmission_count=statistics.retransmission_count,
            average_rtt_seconds=statistics.average_rtt_seconds,
            packet_loss_count=statistics.packet_loss_count,
        ),
    )
