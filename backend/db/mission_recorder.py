"""
Mission Recorder & Historical Mission Seed Generator for AeroTwin.
Records real-time live streaming sessions and generates pre-recorded black-box mission replays.
"""

import json
import time
import math
import random
from typing import Dict, Any, List, Optional
from backend.db.database import get_db_connection
from backend.telemetry.interface import TelemetryPacket, CylinderMetrics, VibrationHarmonics
from backend.telemetry.physics_simulator import PhysicsTelemetrySimulator
from backend.ml.health_index import EngineHealthCalculator
from backend.ml.anomaly_detector import EngineAnomalyDetector
from backend.ml.rul_estimator import RULEstimator
from backend.ml.fault_classifier import FaultClassifier
from backend.ml.threshold_benchmark import ThresholdBenchmarkEngine


class MissionRecorder:
    """
    Handles logging of live frames and populates pre-built mission replays.
    """

    def __init__(self):
        self.current_mission_id = f"MSN-{int(time.time())}"
        self.active_mission_name = "Live UAV Mission Stream"
        self._ensure_sample_missions()

    def start_new_live_mission(self, mission_name: str = "Live UAV Mission Stream", profile: str = "CRUISE") -> str:
        self.current_mission_id = f"MSN-{int(time.time())}"
        self.active_mission_name = mission_name
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO missions (mission_id, mission_name, profile_type, start_time, duration_sec, initial_health, final_health, status)
        VALUES (?, ?, ?, ?, 0.0, 100.0, 100.0, 'RECORDING')
        """, (self.current_mission_id, mission_name, profile, time.time()))
        conn.commit()
        conn.close()
        return self.current_mission_id

    def record_frame(self, frame_dict: Dict[str, Any]):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            p = frame_dict.get("telemetry", {})
            h = frame_dict.get("health", {})
            a = frame_dict.get("anomaly", {})
            r = frame_dict.get("rul", {})
            comp = frame_dict.get("comparison", {})
            legacy_breached = 1 if comp.get("legacy_system", {}).get("is_breached", False) else 0

            cursor.execute("""
            INSERT INTO telemetry_logs (
                mission_id, timestamp, flight_time_sec, mission_phase,
                rpm, cht_avg, egt_avg, oil_pressure_bar, oil_temp_c, fuel_flow_lph,
                vibration_amplitude_g, battery_voltage_v, health_index, anomaly_score,
                active_fault, rul_hours, legacy_breached, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                self.current_mission_id,
                p.get("timestamp", time.time()),
                p.get("flight_time_sec", 0.0),
                p.get("mission_phase", "CRUISE"),
                p.get("rpm", 4800.0),
                p.get("cht_avg", 105.0),
                p.get("egt_avg", 780.0),
                p.get("oil_pressure_bar", 4.2),
                p.get("oil_temp_c", 86.0),
                p.get("fuel_flow_lph", 18.2),
                p.get("vibration_amplitude_g", 0.32),
                p.get("battery_voltage_v", 28.2),
                h.get("overall_health_index", 100.0),
                a.get("anomaly_score", 0.0),
                p.get("active_fault", None),
                r.get("overall_engine_rul_hours", 450.0),
                legacy_breached,
                json.dumps(frame_dict)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error recording telemetry frame: {e}")

    def get_missions_list(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM missions ORDER BY start_time DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_mission_telemetry(self, mission_id: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT raw_json FROM telemetry_logs 
        WHERE mission_id = ? 
        ORDER BY flight_time_sec ASC
        """, (mission_id,))
        rows = cursor.fetchall()
        conn.close()
        return [json.loads(r["raw_json"]) for r in rows]

    def _ensure_sample_missions(self):
        """
        Pre-generate rich historical mission logs with distinct failure trajectories
        so the evaluator can immediately scrub and replay pre-recorded black-box flights.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM missions WHERE mission_id LIKE 'HIST-%'")
        count = cursor.fetchone()["cnt"]
        conn.close()

        if count >= 3:
            return  # Already seeded

        print("Generating historical mission datasets for Black Box Replay...")
        
        # Generate Mission 1: Hot Weather & Cooling Degradation (DRDO Pokhran Trial)
        self._simulate_and_save_mission(
            mission_id="HIST-MSN-01-DESERT-COOLING",
            mission_name="Desert Recon (Pokhran Sector) — Radiator Blockage",
            profile="HOT_WEATHER",
            duration_steps=120,
            fault_to_inject="COOLING_DEGRADATION",
            fault_trigger_step=35
        )

        # Generate Mission 2: High-Altitude Cruise with Cylinder Misfire (Ladakh Sector)
        self._simulate_and_save_mission(
            mission_id="HIST-MSN-02-LADAKH-MISFIRE",
            mission_name="High-Altitude Patrol (Ladakh) — Spark Breakdown Misfire",
            profile="CRUISE",
            duration_steps=120,
            fault_to_inject="MISFIRE",
            fault_trigger_step=40
        )

        # Generate Mission 3: Maritime Patrol Endurance Loiter (Nominal 8-Hour Benchmark)
        self._simulate_and_save_mission(
            mission_id="HIST-MSN-03-MARITIME-NOMINAL",
            mission_name="Maritime Surveillance — 8-Hour Loiter (Nominal Benchmark)",
            profile="LOITER",
            duration_steps=100,
            fault_to_inject=None,
            fault_trigger_step=0
        )

    def _simulate_and_save_mission(
        self,
        mission_id: str,
        mission_name: str,
        profile: str,
        duration_steps: int,
        fault_to_inject: Optional[str],
        fault_trigger_step: int
    ):
        sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
        sim.set_mission_profile(profile)
        health_calc = EngineHealthCalculator()
        anomaly_det = EngineAnomalyDetector()
        rul_est = RULEstimator()

        conn = get_db_connection()
        cursor = conn.cursor()

        start_t = time.time() - (duration_steps * 2.0)
        initial_health = 100.0
        final_health = 100.0

        for step in range(duration_steps):
            if fault_to_inject and step == fault_trigger_step:
                sim.inject_fault(fault_to_inject, ramp_rate_sec=30.0, target_severity=1.0)

            pkt = sim.update_step()
            health = health_calc.calculate(pkt)
            anomaly = anomaly_det.detect(pkt)
            rul = rul_est.estimate_rul(pkt, health)
            fault_diag = FaultClassifier.classify(pkt, anomaly)
            comp = ThresholdBenchmarkEngine.evaluate(pkt, anomaly, health, rul, fault_diag)

            if step == 0:
                initial_health = health.overall_health_index
            final_health = health.overall_health_index

            frame_payload = {
                "telemetry": pkt.model_dump(),
                "health": health.model_dump(),
                "anomaly": anomaly.model_dump(),
                "rul": rul.model_dump(),
                "fault": fault_diag.model_dump(),
                "comparison": comp.model_dump()
            }

            cursor.execute("""
            INSERT INTO telemetry_logs (
                mission_id, timestamp, flight_time_sec, mission_phase,
                rpm, cht_avg, egt_avg, oil_pressure_bar, oil_temp_c, fuel_flow_lph,
                vibration_amplitude_g, battery_voltage_v, health_index, anomaly_score,
                active_fault, rul_hours, legacy_breached, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                mission_id,
                start_t + (step * 0.5),
                pkt.flight_time_sec,
                pkt.mission_phase,
                pkt.rpm,
                pkt.cht_avg,
                pkt.egt_avg,
                pkt.oil_pressure_bar,
                pkt.oil_temp_c,
                pkt.fuel_flow_lph,
                pkt.vibration_amplitude_g,
                pkt.battery_voltage_v,
                health.overall_health_index,
                anomaly.anomaly_score,
                pkt.active_fault,
                rul.overall_engine_rul_hours,
                1 if comp.legacy_system.is_breached else 0,
                json.dumps(frame_payload)
            ))

        cursor.execute("""
        INSERT OR REPLACE INTO missions (
            mission_id, mission_name, profile_type, start_time, end_time,
            duration_sec, initial_health, final_health, primary_fault_detected, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
        """, (
            mission_id,
            mission_name,
            profile,
            start_t,
            start_t + (duration_steps * 0.5),
            duration_steps * 0.5,
            initial_health,
            final_health,
            fault_to_inject or "NONE"
        ))

        conn.commit()
        conn.close()
