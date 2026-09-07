"""
Predictive Tactical Flight & Maintenance Advisory Generator for AeroTwin.
Produces aviation/defense standard operational directives for the GCS mission commander:
- Tactical Flight Guidance (Emergency divert, throttle reduction, glide prep, route continuation)
- Safe Flight Window & Urgency
- Airworthiness & Maintenance Directive (Inspect, Service, Calibrate, Overhaul, Monitor)
- Standard AMM Reference (e.g. DRDO UAV Tech Manual / Rotax MM)
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
from backend.ml.fault_classifier import FaultDiagnosis
from backend.ml.rul_estimator import EngineRULAssessment


class MaintenanceAdvisory(BaseModel):
    advisory_id: str
    headline: str
    action_type: str = Field(..., description="INSPECT, SERVICE, CALIBRATE, OVERHAUL, MONITOR, DIVERT_IMMEDIATE")
    recommended_timeframe: str
    tactical_flight_directive: str = Field(..., description="Actionable in-flight directive for GCS operator")
    technical_reference: str
    estimated_downtime_hours: float
    safety_criticality: str = Field(..., description="ROUTINE, ADVISORY, MISSION_CRITICAL, FLIGHT_SAFETY")
    safe_flight_window_min: float


class AdvisoryGenerator:
    """
    Generates structured in-flight tactical advisories and maintenance recommendations.
    """

    @staticmethod
    def generate(fault: FaultDiagnosis, rul: EngineRULAssessment) -> MaintenanceAdvisory:
        code = fault.fault_code
        safe_min = rul.safe_flight_time_remaining_min

        if "DRDO-FLT-01" in code or "Misfire" in fault.fault_name:  # MISFIRE
            timeframe = "Emergency In-Flight Divert" if safe_min < 15.0 else f"Safe Window: {safe_min:.1f} min"
            return MaintenanceAdvisory(
                advisory_id="ADV-MISFIRE-2605",
                headline="Ignition Circuit Failure & Cylinder Misfire Detected",
                action_type="DIVERT_IMMEDIATE" if safe_min < 15.0 else "INSPECT",
                recommended_timeframe=timeframe,
                tactical_flight_directive="Reduce throttle to 60% loiter power to minimize torque ripple and structural vibration. Execute heading divert to nearest emergency recovery airfield.",
                technical_reference="DRDO-MALE-UAV-AMM-74-10 (Ignition Systems & Harness)",
                estimated_downtime_hours=1.5,
                safety_criticality="FLIGHT_SAFETY" if safe_min < 15.0 else "MISSION_CRITICAL",
                safe_flight_window_min=safe_min
            )

        elif "DRDO-FLT-02" in code or "Injector" in fault.fault_name:  # INJECTOR ABNORMALITY
            return MaintenanceAdvisory(
                advisory_id="ADV-INJECTOR-2605",
                headline="Fuel Injection Flow Imbalance & Lean Cylinder Excursion",
                action_type="SERVICE",
                recommended_timeframe=f"Safe Flight Window: {safe_min:.1f} min",
                tactical_flight_directive="Enrich mixture setting via FADEC trim if permitted. Avoid full-throttle climb to prevent exhaust valve overheating.",
                technical_reference="DRDO-MALE-UAV-AMM-73-12 (Electronic Fuel Injection & Common Rail)",
                estimated_downtime_hours=2.0,
                safety_criticality="ADVISORY",
                safe_flight_window_min=safe_min
            )

        elif "DRDO-FLT-03" in code or "Cooling" in fault.fault_name:  # COOLING DEGRADATION
            return MaintenanceAdvisory(
                advisory_id="ADV-COOLING-2605",
                headline="Radiator Cooling Degradation — Thermal Runaway Imminent",
                action_type="DIVERT_IMMEDIATE" if safe_min < 12.0 else "INSPECT",
                recommended_timeframe=f"Safe Divert Window: {safe_min:.1f} min before CHT breach",
                tactical_flight_directive="Increase airspeed by +12 knots to maximize ram-air mass flow. Initiate descent to cooler ambient altitude layer and divert to home base.",
                technical_reference="DRDO-MALE-UAV-AMM-75-20 (Liquid & Ram-Air Cooling Systems)",
                estimated_downtime_hours=1.2,
                safety_criticality="FLIGHT_SAFETY" if safe_min < 10.0 else "MISSION_CRITICAL",
                safe_flight_window_min=safe_min
            )

        elif "DRDO-FLT-04" in code or "Lubrication" in fault.fault_name:  # LUBRICATION ISSUE
            return MaintenanceAdvisory(
                advisory_id="ADV-LUBRICATION-2605",
                headline="Low Oil Pressure & Hydrodynamic Bearing Friction Alert",
                action_type="DIVERT_IMMEDIATE",
                recommended_timeframe="Urgent — Immediate Land / Safe Window: 8.0 min",
                tactical_flight_directive="CRITICAL LUBRICATION LOSS: Trim UAV for best glide descent profile (78 kts). Execute immediate forced recovery to prevent catastrophic engine seizure in-flight.",
                technical_reference="DRDO-MALE-UAV-AMM-79-05 (Lubrication & Scavenge Circuit)",
                estimated_downtime_hours=3.5,
                safety_criticality="FLIGHT_SAFETY",
                safe_flight_window_min=safe_min
            )

        elif "DRDO-FLT-05" in code or "Sensor" in fault.fault_name:  # SENSOR DRIFT
            return MaintenanceAdvisory(
                advisory_id="ADV-SENSOR-2605",
                headline="CHT Sensor Instrumentation Bias Drift Detected",
                action_type="CALIBRATE",
                recommended_timeframe=f"Normal Sortie Permitted • {safe_min:.0f} min fuel endurance",
                tactical_flight_directive="Cross-check secondary EGT and oil telemetry. Physical engine parameters are nominal. Continue surveillance mission under cross-instrumentation cross-check.",
                technical_reference="DRDO-MALE-UAV-AMM-77-30 (Engine Indicating & Sensor Calibration)",
                estimated_downtime_hours=0.8,
                safety_criticality="ROUTINE",
                safe_flight_window_min=safe_min
            )

        elif "DRDO-FLT-08" in code or "Vibration" in fault.fault_name:  # ABNORMAL VIBRATION
            return MaintenanceAdvisory(
                advisory_id="ADV-VIBRATION-2605",
                headline="Propeller Unbalance & Reduction Gearbox Resonance",
                action_type="INSPECT",
                recommended_timeframe=f"Safe Divert Window: {safe_min:.1f} min",
                tactical_flight_directive="Adjust propeller governor RPM to avoid resonant harmonic vibration frequency (step RPM away from 4600-4900 RPM band). Plan recovery at mission waypoint.",
                technical_reference="DRDO-MALE-UAV-AMM-61-10 (Propeller Balancing & Drive Line Dynamics)",
                estimated_downtime_hours=2.5,
                safety_criticality="MISSION_CRITICAL",
                safe_flight_window_min=safe_min
            )

        elif "MULTI-FAULT" in code:  # MULTI-FAULT
            return MaintenanceAdvisory(
                advisory_id="ADV-MULTI-2605",
                headline=f"Compound Multi-Subsystem Failure ({fault.fault_name})",
                action_type="DIVERT_IMMEDIATE",
                recommended_timeframe=f"CRITICAL: Safe Window {safe_min:.1f} min",
                tactical_flight_directive="MULTIPLE CONCURRENT ANOMALIES ACTIVE: Abort mission objectives immediately. Switch autopilot to return-to-launch (RTL) mode and prepare emergency recovery descent.",
                technical_reference="DRDO-MALE-UAV-AMM-00-05 (Emergency Procedures & System Failures)",
                estimated_downtime_hours=4.0,
                safety_criticality="FLIGHT_SAFETY",
                safe_flight_window_min=safe_min
            )

        # Default Nominal Advisory
        return MaintenanceAdvisory(
            advisory_id="ADV-NOMINAL-0000",
            headline="All Engine Subsystems Operating Within Design Envelope",
            action_type="MONITOR",
            recommended_timeframe=f"Normal Sortie Duration • {safe_min:.0f} min ({safe_min/60.0:.1f} hrs) endurance remaining",
            tactical_flight_directive="Continue assigned reconnaissance / loiter flight plan. Telemetry stream nominal with zero predictive anomalies.",
            technical_reference="DRDO-MALE-UAV-AMM-05-10 (Standard Flight Envelopes & Time Limits)",
            estimated_downtime_hours=0.5,
            safety_criticality="ROUTINE",
            safe_flight_window_min=safe_min
        )
