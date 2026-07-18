"""Simulation endpoint."""

from fastapi import APIRouter, HTTPException

from tcp_visualizer.algorithms import create_algorithm
from tcp_visualizer.api.schemas import SimulationRequest, SimulationResponse, to_simulation_response
from tcp_visualizer.domain import DomainError, Link, Node, NodeRole, SimulationConfig
from tcp_visualizer.simulation import run_simulation
from tcp_visualizer.statistics import StatisticsCollector

router = APIRouter(tags=["simulations"])


@router.post("/simulations", response_model=SimulationResponse)
def create_simulation(request: SimulationRequest) -> SimulationResponse:
    """Run one simulation to completion and return its timeline and statistics.

    The run is fully determined by the request: the same body always
    produces the same timeline, which is what makes a run shareable and
    comparable across algorithms.
    """
    try:
        config = SimulationConfig(
            seed=request.seed,
            sender=Node(name="client", role=NodeRole.SENDER),
            receiver=Node(name="server", role=NodeRole.RECEIVER),
            link=Link(
                bandwidth_bytes_per_second=request.bandwidth_bytes_per_second,
                latency_ms=request.latency_ms,
                loss_probability=request.loss_probability,
            ),
            algorithm=create_algorithm(request.algorithm),
            total_bytes_to_transfer=request.total_bytes_to_transfer,
            maximum_segment_size_bytes=request.maximum_segment_size_bytes,
        )
    except DomainError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    result = run_simulation(config)
    statistics = StatisticsCollector().collect(result)
    return to_simulation_response(request, result, statistics)
