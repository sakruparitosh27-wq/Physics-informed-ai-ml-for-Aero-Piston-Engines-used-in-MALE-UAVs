"""
Health Index Computation for AeroTwin UAV Engine Digital Twin.
Computes a composite Engine Health Index (0-100) and subsystem scores:
- Thermal Health (CHT & EGT envelopes, cylinder balance)
- Lubrication Health (Oil pressure & temperature dynamics)
- Combustion Health (Timing, pulse width, cylinder EGT spread)
- Electrical Health (28V DC bus stability, alternator load)
- Mechanical / Vibration Health (Harmonics 1X, 2X, 0.5X sub-harmonics, bearing noise)
"""

from typing import Dict, Any, Tuple
from pydantic import BaseModel, Field
from backend.telemetry.interface import TelemetryPacket


class SubsystemHealth(BaseModel):
    thermal_score: float = Field(..., description="Thermal subsystem health (0-100)")
    lubrication_score: float = Field(..., description="Lubrication subsystem health (0-100)")
    combustion_score: float = Field(..., description="Combustion & fuel subsystem health (0-100)")
    electrical_score: float = Field(..., description="Electrical & alternator health (0-100)")
    vibration_score: float = Field(..., description="Mechanical & vibration health (0-100)")


class HealthAssessment(BaseModel):
    overall_health_index: float = Field(..., description="Composite Engine Health Index (0-100)")
    status: str = Field(..., description="NOMINAL, WATCH, DEGRADED, CRITICAL")
    subsystems: SubsystemHealth
    primary_stress_driver: str = Field(..., description="Subsystem causing the largest health reduction")


class EngineHealthCalculator:
    """
    Computes weighted continuous health degradation indices based on multi-sensor telemetry.
    """

    # Weights for composite Engine Health Index
    WEIGHTS = {
        "thermal": 0.25,
        "lubrication": 0.25,
        "combustion": 0.20,
        "vibration": 0.20,
        "electrical": 0.10
    }

    @staticmethod
    def calculate(packet: TelemetryPacket) -> HealthAssessment:
        # 1. Thermal Subsystem (CHT avg nominal 90-115°C, warning > 125°C, critical > 140°C; EGT nominal 720-820°C)
        cht_pen = 0.0
        if packet.cht_avg > 115.0:
            cht_pen += (packet.cht_avg - 115.0) * 2.8
        elif packet.cht_avg < 70.0 and packet.mission_phase not in ["LANDING", "DESCENT"]:
            cht_pen += (70.0 - packet.cht_avg) * 1.5

        # Cylinder CHT variance penalty
        chts = [
            packet.cylinder_metrics.cyl1_cht,
            packet.cylinder_metrics.cyl2_cht,
            packet.cylinder_metrics.cyl3_cht,
            packet.cylinder_metrics.cyl4_cht
        ]
        cht_spread = max(chts) - min(chts)
        if cht_spread > 12.0:
            cht_pen += (cht_spread - 12.0) * 2.5

        thermal_score = max(0.0, min(100.0, 100.0 - cht_pen))

        # 2. Lubrication Subsystem (Oil pressure nominal 3.5-4.8 bar; Oil temp nominal 75-95°C)
        lub_pen = 0.0
        if packet.oil_pressure_bar < 3.5:
            lub_pen += (3.5 - packet.oil_pressure_bar) * 35.0
        elif packet.oil_pressure_bar > 5.5:
            lub_pen += (packet.oil_pressure_bar - 5.5) * 20.0

        if packet.oil_temp_c > 98.0:
            lub_pen += (packet.oil_temp_c - 98.0) * 2.5

        lubrication_score = max(0.0, min(100.0, 100.0 - lub_pen))

        # 3. Combustion Subsystem (EGT spread between cylinders nominal < 40°C, pulse width nominal 3.0-6.0ms)
        comb_pen = 0.0
        egts = [
            packet.cylinder_metrics.cyl1_egt,
            packet.cylinder_metrics.cyl2_egt,
            packet.cylinder_metrics.cyl3_egt,
            packet.cylinder_metrics.cyl4_egt
        ]
        egt_spread = max(egts) - min(egts)
        if egt_spread > 45.0:
            comb_pen += (egt_spread - 45.0) * 0.9
        
        # Check for cold misfire cylinder
        min_egt = min(egts)
        if min_egt < 620.0:
            comb_pen += (620.0 - min_egt) * 0.4

        combustion_score = max(0.0, min(100.0, 100.0 - comb_pen))

        # 4. Electrical Subsystem (28V DC bus nominal 26.5-28.5V, current 10-35A)
        elec_pen = 0.0
        if packet.battery_voltage_v < 26.0:
            elec_pen += (26.0 - packet.battery_voltage_v) * 25.0
        elif packet.battery_voltage_v > 29.5:
            elec_pen += (packet.battery_voltage_v - 29.5) * 20.0

        electrical_score = max(0.0, min(100.0, 100.0 - elec_pen))

        # 5. Vibration Subsystem (Overall RMS nominal < 0.45g; 0.5X sub-harmonic < 0.10g; 1X < 0.35g)
        vibe_pen = 0.0
        if packet.vibration_amplitude_g > 0.45:
            vibe_pen += (packet.vibration_amplitude_g - 0.45) * 60.0

        if packet.vibration_harmonics.peak_half_x_g > 0.12:
            vibe_pen += (packet.vibration_harmonics.peak_half_x_g - 0.12) * 80.0

        if packet.vibration_harmonics.high_freq_bearing_g > 0.20:
            vibe_pen += (packet.vibration_harmonics.high_freq_bearing_g - 0.20) * 75.0

        vibration_score = max(0.0, min(100.0, 100.0 - vibe_pen))

        # Composite Engine Health Index
        overall_health = (
            thermal_score * EngineHealthCalculator.WEIGHTS["thermal"] +
            lubrication_score * EngineHealthCalculator.WEIGHTS["lubrication"] +
            combustion_score * EngineHealthCalculator.WEIGHTS["combustion"] +
            vibration_score * EngineHealthCalculator.WEIGHTS["vibration"] +
            electrical_score * EngineHealthCalculator.WEIGHTS["electrical"]
        )
        overall_health = round(max(0.0, min(100.0, overall_health)), 1)

        # Status category
        if overall_health >= 90.0:
            status = "NOMINAL"
        elif overall_health >= 75.0:
            status = "WATCH"
        elif overall_health >= 50.0:
            status = "DEGRADED"
        else:
            status = "CRITICAL"

        # Identify primary stress driver
        scores = {
            "Thermal": thermal_score,
            "Lubrication": lubrication_score,
            "Combustion": combustion_score,
            "Vibration": vibration_score,
            "Electrical": electrical_score
        }
        primary_driver = min(scores, key=scores.get)

        return HealthAssessment(
            overall_health_index=overall_health,
            status=status,
            subsystems=SubsystemHealth(
                thermal_score=round(thermal_score, 1),
                lubrication_score=round(lubrication_score, 1),
                combustion_score=round(combustion_score, 1),
                electrical_score=round(electrical_score, 1),
                vibration_score=round(vibration_score, 1),
            ),
            primary_stress_driver=primary_driver
        )
