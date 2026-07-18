# TCP Congestion Control Visualizer

An interactive educational simulator for understanding how TCP congestion control
algorithms (Tahoe, Reno, New Reno, and Cubic) respond to changing network
conditions — packet loss, latency, and bandwidth constraints.

The backend runs a deterministic, seeded discrete-event simulation of a full
transmission and returns the complete timeline; the frontend replays that
timeline as interactive congestion-window graphs and packet-flow animations.

Because a run is fully determined by its configuration and seed, any run is
reproducible — and the URL carries both, so any run is also shareable.

## Project Layout

- `backend/` — FastAPI simulation API (Python, `src` layout)
- `frontend/` — React + TypeScript workspace (Vite, Tailwind, Recharts)
- `docs/` — planning, design, and architecture decision records

## Running with Docker

The UI is served by nginx, which proxies `/api` to the API over the compose
network, so the browser sees a single origin and the service needs no CORS
configuration.

```bash
docker compose up --build
# http://localhost:8080
```

## Running locally

Backend (Python 3.11+):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
uvicorn tcp_visualizer.main:app --reload
```

Frontend (Node 22+), with the API already running on port 8000:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend, mirroring the nginx rule.

## Checks

These are the same checks CI runs.

```bash
# backend
cd backend
black --check src tests
mypy --strict src tests
pytest

# frontend
cd frontend
npm run format:check
npm run lint
npm run build        # tsc -b && vite build
```
