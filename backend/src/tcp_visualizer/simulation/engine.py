"""Discrete-event simulation engine.

Drives a :class:`~tcp_visualizer.domain.congestion_control.CongestionControlAlgorithm`
through a SimPy-modeled network link to produce a complete, deterministic
:class:`~tcp_visualizer.domain.result.SimulationResult`.

The engine owns network-level concerns that apply regardless of which
algorithm is plugged in: chunking data into segments, simulating
transmission/propagation delay, drawing seeded packet-loss outcomes,
classifying each observed loss as a congestion signal, and retransmitting
lost segments so the transfer always completes. It has no opinion on *how*
the congestion window should grow or shrink — every observation is
delivered to the injected algorithm as a
:class:`~tcp_visualizer.domain.signals.CongestionSignal` via ``on_signal``,
and the algorithm alone decides the response.

Loss classification (see ADR 0002): a loss detected while at least three
*other* packets are in flight is reported as ``TripleDuplicateAck`` —
those packets generate the duplicate acknowledgements fast retransmit
needs — otherwise as ``Timeout``. Both are detected one round trip after
the send; the simulator does not model a separate, longer RTO delay.

Sequence bookkeeping (see ADR 0003): the engine tracks two transport-level
observations and reports them on signals — the cumulative acknowledgment
point (contiguous prefix of the stream delivered so far, mirroring the TCP
header's Acknowledgment Number) on ``AckReceived``, and the highest
sequence transmitted (``snd.nxt``) on both loss signals. These let
Reno-family algorithms implement RFC 6582 recovery episodes without the
engine knowing anything about recovery.
"""

import math
import random
from collections import deque
from collections.abc import Callable, Generator
from typing import Protocol

import simpy

from tcp_visualizer.domain import (
    AckReceived,
    CongestionSignal,
    Packet,
    SimulationConfig,
    SimulationEvent,
    SimulationEventType,
    SimulationResult,
    Timeout,
    TripleDuplicateAck,
)

_FAST_RETRANSMIT_MINIMUM_OTHER_PACKETS_IN_FLIGHT = 3


class _OnPacketComplete(Protocol):
    def __call__(self, sequence_index: int, *, delivered: bool) -> None: ...


class _SequenceTracker:
    """Sender-side sequence bookkeeping shared by the transmission processes.

    Tracks the two transport-level observations reported on signals: the
    highest sequence transmitted so far and the cumulative acknowledgment
    point (the contiguous prefix of the stream delivered so far).
    """

    def __init__(self, *, total_bytes: int, maximum_segment_size_bytes: int) -> None:
        self._total_bytes = total_bytes
        self._mss = maximum_segment_size_bytes
        self._delivered = [False] * math.ceil(total_bytes / maximum_segment_size_bytes)
        self._contiguous_segments = 0
        self._highest_transmitted = 0

    def segment_bounds(self, sequence_index: int) -> tuple[int, int]:
        """The byte range ``[start, end)`` occupied by ``sequence_index``."""
        start = sequence_index * self._mss
        return start, min(start + self._mss, self._total_bytes)

    def record_transmission(self, sequence_index: int) -> None:
        _, end = self.segment_bounds(sequence_index)
        self._highest_transmitted = max(self._highest_transmitted, end)

    def record_delivery(self, sequence_index: int) -> None:
        self._delivered[sequence_index] = True
        while (
            self._contiguous_segments < len(self._delivered)
            and self._delivered[self._contiguous_segments]
        ):
            self._contiguous_segments += 1

    @property
    def ack_sequence_number(self) -> int:
        return min(self._contiguous_segments * self._mss, self._total_bytes)

    @property
    def highest_transmitted_sequence_number(self) -> int:
        return self._highest_transmitted


def run_simulation(config: SimulationConfig) -> SimulationResult:
    """Run ``config`` to completion and return its full, ordered event timeline."""
    rng = random.Random(config.seed)
    events: list[SimulationEvent] = []
    env = simpy.Environment()

    env.process(_sender(env, config, rng, events))
    env.run()

    events.sort(key=lambda event: event.timestamp)
    return SimulationResult(config=config, events=tuple(events))


