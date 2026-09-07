"""
AeroTwin - MALE UAV Aero Piston Engine Digital Twin & Predictive Health Monitoring Backend.
Smart India Hackathon (SIH26054 / DRDO) Reference Solution.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from typing import Dict, Any

from backend.telemetry.physics_simulator import PhysicsTelemetrySimulator
from backend.db.mission_recorder import MissionRecorder
from backend.api.ws_stream import router as ws_router, init_stream_manager
from backend.api.faults import router as faults_router, register_fault_routes
from backend.api.missions import router as missions_router, register_mission_routes
from backend.api.reports import router as reports_router, register_report_routes

# Application state container
app_state: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize physics simulator and mission recorder
    print("Initializing AeroTwin Physics Engine and Telemetry Recorder...")
    simulator = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    simulator.start()
    recorder = MissionRecorder()
    recorder.start_new_live_mission("Live UAV Mission Stream", "CRUISE")

    app_state["simulator"] = simulator
    app_state["recorder"] = recorder

    # Register sub-routers with state
    register_fault_routes(app_state)
    register_mission_routes(app_state)
    register_report_routes(app_state)

    # Initialize WebSocket Stream Manager
    stream_mgr = init_stream_manager(simulator, recorder)
    app_state["stream_manager"] = stream_mgr

    print("AeroTwin Backend Online. Ready for WebSocket & REST telemetry consumers.")
    yield

    # Clean shutdown
    print("Shutting down AeroTwin simulator...")
    simulator.stop()


app = FastAPI(
    title="AeroTwin UAV Engine Health Monitoring API",
    description="AI-enabled Digital Twin and Prognostics for MALE UAV Aero Piston Engines (DRDO SIH26054)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server (and any local origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(ws_router)
app.include_router(faults_router)
app.include_router(missions_router)
app.include_router(reports_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ONLINE",
        "system": "AeroTwin MALE UAV Digital Twin",
        "subsystem": "FastAPI + ML Prognostics",
        "active_connections": len(app_state["stream_manager"].active_connections) if "stream_manager" in app_state else 0
    }


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
