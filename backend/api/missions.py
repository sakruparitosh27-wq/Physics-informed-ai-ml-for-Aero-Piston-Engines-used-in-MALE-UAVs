"""
REST Endpoints for Missions, Flight Profiles, and Black-Box Telemetry Replay in AeroTwin.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/missions", tags=["Missions"])


class MissionProfileInfo(BaseModel):
    id: str
    name: str
    description: str
    target_rpm: float
    target_alt_m: float
    ambient_temp_c: float


MISSION_PROFILES = [
    MissionProfileInfo(
        id="TAKEOFF",
        name="Maximum Power Takeoff",
        description="Full throttle (98%) high torque climb-out with high manifold pressure.",
        target_rpm=5500.0,
        target_alt_m=200.0,
        ambient_temp_c=25.0
    ),
    MissionProfileInfo(
        id="CLIMB",
        name="Standard Climb to Altitude",
        description="85% climb power setting with continuous thermal accumulation.",
        target_rpm=5200.0,
        target_alt_m=2500.0,
        ambient_temp_c=12.0
    ),
    MissionProfileInfo(
        id="CRUISE",
        name="High-Altitude Cruise",
        description="Steady-state surveillance cruise at 4,000m altitude.",
        target_rpm=4800.0,
        target_alt_m=4000.0,
        ambient_temp_c=0.0
    ),
    MissionProfileInfo(
        id="LOITER",
        name="Endurance Loiter (18+ Hours)",
        description="Lean-burn maximum endurance setting for extended battlefield surveillance.",
        target_rpm=4200.0,
        target_alt_m=4500.0,
        ambient_temp_c=-5.0
    ),
    MissionProfileInfo(
        id="HOT_WEATHER",
        name="Hot Weather Desert Operations",
        description="Simulation of DRDO high ambient thermal trials (46°C ambient in Pokhran).",
        target_rpm=4900.0,
        target_alt_m=1500.0,
        ambient_temp_c=46.0
    ),
    MissionProfileInfo(
        id="RAPID_THROTTLE",
        name="Tactical Throttle Transitions",
        description="Rapid cyclic throttle adjustments testing transient response and governor stability.",
        target_rpm=5000.0,
        target_alt_m=3000.0,
        ambient_temp_c=15.0
    ),
    MissionProfileInfo(
        id="DESCENT",
        name="Tactical Low-Power Descent",
        description="Low throttle descent with rapid ram-air cooling.",
        target_rpm=3800.0,
        target_alt_m=1200.0,
        ambient_temp_c=18.0
    ),
    MissionProfileInfo(
        id="LANDING",
        name="Approach & Touchdown",
        description="Final approach power setting and ground roll.",
        target_rpm=3200.0,
        target_alt_m=50.0,
        ambient_temp_c=26.0
    )
]


def register_mission_routes(app_state: Dict[str, Any]):
    @router.get("/profiles", response_model=List[MissionProfileInfo])
    async def get_profiles():
        return MISSION_PROFILES

    @router.post("/set_profile")
    async def set_profile(profile_id: str = Query(..., description="Profile ID (e.g. CRUISE, HOT_WEATHER)")):
        sim = app_state.get("simulator")
        if not sim:
            raise HTTPException(status_code=500, detail="Simulator instance not initialized")
        
        sim.set_mission_profile(profile_id)
        return {"status": "SUCCESS", "current_profile": profile_id}

    @router.get("/history")
    async def get_missions():
        recorder = app_state.get("recorder")
        if not recorder:
            raise HTTPException(status_code=500, detail="Mission recorder not initialized")
        return recorder.get_missions_list()

    @router.get("/replay/{mission_id}")
    async def get_replay_telemetry(mission_id: str):
        recorder = app_state.get("recorder")
        if not recorder:
            raise HTTPException(status_code=500, detail="Mission recorder not initialized")
        
        telemetry_frames = recorder.get_mission_telemetry(mission_id)
        if not telemetry_frames:
            raise HTTPException(status_code=404, detail="Mission telemetry not found")
        
        return {
            "mission_id": mission_id,
            "total_frames": len(telemetry_frames),
            "frames": telemetry_frames
        }

    @router.post("/whatif")
    async def whatif_simulation(
        mission_id: str = Query(..., description="Past mission ID to base the simulation on"),
        fault_type: str = Query(..., description="Fault to inject (e.g. MISFIRE)"),
        inject_at_sec: float = Query(0.0, description="Flight time (seconds) at which to inject the fault"),
        ramp_sec: float = Query(30.0, description="Fault ramp-up duration"),
        severity: float = Query(1.0, description="Fault severity 0.1-1.0")
    ):
        """
        What-If Fault Replay: Load a past mission's flight conditions at a given time,
        inject a fault, re-simulate from that point forward, and return the AI's
        diagnosis of what would have happened.
        """
        from backend.telemetry.physics_simulator import PhysicsTelemetrySimulator
        from backend.ml.health_index import EngineHealthCalculator
        from backend.ml.anomaly_detector import EngineAnomalyDetector
        from backend.ml.rul_estimator import RULEstimator
        from backend.ml.fault_classifier import FaultClassifier
        from backend.ml.advisory_generator import AdvisoryGenerator
        from backend.ml.sensor_validator import SensorCrossValidator

        recorder = app_state.get("recorder")
        if not recorder:
            raise HTTPException(status_code=500, detail="Recorder not initialized")

        # Load past mission frames
        frames = recorder.get_mission_telemetry(mission_id)
        if not frames:
            raise HTTPException(status_code=404, detail="Mission not found")

        # Find the frame closest to inject_at_sec
        inject_idx = 0
        for i, fr in enumerate(frames):
            t = fr.get("telemetry", {}).get("flight_time_sec", 0.0)
            if t >= inject_at_sec:
                inject_idx = i
                break

        # Create a fresh simulator and seed it with the past mission's conditions at that point
        base_telem = frames[inject_idx].get("telemetry", {})
        sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
        sim.start()
        # Set simulator state from past mission snapshot
        sim.rpm = base_telem.get("rpm", 4800.0)
        sim.throttle_pct = base_telem.get("throttle_pct", 70.0)
        sim.manifold_pressure_inhg = base_telem.get("manifold_pressure_inhg", 28.0)
        sim.airspeed_knots = base_telem.get("airspeed_knots", 95.0)
        sim.altitude_m = base_telem.get("altitude_m", 4000.0)
        sim.ambient_temp_c = base_telem.get("ambient_temp_c", 0.0)
        sim.oil_pressure_bar = base_telem.get("oil_pressure_bar", 4.2)
        sim.oil_temp_c = base_telem.get("oil_temp_c", 86.0)
        sim.fuel_flow_lph = base_telem.get("fuel_flow_lph", 18.2)
        sim.battery_voltage_v = base_telem.get("battery_voltage_v", 28.2)
        sim.flight_time = base_telem.get("flight_time_sec", 0.0)
        phase = base_telem.get("mission_phase", "CRUISE")
        sim.set_mission_profile(phase)

        cyl = base_telem.get("cylinder_metrics", {})
        sim.cyl_cht = [cyl.get("cyl1_cht", 105.0), cyl.get("cyl2_cht", 105.0),
                       cyl.get("cyl3_cht", 105.0), cyl.get("cyl4_cht", 105.0)]
        sim.cyl_egt = [cyl.get("cyl1_egt", 780.0), cyl.get("cyl2_egt", 780.0),
                       cyl.get("cyl3_egt", 780.0), cyl.get("cyl4_egt", 780.0)]

        # Inject the fault
        sim.inject_fault(fault_type, ramp_sec, severity)

        # Run simulation forward for 60 seconds (120 steps at 2Hz)
        health_calc = EngineHealthCalculator()
        anomaly_det = EngineAnomalyDetector()
        rul_est = RULEstimator()
        sensor_val = SensorCrossValidator()
        whatif_frames = []

        for step in range(120):
            pkt = sim.update_step()
            health = health_calc.calculate(pkt)
            anomaly = anomaly_det.detect(pkt)
            rul = rul_est.estimate_rul(pkt, health)
            fault_diag = FaultClassifier.classify(pkt, anomaly)
            advisory = AdvisoryGenerator.generate(fault_diag, rul)
            sensor_check = sensor_val.validate(pkt)

            whatif_frames.append({
                "step": step,
                "flight_time_sec": round(pkt.flight_time_sec, 1),
                "health_index": round(health.overall_health_index, 1),
                "health_status": health.status,
                "anomaly_score": round(anomaly.anomaly_score, 3),
                "is_anomaly": anomaly.is_anomaly,
                "rul_hours": round(rul.overall_engine_rul_hours, 1),
                "safe_flight_min": round(rul.safe_flight_time_remaining_min, 1),
                "is_emergency": rul.is_emergency_divert_required,
                "fault_code": fault_diag.fault_code,
                "fault_name": fault_diag.fault_name,
                "severity": fault_diag.severity,
                "advisory_headline": advisory.headline,
                "tactical_directive": advisory.tactical_flight_directive,
                "sensor_valid": sensor_check.all_sensors_valid,
            })

        # Summarize what-if outcome
        final = whatif_frames[-1]
        first_anomaly_step = next((f for f in whatif_frames if f["is_anomaly"]), None)
        first_anomaly_sec = first_anomaly_step["flight_time_sec"] if first_anomaly_step else None

        return {
            "mission_id": mission_id,
            "whatif_fault": fault_type,
            "inject_at_flight_sec": inject_at_sec,
            "simulation_duration_sec": 60.0,
            "total_steps": len(whatif_frames),
            "outcome_summary": {
                "final_health_index": final["health_index"],
                "final_health_status": final["health_status"],
                "final_rul_hours": final["rul_hours"],
                "final_safe_flight_min": final["safe_flight_min"],
                "is_emergency_at_end": final["is_emergency"],
                "detected_fault": final["fault_name"],
                "ai_first_anomaly_at_sec": first_anomaly_sec,
                "tactical_recommendation": final["tactical_directive"],
            },
            "frames": whatif_frames
        }
