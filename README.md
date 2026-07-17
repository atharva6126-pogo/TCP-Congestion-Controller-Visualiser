# TCP Congestion Control Visualizer

An interactive educational simulator for understanding how TCP congestion control
algorithms (Tahoe, Reno, New Reno, Cubic, and eventually BBR) respond to changing
network conditions — packet loss, latency, and bandwidth constraints.

The backend runs a deterministic, seeded discrete-event simulation of a full
transmission and returns the complete timeline; the frontend replays that
timeline as interactive congestion-window graphs and packet-flow animations.

## Status

Early development. See `docs/planning/` for the project's architecture,
roadmap, and task backlog.

## Project Layout

- `backend/` — FastAPI simulation API (Python, `src` layout)
- `frontend/` — React + TypeScript dashboard (not yet scaffolded)
- `docs/` — planning and reference documentation
