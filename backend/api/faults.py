"""
REST Endpoints for Fault Injection and Simulation Control in AeroTwin.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/faults", tags=["Faults"])


class FaultInjectionRequest(BaseModel):
    fault_type: str = Field(..., description="MISFIRE, INJECTOR_ABNORMALITY, COOLING_DEGRADATION, LUBRICATION_ISSUE, SENSOR_DRIFT, COMBUSTION_INSTABILITY, OVERHEATING_TREND, ABNORMAL_VIBRATION")
    ramp_rate_sec: float = Field(30.0, description="Ramp-up duration in seconds (5.0 to 300.0)")
    target_severity: float = Field(1.0, description="Severity target (0.1 to 1.0)")


class FaultPresetInfo(BaseModel):
    id: str
    name: str
    category: str
    description: str
    drdo_code: str
    primary_sensor_symptoms: List[str]


AVAILABLE_FAULTS = [
    FaultPresetInfo(
        id="MISFIRE",
        name="Cylinder Spark Misfire",
        category="Ignition & Combustion",
        description="Cylinder #2 ignition spark breakdown causing cold exhaust plume and heavy 0.5X engine order vibration.",
        drdo_code="DRDO-FLT-01",
        primary_sensor_symptoms=["Cyl #2 EGT drop (-220°C)", "0.5X Sub-harmonic surge (> 0.5g)", "Unburned fuel waste (+12%)"]
    ),
    FaultPresetInfo(
        id="INJECTOR_ABNORMALITY",
        name="Injector Flow Restriction",
        category="Fuel Injection",
        description="Cylinder #3 high-pressure fuel injector nozzle restriction causing localized lean mixture and high EGT peak.",
        drdo_code="DRDO-FLT-02",
        primary_sensor_symptoms=["Cyl #3 EGT spike (+135°C)", "Pulse width widening (+1.6ms)", "Acoustic combustion ripple"]
    ),
    FaultPresetInfo(
        id="COOLING_DEGRADATION",
        name="Cooling System Degradation",
        category="Thermal Management",
        description="Ram-air radiator air blockage or coolant pump impeller cavitation causing thermal runaway across all cylinders.",
        drdo_code="DRDO-FLT-03",
        primary_sensor_symptoms=["Uniform CHT rise (+48°C)", "Oil temp rise (+32°C)", "Exponential thermal gradient"]
    ),
    FaultPresetInfo(
        id="LUBRICATION_ISSUE",
        name="Lubrication Oil Pressure Loss",
        category="Lubrication Circuit",
        description="Oil pump pressure relief valve sticking or oil circuit micro-leak leading to hydrodynamic bearing friction.",
        drdo_code="DRDO-FLT-04",
        primary_sensor_symptoms=["Oil pressure collapse (1.4 bar)", "Oil temp elevation (125°C)", "High-freq bearing noise"]
    ),
    FaultPresetInfo(
        id="SENSOR_DRIFT",
        name="Sensor Calibration Bias Drift",
        category="Instrumentation",
        description="Thermocouple instrumentation amplifier drift reporting false high CHT without physical core overheating.",
        drdo_code="DRDO-FLT-05",
        primary_sensor_symptoms=["Single CHT drift (+55°C)", "Cross-sensor covariance anomaly", "Normal oil & EGT baseline"]
    ),
    FaultPresetInfo(
        id="COMBUSTION_INSTABILITY",
        name="Combustion Instability & Dispersion",
        category="Combustion Dynamics",
        description="Stochastic flame propagation variance and cyclic air-fuel dispersion.",
        drdo_code="DRDO-FLT-06",
        primary_sensor_symptoms=["High EGT cyclic jitter (+/- 45°C)", "Manifold pressure ripple", "Torque ripple"]
    ),
    FaultPresetInfo(
        id="OVERHEATING_TREND",
        name="High Ambient Heat-Soak",
        category="Thermal Management",
        description="Desert environment high ambient air operation (46°C) combined with sustained climb power load.",
        drdo_code="DRDO-FLT-07",
        primary_sensor_symptoms=["Elevated baseline CHT (135°C)", "Oil temperature accumulation (112°C)", "Reduced air density"]
    ),
    FaultPresetInfo(
        id="ABNORMAL_VIBRATION",
        name="Propeller Unbalance & Gear Resonance",
        category="Mechanical & Driveline",
        description="Dynamic propeller mass unbalance or reduction gearbox harmonic resonance.",
        drdo_code="DRDO-FLT-08",
        primary_sensor_symptoms=["1X Propeller harmonic (> 1.4g)", "2X Engine order resonance", "RMS vibration breach"]
    )
]


class FaultRemoveRequest(BaseModel):
    fault_type: str = Field(..., description="Fault type to remove (e.g. MISFIRE)")


def register_fault_routes(app_state: Dict[str, Any]):
    @router.get("/list", response_model=List[FaultPresetInfo])
    async def list_faults():
        return AVAILABLE_FAULTS

    @router.post("/inject")
    async def inject_fault(req: FaultInjectionRequest):
        sim = app_state.get("simulator")
        if not sim:
            raise HTTPException(status_code=500, detail="Simulator instance not initialized")
        
        sim.inject_fault(req.fault_type, req.ramp_rate_sec, req.target_severity)
        return {
            "status": "SUCCESS",
            "message": f"Injected fault {req.fault_type} with ramp {req.ramp_rate_sec}s and severity {req.target_severity}"
        }

    @router.post("/remove")
    async def remove_fault(req: FaultRemoveRequest):
        sim = app_state.get("simulator")
        if not sim:
            raise HTTPException(status_code=500, detail="Simulator instance not initialized")
        
        sim.remove_fault(req.fault_type)
        return {"status": "SUCCESS", "message": f"Fault {req.fault_type} removed."}

    @router.post("/clear")
    async def clear_faults():
        sim = app_state.get("simulator")
        if not sim:
            raise HTTPException(status_code=500, detail="Simulator instance not initialized")
        
        sim.clear_faults()
        return {"status": "SUCCESS", "message": "All injected faults cleared. Returning to nominal operation."}
