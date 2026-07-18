"""FastAPI application entry point."""

from fastapi import FastAPI

from tcp_visualizer.api.routes.health import router as health_router
from tcp_visualizer.api.routes.simulations import router as simulations_router


def create_app() -> FastAPI:
    app = FastAPI(title="TCP Congestion Control Visualizer API")
    app.include_router(health_router)
    app.include_router(simulations_router)
    return app


app = create_app()
