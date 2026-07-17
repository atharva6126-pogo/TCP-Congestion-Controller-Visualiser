# Architecture

## High-Level Design

Frontend Dashboard
    ↓
FastAPI REST API
    ↓
Simulation Controller
    ↓
TCP Algorithm Engine
    ↓
Statistics Engine
    ↓
Visualization Components

## Components

### Frontend

- Dashboard for simulation controls
- Real-time graphs and charts
- Packet flow animations
- Algorithm comparison views

### Backend

- FastAPI server
- Simulation controller
- TCP algorithm implementations
- Statistics generator

### Simulation Layer

- Packet transmission modeling
- RTT and delay simulation
- Packet loss simulation
- Congestion window updates

## Data Flow

1. User selects network conditions and algorithm.
2. Frontend sends configuration to backend.
3. Backend runs simulation and collects statistics.
4. Results are returned to frontend.
5. Frontend updates graphs and animations.