def _sender(
    env: simpy.Environment,
    config: SimulationConfig,
    rng: random.Random,
    events: list[SimulationEvent],
) -> Generator[simpy.Event, None, None]:
    mss = config.maximum_segment_size_bytes
    total_segments = math.ceil(config.total_bytes_to_transfer / mss)
    tracker = _SequenceTracker(
        total_bytes=config.total_bytes_to_transfer, maximum_segment_size_bytes=mss
    )
    pending: deque[int] = deque(range(total_segments))
    in_flight = 0
    completed = 0
    slot_freed = env.event()

    def packets_in_flight() -> int:
        return in_flight

    def on_packet_complete(sequence_index: int, *, delivered: bool) -> None:
        nonlocal in_flight, completed
        in_flight -= 1
        if delivered:
            completed += 1
        else:
            pending.appendleft(sequence_index)
        if not slot_freed.triggered:
            slot_freed.succeed()

    while completed < total_segments:
        # A congestion window below 1 segment would stall sending forever;
        # real TCP never lets cwnd drop below 1 MSS either.
        window = max(1, math.floor(config.algorithm.congestion_window_segments))
        while pending and in_flight < window:
            sequence_index = pending.popleft()
            in_flight += 1
            env.process(
                _transmit_packet(
                    env,
                    config,
                    rng,
                    events,
                    sequence_index,
                    mss,
                    tracker,
                    packets_in_flight,
                    on_packet_complete,
                )
            )

        slot_freed = env.event()
        yield slot_freed


def _transmit_packet(
    env: simpy.Environment,
    config: SimulationConfig,
    rng: random.Random,
    events: list[SimulationEvent],
    sequence_index: int,
    mss: int,
    tracker: _SequenceTracker,
    packets_in_flight: Callable[[], int],
    on_complete: _OnPacketComplete,
) -> Generator[simpy.Event, None, None]:
    bytes_before, bytes_end = tracker.segment_bounds(sequence_index)
    size_bytes = bytes_end - bytes_before
    packet = Packet(sequence_number=bytes_before, size_bytes=size_bytes)
    tracker.record_transmission(sequence_index)

    events.append(
        SimulationEvent(
            timestamp=env.now,
            event_type=SimulationEventType.PACKET_SENT,
            node=config.sender,
            packet=packet,
        )
    )

    one_way_delay_seconds = config.link.latency_ms / 1000
    transmission_delay_seconds = size_bytes / config.link.bandwidth_bytes_per_second
    round_trip_delay_seconds = transmission_delay_seconds + 2 * one_way_delay_seconds

    yield env.timeout(round_trip_delay_seconds)

    algorithm = config.algorithm
    if rng.random() < config.link.loss_probability:
        # This packet still counts itself in the in-flight total here.
        other_packets_in_flight = packets_in_flight() - 1
        signal: CongestionSignal
        if other_packets_in_flight >= _FAST_RETRANSMIT_MINIMUM_OTHER_PACKETS_IN_FLIGHT:
            signal = TripleDuplicateAck(
                current_time=env.now,
                highest_transmitted_sequence_number=tracker.highest_transmitted_sequence_number,
            )
        else:
            signal = Timeout(
                current_time=env.now,
                highest_transmitted_sequence_number=tracker.highest_transmitted_sequence_number,
            )
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.PACKET_LOST,
                node=config.receiver,
                packet=packet,
                signal=signal,
            )
        )
        algorithm.on_signal(signal)
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
                node=config.sender,
                congestion_window_segments=algorithm.congestion_window_segments,
                phase=algorithm.phase,
            )
        )
        on_complete(sequence_index, delivered=False)
    else:
        # Record the delivery first so the acknowledgment point includes
        # the arriving segment, as a real cumulative ACK would.
        tracker.record_delivery(sequence_index)
        ack = AckReceived(
            acknowledged_segments=size_bytes / mss,
            current_time=env.now,
            ack_sequence_number=tracker.ack_sequence_number,
        )
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.PACKET_ACKNOWLEDGED,
                node=config.receiver,
                packet=packet,
                signal=ack,
            )
        )
        algorithm.on_signal(ack)
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
                node=config.sender,
                congestion_window_segments=algorithm.congestion_window_segments,
                phase=algorithm.phase,
            )
        )
        on_complete(sequence_index, delivered=True)
