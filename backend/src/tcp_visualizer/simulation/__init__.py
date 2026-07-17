"""Simulation layer: runs a SimulationConfig to completion via SimPy.

This package depends on the domain layer and on SimPy only. It knows
nothing about FastAPI, HTTP, or any frontend — it is a pure function of
``SimulationConfig`` to ``SimulationResult``.
"""

from tcp_visualizer.simulation.engine import run_simulation

__all__ = ["run_simulation"]
