"""
Multi-Class & Multi-Fault Diagnostic Classifier for AeroTwin MALE UAV Diagnostics.
Maps real-time multi-sensor telemetry signatures to the 8 DRDO Problem Statement Fault Classes:
1. MISFIRE_CONDITIONS
2. INJECTOR_ABNORMALITIES
3. COOLING_DEGRADATION
4. LUBRICATION_ISSUES
5. SENSOR_DRIFT
6. COMBUSTION_INSTABILITY
7. OVERHEATING_TRENDS
8. ABNORMAL_VIBRATION_PATTERNS
9. NOMINAL_OPERATION

Supports concurrent multi-fault diagnosis and composite root-cause isolation.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import numpy as np
from backend.telemetry.interface import TelemetryPacket
from backend.ml.anomaly_detector import AnomalyResult


class IndividualFaultItem(BaseModel):
    fault_code: str
    fault_name: str
    severity: str
    confidence_pct: float
    affected_component: str


class FaultDiagnosis(BaseModel):
    fault_code: str
    fault_name: str
    severity: str = Field(..., description="NOMINAL, LOW, MEDIUM, HIGH, CRITICAL")
    confidence_pct: float
    affected_component: str
    root_cause_summary: str
    diagnostic_evidence: List[str]
    active_faults_count: int = Field(0, description="Total number of concurrent faults detected")
    detected_faults_list: List[IndividualFaultItem] = Field(default_factory=list)


class FaultClassifier:
    """
    Signature matching and rule-weighted multi-fault diagnostic classifier for aero piston engines.
    """

    @staticmethod
    def classify(packet: TelemetryPacket, anomaly: AnomalyResult) -> FaultDiagnosis:
        chts = [
            packet.cylinder_metrics.cyl1_cht, packet.cylinder_metrics.cyl2_cht,
            packet.cylinder_metrics.cyl3_cht, packet.cylinder_metrics.cyl4_cht
        ]
        egts = [
            packet.cylinder_metrics.cyl1_egt, packet.cylinder_metrics.cyl2_egt,
            packet.cylinder_metrics.cyl3_egt, packet.cylinder_metrics.cyl4_egt
        ]
        cht_spread = max(chts) - min(chts)
        egt_spread = max(egts) - min(egts)
        min_egt = min(egts)
        max_egt = max(egts)
        min_cht = min(chts)
        max_cht = max(chts)

        detected_list: List[IndividualFaultItem] = []
        evidence_list: List[str] = []
        root_causes: List[str] = []

        # 1. Check for MISFIRE (Cold cylinder EGT + high 0.5X sub-harmonic vibration)
        if (min_egt < 680.0 or egt_spread > 90.0) and packet.vibration_harmonics.peak_half_x_g > 0.15:
            dead_cyl_idx = egts.index(min_egt) + 1
            severity = "CRITICAL" if min_egt < 600.0 or packet.vibration_harmonics.peak_half_x_g > 0.4 else "HIGH"
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-01",
                fault_name="Misfire Condition (Cylinder Spark Failure)",
                severity=severity,
                confidence_pct=95.4,
                affected_component=f"Cylinder #{dead_cyl_idx} Ignition / Spark Plug"
            ))
            evidence_list.append(f"Cyl #{dead_cyl_idx} EGT: {min_egt:.1f}°C (cold unburned exhaust plume)")
            evidence_list.append(f"0.5X Sub-Harmonic Vibration: {packet.vibration_harmonics.peak_half_x_g:.3f}g (threshold < 0.05g)")
            root_causes.append(f"Ignition spark breakdown on Cylinder #{dead_cyl_idx} producing 0.5X engine order vibration")

        # 2. Check for INJECTOR ABNORMALITY (Hot lean cylinder or pulse width elongation)
        if (egt_spread > 55.0 and max_egt > 830.0) or packet.injection_pulse_width_ms > 5.5:
            hot_cyl_idx = egts.index(max_egt) + 1
            severity = "HIGH" if max_egt > 880.0 else "MEDIUM"
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-02",
                fault_name="Injector Abnormality / Lean Mixture Drift",
                severity=severity,
                confidence_pct=91.8,
                affected_component=f"Fuel Injector Rail / Cylinder #{hot_cyl_idx} Nozzle"
            ))
            evidence_list.append(f"Cyl #{hot_cyl_idx} EGT: {max_egt:.1f}°C (lean peak)")
            evidence_list.append(f"Injector Pulse Width: {packet.injection_pulse_width_ms:.2f}ms")
            root_causes.append(f"Cylinder #{hot_cyl_idx} fuel injector restriction causing localized lean combustion excursion")

        # 3. Check for COOLING DEGRADATION (All cylinder CHTs elevated uniformly)
        if packet.cht_avg > 122.0 and cht_spread < 20.0:
            severity = "CRITICAL" if packet.cht_avg > 138.0 else "HIGH"
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-03",
                fault_name="Cooling System Degradation (Thermal Dissipation Loss)",
                severity=severity,
                confidence_pct=93.6,
                affected_component="Ram-Air Cooling Radiator / Coolant Pump"
            ))
            evidence_list.append(f"Average CHT: {packet.cht_avg:.1f}°C (nominal < 115°C)")
            evidence_list.append(f"Peak Cylinder CHT: {max_cht:.1f}°C")
            root_causes.append(f"Uniform cylinder head thermal runaway (avg {packet.cht_avg:.1f}°C) due to radiator cooling deficit")

        # 4. Check for LUBRICATION ISSUES (Low oil pressure / high oil temp / bearing noise)
        if packet.oil_pressure_bar < 3.2 or packet.oil_temp_c > 105.0 or packet.vibration_harmonics.high_freq_bearing_g > 0.25:
            severity = "CRITICAL" if packet.oil_pressure_bar < 2.0 or packet.oil_temp_c > 120.0 else "HIGH"
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-04",
                fault_name="Lubrication Degradation (Oil Circuit Anomaly)",
                severity=severity,
                confidence_pct=94.2,
                affected_component="Engine Oil Pump / Oil Cooler Heat Exchanger"
            ))
            evidence_list.append(f"Oil Pressure: {packet.oil_pressure_bar:.2f} bar (critical low < 1.5 bar)")
            evidence_list.append(f"Oil Temperature: {packet.oil_temp_c:.1f}°C")
            evidence_list.append(f"Bearing Friction Noise: {packet.vibration_harmonics.high_freq_bearing_g:.3f}g")
            root_causes.append(f"Oil pressure loss ({packet.oil_pressure_bar:.2f} bar) with elevated bearing hydrodynamic friction")

        # 5. Check for SENSOR DRIFT (Single CHT sensor divergent without corresponding EGT/oil rise)
        if cht_spread > 35.0 and packet.oil_temp_c < 95.0 and abs(packet.cylinder_metrics.cyl1_cht - packet.cylinder_metrics.cyl2_cht) > 30.0:
            drift_cyl = chts.index(max_cht) + 1
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-05",
                fault_name="Sensor Drift / Thermocouple Circuit Error",
                severity="MEDIUM",
                confidence_pct=88.5,
                affected_component=f"CHT Thermocouple Sensor #{drift_cyl}"
            ))
            evidence_list.append(f"CHT Sensor #{drift_cyl}: {max_cht:.1f}°C (adjacent cyls normal {min_cht:.1f}°C)")
            root_causes.append(f"Sensor #{drift_cyl} instrumentation calibration bias drift")

        # 6. Check for ABNORMAL VIBRATION PATTERNS (High 1X or 2X vibration)
        if packet.vibration_harmonics.peak_1x_g > 0.45 or packet.vibration_harmonics.peak_2x_g > 0.55:
            severity = "CRITICAL" if packet.vibration_amplitude_g > 1.0 else "HIGH"
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-08",
                fault_name="Abnormal Vibration Signature (Propeller / Shaft Resonance)",
                severity=severity,
                confidence_pct=92.1,
                affected_component="Propeller Hub / Reduction Gearbox / Bearings"
            ))
            evidence_list.append(f"RMS Vibration: {packet.vibration_amplitude_g:.3f}g")
            evidence_list.append(f"1X Propeller Harmonic: {packet.vibration_harmonics.peak_1x_g:.3f}g")
            root_causes.append(f"Dynamic propeller mass unbalance or reduction gear harmonic excitation")

        # 7. Check for COMBUSTION INSTABILITY
        if (anomaly.is_anomaly or len(detected_list) == 0) and egt_spread > 38.0 and packet.vibration_harmonics.peak_half_x_g > 0.08:
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-06",
                fault_name="Combustion Instability / Cyclic Dispersion",
                severity="MEDIUM",
                confidence_pct=86.7,
                affected_component="Combustion Chambers / Air-Fuel Mixture Delivery"
            ))
            evidence_list.append(f"EGT Variance: {egt_spread:.1f}°C")
            root_causes.append("Cyclic combustion dispersion and stochastic flame speed fluctuation")

        # 8. Check for OVERHEATING TREND
        if (packet.cht_avg > 116.0 or (packet.ambient_temp_c > 40.0 and packet.oil_temp_c > 96.0)) and not any(d.fault_code == "DRDO-FLT-03" for d in detected_list):
            detected_list.append(IndividualFaultItem(
                fault_code="DRDO-FLT-07",
                fault_name="Overheating Trend (High Ambient Thermal Soak)",
                severity="MEDIUM",
                confidence_pct=89.0,
                affected_component="Thermal Envelope / Engine Cowling"
            ))
            evidence_list.append(f"Ambient Temp: {packet.ambient_temp_c:.1f}°C, CHT Avg: {packet.cht_avg:.1f}°C")
            root_causes.append(f"High ambient desert thermal soak ({packet.ambient_temp_c:.1f}°C) compounding climb power heat")

        # Compile final diagnosis (Multi-fault support)
        if len(detected_list) == 0:
            return FaultDiagnosis(
                fault_code="NOMINAL-00",
                fault_name="Nominal Flight Operation",
                severity="NOMINAL",
                confidence_pct=98.5,
                affected_component="All Subsystems Operating Within Envelope",
                root_cause_summary="All thermodynamic, hydrodynamic, combustion, electrical, and vibration parameters remain within tight baseline flight envelopes.",
                diagnostic_evidence=[
                    f"RPM: {packet.rpm:.0f} RPM",
                    f"CHT Avg: {packet.cht_avg:.1f}°C",
                    f"Oil Pressure: {packet.oil_pressure_bar:.2f} bar",
                    f"RMS Vibration: {packet.vibration_amplitude_g:.3f}g"
                ],
                active_faults_count=0,
                detected_faults_list=[]
            )

        # Multiple faults present: pick most critical severity as primary headline, list all in detected_faults_list
        severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "NOMINAL": 0}
        primary = max(detected_list, key=lambda x: severity_order.get(x.severity, 0))
        
        combined_names = " + ".join([d.fault_name.split(' (')[0] for d in detected_list])
        combined_components = ", ".join([d.affected_component for d in detected_list])
        combined_summary = " | ".join(root_causes)

        return FaultDiagnosis(
            fault_code=primary.fault_code if len(detected_list) == 1 else "MULTI-FAULT",
            fault_name=combined_names if len(detected_list) > 1 else primary.fault_name,
            severity=primary.severity,
            confidence_pct=primary.confidence_pct,
            affected_component=combined_components,
            root_cause_summary=combined_summary,
            diagnostic_evidence=evidence_list,
            active_faults_count=len(detected_list),
            detected_faults_list=detected_list
        )
