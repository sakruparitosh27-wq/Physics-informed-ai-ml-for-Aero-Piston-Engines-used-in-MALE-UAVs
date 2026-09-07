"""
REST Endpoints for Mission Health Debriefs and Maintenance Reports.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def register_report_routes(app_state: Dict[str, Any]):
    @router.get("/mission_summary/{mission_id}")
    async def get_mission_summary(mission_id: str):
        recorder = app_state.get("recorder")
        if not recorder:
            raise HTTPException(status_code=500, detail="Mission recorder not initialized")
        
        frames = recorder.get_mission_telemetry(mission_id)
        if not frames:
            raise HTTPException(status_code=404, detail="No telemetry recorded for this mission")

        # Compute comprehensive statistics
        rpms = [f["telemetry"]["rpm"] for f in frames]
        chts = [f["telemetry"]["cht_avg"] for f in frames]
        egts = [f["telemetry"]["egt_avg"] for f in frames]
        oil_ps = [f["telemetry"]["oil_pressure_bar"] for f in frames]
        oil_ts = [f["telemetry"]["oil_temp_c"] for f in frames]
        vibes = [f["telemetry"]["vibration_amplitude_g"] for f in frames]
        healths = [f["health"]["overall_health_index"] for f in frames]

        # Scan for detected fault events in timeline
        fault_timeline = []
        last_fault = None
        for f in frames:
            flt_name = f.get("fault", {}).get("fault_name")
            if flt_name and flt_name != "Nominal Flight Operation" and flt_name != last_fault:
                fault_timeline.append({
                    "flight_time_sec": f["telemetry"]["flight_time_sec"],
                    "fault_name": flt_name,
                    "severity": f.get("fault", {}).get("severity"),
                    "affected_component": f.get("fault", {}).get("affected_component"),
                    "rul_at_event": f.get("rul", {}).get("overall_engine_rul_hours")
                })
                last_fault = flt_name

        latest_frame = frames[-1]

        report = {
            "mission_id": mission_id,
            "flight_duration_minutes": round((frames[-1]["telemetry"]["flight_time_sec"] - frames[0]["telemetry"]["flight_time_sec"]) / 60.0, 2),
            "data_points_logged": len(frames),
            "initial_health_index": round(healths[0], 1),
            "final_health_index": round(healths[-1], 1),
            "min_health_index": round(min(healths), 1),
            "engine_statistics": {
                "rpm": {"min": round(min(rpms), 0), "max": round(max(rpms), 0), "avg": round(float(np.mean(rpms)), 0)},
                "cht_avg_c": {"min": round(min(chts), 1), "max": round(max(chts), 1), "avg": round(float(np.mean(chts)), 1)},
                "egt_avg_c": {"min": round(min(egts), 1), "max": round(max(egts), 1), "avg": round(float(np.mean(egts)), 1)},
                "oil_pressure_bar": {"min": round(min(oil_ps), 2), "max": round(max(oil_ps), 2), "avg": round(float(np.mean(oil_ps)), 2)},
                "oil_temp_c": {"min": round(min(oil_ts), 1), "max": round(max(oil_ts), 1), "avg": round(float(np.mean(oil_ts)), 1)},
                "vibration_g": {"min": round(min(vibes), 3), "max": round(max(vibes), 3), "avg": round(float(np.mean(vibes)), 3)}
            },
            "detected_fault_events": fault_timeline,
            "airworthiness_status": "AIRWORTHY" if min(healths) > 75.0 else ("CONDITIONAL_MAINTENANCE_REQUIRED" if min(healths) > 50.0 else "UNSAFE_GROUNDED"),
            "final_maintenance_advisory": latest_frame.get("fault", {}).get("root_cause_summary")
        }

        return report
