"""Discrete-event simulation engine.

Drives a :class:`~tcp_visualizer.domain.congestion_control.CongestionControlAlgorithm`
through a SimPy-modeled network link to produce a complete, deterministic
:class:`~tcp_visualizer.domain.result.SimulationResult`.

The engine owns network-level concerns that apply regardless of which
algorithm is plugged in: chunking data into segments, simulating
transmission/propagation delay, drawing seeded packet-loss outcomes, and
retransmitting lost segments so the transfer always completes. It has no
opinion on *how* the congestion window should grow or shrink — that is
entirely delegated to the injected algorithm via ``on_ack``/``on_packet_loss``.
"""

import math
import random
from collections import deque
from collections.abc import Generator
from typing import Protocol

import simpy

from tcp_visualizer.domain import (
    Packet,
    SimulationConfig,
    SimulationEvent,
    SimulationEventType,
    SimulationResult,
)


class _OnPacketComplete(Protocol):
    def __call__(self, sequence_index: int, *, delivered: bool) -> None: ...


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
    pending: deque[int] = deque(range(total_segments))
    in_flight = 0
    completed = 0
    slot_freed = env.event()

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
                _transmit_packet(env, config, rng, events, sequence_index, mss, on_packet_complete)
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
    on_complete: _OnPacketComplete,
) -> Generator[simpy.Event, None, None]:
    bytes_before = sequence_index * mss
    size_bytes = min(mss, config.total_bytes_to_transfer - bytes_before)
    packet = Packet(sequence_number=bytes_before, size_bytes=size_bytes)

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
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.PACKET_LOST,
                node=config.receiver,
                packet=packet,
            )
        )
        algorithm.on_packet_loss(current_time=env.now)
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
                node=config.sender,
                congestion_window_segments=algorithm.congestion_window_segments,
            )
        )
        on_complete(sequence_index, delivered=False)
    else:
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.PACKET_ACKNOWLEDGED,
                node=config.receiver,
                packet=packet,
            )
        )
        algorithm.on_ack(acknowledged_segments=size_bytes / mss, current_time=env.now)
        events.append(
            SimulationEvent(
                timestamp=env.now,
                event_type=SimulationEventType.CONGESTION_WINDOW_CHANGED,
                node=config.sender,
                congestion_window_segments=algorithm.congestion_window_segments,
            )
        )
        on_complete(sequence_index, delivered=True)
