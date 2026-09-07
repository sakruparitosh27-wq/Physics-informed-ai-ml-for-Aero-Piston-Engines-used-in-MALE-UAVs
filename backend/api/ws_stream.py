"""
Real-Time WebSocket Streaming Engine for AeroTwin UAV Engine Digital Twin.
Broadcasts 1-2 Hz synchronized telemetry, AI diagnostics, RUL predictions,
sensor validation, and legacy benchmarks.
"""

import asyncio
import json
import time
from typing import Set, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.telemetry.physics_simulator import PhysicsTelemetrySimulator
from backend.ml.health_index import EngineHealthCalculator
from backend.ml.anomaly_detector import EngineAnomalyDetector
from backend.ml.rul_estimator import RULEstimator
from backend.ml.fault_classifier import FaultClassifier
from backend.ml.advisory_generator import AdvisoryGenerator
from backend.ml.threshold_benchmark import ThresholdBenchmarkEngine
from backend.ml.sensor_validator import SensorCrossValidator
from backend.db.mission_recorder import MissionRecorder

router = APIRouter()


class StreamManager:
    """
    Coordinates real-time simulation tick, AI diagnostics, and WebSocket broadcasting.
    """

    def __init__(self, simulator: PhysicsTelemetrySimulator, recorder: MissionRecorder):
        self.simulator = simulator
        self.recorder = recorder
        self.active_connections: Set[WebSocket] = set()
        
        # Diagnostic & Prognostic Engines
        self.health_calculator = EngineHealthCalculator()
        self.anomaly_detector = EngineAnomalyDetector()
        self.rul_estimator = RULEstimator()
        self.sensor_validator = SensorCrossValidator()
        
        self.broadcast_task: Optional[asyncio.Task] = None
        self.is_streaming = False
        self.tick_interval_sec = 0.5  # 2.0 Hz streaming rate

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"WebSocket client connected. Active clients: {len(self.active_connections)}")
        
        # Start background broadcaster if not running
        if not self.is_streaming:
            self.is_streaming = True
            self.broadcast_task = asyncio.create_task(self._stream_loop())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"WebSocket client disconnected. Active clients: {len(self.active_connections)}")

    async def handle_client_message(self, data: Dict[str, Any]):
        """Handle incoming control directives from dashboard."""
        action = data.get("action")
        if action == "inject_fault":
            fault_type = data.get("fault_type", "MISFIRE")
            ramp_sec = float(data.get("ramp_rate_sec", 30.0))
            severity = float(data.get("target_severity", 1.0))
            self.simulator.inject_fault(fault_type, ramp_sec, severity)
        elif action == "clear_faults":
            self.simulator.clear_faults()
        elif action == "remove_fault":
            fault_type = data.get("fault_type", "")
            self.simulator.remove_fault(fault_type)
        elif action == "set_profile":
            profile = data.get("profile", "CRUISE")
            self.simulator.set_mission_profile(profile)

    async def _stream_loop(self):
        """Continuous background tick loop."""
        while self.is_streaming:
            try:
                # 1. Simulator physics step
                pkt = self.simulator.update_step()

                # 2. AI / ML Diagnostics & Prognostics
                health = self.health_calculator.calculate(pkt)
                anomaly = self.anomaly_detector.detect(pkt)
                rul = self.rul_estimator.estimate_rul(pkt, health)
                fault = FaultClassifier.classify(pkt, anomaly)
                advisory = AdvisoryGenerator.generate(fault, rul)
                comp = ThresholdBenchmarkEngine.evaluate(pkt, anomaly, health, rul, fault)
                sensor_check = self.sensor_validator.validate(pkt)

                # 3. Assemble unified payload
                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "telemetry": pkt.model_dump(),
                    "health": health.model_dump(),
                    "anomaly": anomaly.model_dump(),
                    "rul": rul.model_dump(),
                    "fault": fault.model_dump(),
                    "advisory": advisory.model_dump(),
                    "comparison": comp.model_dump(),
                    "sensor_validation": sensor_check.model_dump(),
                    "server_time": time.time()
                }

                # 4. Record to mission database
                self.recorder.record_frame(payload)

                # 5. Broadcast to connected WebSocket clients
                if self.active_connections:
                    message_str = json.dumps(payload)
                    dead_sockets = set()
                    for ws in list(self.active_connections):
                        try:
                            await ws.send_text(message_str)
                        except Exception:
                            dead_sockets.add(ws)
                    
                    for ws in dead_sockets:
                        self.active_connections.discard(ws)

                await asyncio.sleep(self.tick_interval_sec)

            except Exception as e:
                print(f"Error in stream loop: {e}")
                await asyncio.sleep(1.0)


# Module-level instance holder
stream_manager_instance: Optional[StreamManager] = None


def init_stream_manager(simulator: PhysicsTelemetrySimulator, recorder: MissionRecorder) -> StreamManager:
    global stream_manager_instance
    stream_manager_instance = StreamManager(simulator, recorder)
    return stream_manager_instance


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    if not stream_manager_instance:
        await websocket.close()
        return

    await stream_manager_instance.connect(websocket)
    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
                await stream_manager_instance.handle_client_message(msg)
            except Exception as parse_err:
                print(f"Failed to parse incoming WS message: {parse_err}")
    except WebSocketDisconnect:
        stream_manager_instance.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        stream_manager_instance.disconnect(websocket)
