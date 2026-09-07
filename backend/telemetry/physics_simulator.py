"""
Physics-Informed Aero Piston Engine Telemetry Simulator for AeroTwin (MALE UAV).
Simulates a 4-cylinder, 4-stroke turbocharged aero piston engine (Rotax 914 / Austro AE300 / DRDO TAPAS-BH-201 class).

Physics Modeling Principles:
1. Thermodynamic Power & Fuel Consumption:
   - Power = MAP * RPM * Displacement * VolumetricEfficiency * ThermalEfficiency
   - Fuel Mass Flow = Air Mass Flow / Target AFR (Stoichiometric lambda ~ 1.0 or enriched)
2. Heat Generation & Dissipation:
   - d(CHT)/dt = (Q_combustion - Q_cooling - Q_ambient) / C_thermal
   - Q_cooling proportional to ram-air velocity (airspeed) and radiator effectiveness
3. Lubrication Hydrodynamics:
   - Oil Pressure = P_pump(RPM) * Viscosity(T_oil) - DeltaP_losses
4. Vibration Harmonic Orders:
   - 1X (Propeller / Crankshaft fundamental speed)
   - 2X (Cylinder firing frequency for 4-cyl)
   - 0.5X (Cylinder imbalance / Single-cylinder misfire sub-harmonic)
   - High-Frequency Broadband (Bearing friction, turbocharger)
"""

import time
import math
import random
from typing import Dict, Any, Optional
from backend.telemetry.interface import TelemetrySource, TelemetryPacket, CylinderMetrics, VibrationHarmonics


class PhysicsTelemetrySimulator(TelemetrySource):
    """
    Simulates realistic aero piston engine telemetry with correlated thermodynamics,
    flight profiles, and 8 injectable progressive degradation failure modes.
    """

    MISSION_PRESETS = {
        "TAKEOFF": {
            "target_rpm": 5500.0,
            "target_throttle": 98.0,
            "target_map": 36.5,
            "target_airspeed": 65.0,
            "target_alt": 200.0,
            "ambient_temp": 25.0
        },
        "CLIMB": {
            "target_rpm": 5200.0,
            "target_throttle": 85.0,
            "target_map": 32.0,
            "target_airspeed": 80.0,
            "target_alt": 2500.0,
            "ambient_temp": 12.0
        },
        "CRUISE": {
            "target_rpm": 4800.0,
            "target_throttle": 70.0,
            "target_map": 28.0,
            "target_airspeed": 95.0,
            "target_alt": 4000.0,
            "ambient_temp": 0.0
        },
        "LOITER": {
            "target_rpm": 4200.0,
            "target_throttle": 52.0,
            "target_map": 22.5,
            "target_airspeed": 75.0,
            "target_alt": 4500.0,
            "ambient_temp": -5.0
        },
        "HOT_WEATHER": {
            "target_rpm": 4900.0,
            "target_throttle": 75.0,
            "target_map": 29.0,
            "target_airspeed": 90.0,
            "target_alt": 1500.0,
            "ambient_temp": 46.0  # High ambient thermal stress (Desert/DRDO Pokhran trial scenario)
        },
        "RAPID_THROTTLE": {
            "target_rpm": 5000.0,
            "target_throttle": 75.0,
            "target_map": 30.0,
            "target_airspeed": 90.0,
            "target_alt": 3000.0,
            "ambient_temp": 15.0
        },
        "DESCENT": {
            "target_rpm": 3800.0,
            "target_throttle": 40.0,
            "target_map": 19.0,
            "target_airspeed": 110.0,
            "target_alt": 1200.0,
            "ambient_temp": 18.0
        },
        "LANDING": {
            "target_rpm": 3200.0,
            "target_throttle": 30.0,
            "target_map": 16.0,
            "target_airspeed": 55.0,
            "target_alt": 50.0,
            "ambient_temp": 26.0
        }
    }

    def __init__(self, update_rate_hz: float = 2.0):
        self.update_rate_hz = update_rate_hz
        self.dt = 1.0 / update_rate_hz
        self.running = False
        self.flight_time = 0.0
        self.mission_phase = "CRUISE"
        
        # State variables (thermodynamic states)
        self.rpm = 4800.0
        self.throttle_pct = 70.0
        self.manifold_pressure_inhg = 28.0
        self.airspeed_knots = 95.0
        self.altitude_m = 4000.0
        self.ambient_temp_c = 0.0
        
        # Subsystem temperatures and pressures
        self.cyl_cht = [104.5, 105.2, 103.8, 106.0]  # Cylinders 1-4 (°C)
        self.cyl_egt = [782.0, 786.0, 779.0, 788.0]  # Cylinders 1-4 (°C)
        self.oil_pressure_bar = 4.2
        self.oil_temp_c = 86.0
        self.fuel_flow_lph = 18.2
        self.battery_voltage_v = 28.2
        self.alternator_current_a = 22.5
        self.injection_timing_deg_btdc = 22.0
        self.injection_pulse_width_ms = 4.8
        
        # Vibration states
        self.vibe_1x_g = 0.18
        self.vibe_2x_g = 0.22
        self.vibe_half_x_g = 0.05
        self.vibe_bearing_g = 0.08
        self.vibe_overall_g = 0.32
        
        # Fuel & Endurance Tracking
        self.fuel_capacity_liters = 120.0
        self.fuel_remaining_liters = 118.5

        # Multi-Fault injection tracking: Dict[fault_name, Dict[start_time, ramp_sec, target_intensity, current_intensity]]
        self.active_faults: Dict[str, Dict[str, Any]] = {}
        self.fault_intensity = 0.0

        # Rapid throttle oscillation tracker
        self.throttle_cycle_time = 0.0

    def start(self) -> None:
        self.running = True

    def stop(self) -> None:
        self.running = False

    def set_mission_profile(self, profile_name: str) -> None:
        if profile_name in self.MISSION_PRESETS:
            self.mission_phase = profile_name
            self.throttle_cycle_time = 0.0

    def inject_fault(self, fault_type: str, ramp_rate_sec: float = 60.0, target_severity: float = 1.0) -> None:
        key = fault_type.upper()
        self.active_faults[key] = {
            "start_time": self.flight_time,
            "ramp_sec": max(5.0, ramp_rate_sec),
            "target_intensity": max(0.1, min(1.0, target_severity)),
            "current_intensity": 0.0
        }

    def remove_fault(self, fault_type: str) -> None:
        key = fault_type.upper()
        if key in self.active_faults:
            del self.active_faults[key]

    def clear_faults(self) -> None:
        self.active_faults.clear()
        self.fault_intensity = 0.0

    def update_step(self) -> TelemetryPacket:
        """
        Advance the physics simulation by dt seconds and return the resulting telemetry packet.
        """
        self.flight_time += self.dt
        preset = self.MISSION_PRESETS.get(self.mission_phase, self.MISSION_PRESETS["CRUISE"])
        
        # Handle dynamic flight phase behaviors (e.g. RAPID_THROTTLE oscillations)
        target_throttle = preset["target_throttle"]
        if self.mission_phase == "RAPID_THROTTLE":
            self.throttle_cycle_time += self.dt
            # Oscillate throttle between 45% and 95% every 15 seconds
            target_throttle = 70.0 + 25.0 * math.sin(self.throttle_cycle_time * 0.4)
            target_rpm = 4000.0 + (target_throttle / 100.0) * 1600.0
            target_map = 18.0 + (target_throttle / 100.0) * 19.0
        else:
            target_rpm = preset["target_rpm"]
            target_map = preset["target_map"]
        
        target_airspeed = preset["target_airspeed"]
        target_alt = preset["target_alt"]
        target_ambient = preset["ambient_temp"]
        
        # First-order lag dynamics for throttle and RPM response (engine inertia)
        alpha_rpm = 0.15
        alpha_map = 0.25
        alpha_env = 0.05
        
        self.throttle_pct += (target_throttle - self.throttle_pct) * 0.2
        self.rpm += (target_rpm - self.rpm) * alpha_rpm + random.gauss(0, 4.0)
        self.manifold_pressure_inhg += (target_map - self.manifold_pressure_inhg) * alpha_map + random.gauss(0, 0.08)
        self.airspeed_knots += (target_airspeed - self.airspeed_knots) * alpha_env + random.gauss(0, 0.2)
        self.altitude_m += (target_alt - self.altitude_m) * alpha_env
        self.ambient_temp_c += (target_ambient - self.ambient_temp_c) * alpha_env

        # -------------------------------------------------------------
        # Physics-Informed Base Engine Calculations
        # -------------------------------------------------------------
        # Fuel Flow: proportional to MAP and RPM (ideal gas air density + stoichiometric ratio)
        base_fuel_flow = (self.manifold_pressure_inhg / 29.92) * (self.rpm / 4800.0) * 18.5
        base_fuel_flow += random.gauss(0, 0.12)
        self.fuel_flow_lph = max(5.0, base_fuel_flow)

        # Decrement fuel tank
        fuel_burned_step = (self.fuel_flow_lph / 3600.0) * self.dt
        self.fuel_remaining_liters = max(0.5, self.fuel_remaining_liters - fuel_burned_step)
        fuel_endurance_hours = round(self.fuel_remaining_liters / max(2.0, self.fuel_flow_lph), 2)

        # Baseline CHT equilibrium: Heat generated by combustion vs heat carried away by ram air
        # Q_gen ~ FuelFlow * RPM; Q_dissipated ~ (CHT - T_ambient) * Airspeed
        target_cht_base = self.ambient_temp_c + 75.0 + (self.fuel_flow_lph / 18.0) * 22.0 - (self.airspeed_knots - 80.0) * 0.18
        
        # Baseline EGT: Peak around stoichiometric AFR, typically 760 - 820°C in cruise
        target_egt_base = 740.0 + (self.fuel_flow_lph / 18.0) * 55.0 - (self.injection_timing_deg_btdc - 20.0) * 2.5
        
        # Oil Pressure: Proportional to RPM, inversely related to Oil Temp (viscosity curve)
        target_oil_temp = self.ambient_temp_c + 65.0 + (self.rpm / 5000.0) * 20.0
        viscosity_factor = max(0.6, 1.0 - (self.oil_temp_c - 80.0) * 0.006)
        target_oil_pressure = (self.rpm / 5000.0) * 4.5 * viscosity_factor

        # Electrical: 28V DC bus with alternator output
        target_alt_current = 18.0 + (self.rpm / 5000.0) * 6.0 + random.gauss(0, 0.3)
        target_voltage = 28.2 - (target_alt_current - 20.0) * 0.02 + random.gauss(0, 0.05)

        # Injection Parameters
        self.injection_timing_deg_btdc = 22.0 + (self.rpm - 4800.0) * 0.002
        self.injection_pulse_width_ms = 3.5 + (self.fuel_flow_lph / 20.0) * 1.8

        # -------------------------------------------------------------
        # Progressive Multi-Fault Degradation Accumulator (8 DRDO Fault Classes)
        # -------------------------------------------------------------
        active_fault_keys = list(self.active_faults.keys())
        peak_intensity = 0.0

        for f_name, f_data in self.active_faults.items():
            elapsed = self.flight_time - f_data["start_time"]
            progress = min(1.0, elapsed / f_data["ramp_sec"])
            cur_int = progress * f_data["target_intensity"]
            f_data["current_intensity"] = cur_int
            if cur_int > peak_intensity:
                peak_intensity = cur_int

        self.fault_intensity = peak_intensity

        # Individual cylinder baseline offsets
        c_cht = [
            target_cht_base - 1.2,
            target_cht_base + 0.8,
            target_cht_base - 0.5,
            target_cht_base + 1.5
        ]
        c_egt = [
            target_egt_base - 3.0,
            target_egt_base + 4.0,
            target_egt_base - 2.0,
            target_egt_base + 5.0
        ]
        v_1x = 0.15 + (self.rpm / 5000.0) * 0.06
        v_2x = 0.20 + (self.rpm / 5000.0) * 0.08
        v_half = 0.04
        v_bearing = 0.07

        # Apply multi-fault cumulative effects
        for fault_name, f_data in self.active_faults.items():
            f_int = f_data["current_intensity"]

            if fault_name == "MISFIRE":
                c_egt[1] -= 220.0 * f_int
                c_cht[1] -= 25.0 * f_int
                v_half += 0.85 * f_int
                v_1x += 0.35 * f_int
                self.rpm -= 180.0 * f_int
                self.fuel_flow_lph += 2.2 * f_int

            elif fault_name == "INJECTOR_ABNORMALITY":
                c_egt[2] += 135.0 * f_int
                c_cht[2] += 22.0 * f_int
                self.injection_pulse_width_ms += 1.6 * f_int
                v_half += 0.28 * f_int
                c_egt[2] += random.gauss(0, 8.0 * f_int)

            elif fault_name == "COOLING_DEGRADATION":
                for i in range(4):
                    c_cht[i] += 48.0 * f_int
                target_oil_temp += 32.0 * f_int

            elif fault_name == "LUBRICATION_ISSUE":
                target_oil_pressure -= 2.8 * f_int
                target_oil_temp += 38.0 * f_int
                v_bearing += 0.65 * f_int
                v_2x += 0.25 * f_int

            elif fault_name == "SENSOR_DRIFT":
                c_cht[0] += 55.0 * f_int

            elif fault_name == "COMBUSTION_INSTABILITY":
                jitter_amp = 45.0 * f_int
                for i in range(4):
                    c_egt[i] += random.gauss(0, jitter_amp)
                v_half += 0.42 * f_int
                self.manifold_pressure_inhg += random.gauss(0, 0.45 * f_int)

            elif fault_name == "OVERHEATING_TREND":
                for i in range(4):
                    c_cht[i] += 36.0 * f_int
                    c_egt[i] += 45.0 * f_int
                target_oil_temp += 24.0 * f_int

            elif fault_name == "ABNORMAL_VIBRATION":
                v_1x += 1.45 * f_int
                v_2x += 0.85 * f_int
                v_bearing += 0.40 * f_int

        # -------------------------------------------------------------
        # Thermal & Viscous Inertia Integration
        # -------------------------------------------------------------
        thermal_alpha = 0.08  # Cylinder thermal mass lag
        oil_thermal_alpha = 0.04
        
        for i in range(4):
            self.cyl_cht[i] += (c_cht[i] - self.cyl_cht[i]) * thermal_alpha + random.gauss(0, 0.25)
            self.cyl_egt[i] += (c_egt[i] - self.cyl_egt[i]) * 0.25 + random.gauss(0, 1.2)

        self.oil_temp_c += (target_oil_temp - self.oil_temp_c) * oil_thermal_alpha + random.gauss(0, 0.1)
        self.oil_pressure_bar += (target_oil_pressure - self.oil_pressure_bar) * 0.15 + random.gauss(0, 0.03)
        self.battery_voltage_v += (target_voltage - self.battery_voltage_v) * 0.2
        self.alternator_current_a += (target_alt_current - self.alternator_current_a) * 0.2

        self.vibe_1x_g += (v_1x - self.vibe_1x_g) * 0.2 + random.gauss(0, 0.015)
        self.vibe_2x_g += (v_2x - self.vibe_2x_g) * 0.2 + random.gauss(0, 0.018)
        self.vibe_half_x_g += (v_half - self.vibe_half_x_g) * 0.2 + random.gauss(0, 0.008)
        self.vibe_bearing_g += (v_bearing - self.vibe_bearing_g) * 0.2 + random.gauss(0, 0.01)
        
        # Overall RMS vibration = sqrt(sum of harmonic powers + noise floor)
        self.vibe_overall_g = math.sqrt(
            self.vibe_1x_g**2 + 
            self.vibe_2x_g**2 + 
            self.vibe_half_x_g**2 + 
            self.vibe_bearing_g**2 + 
            0.02
        )

        avg_cht = sum(self.cyl_cht) / 4.0
        avg_egt = sum(self.cyl_egt) / 4.0

        cyl_metrics = CylinderMetrics(
            cyl1_cht=round(self.cyl_cht[0], 2),
            cyl2_cht=round(self.cyl_cht[1], 2),
            cyl3_cht=round(self.cyl_cht[2], 2),
            cyl4_cht=round(self.cyl_cht[3], 2),
            cyl1_egt=round(self.cyl_egt[0], 1),
            cyl2_egt=round(self.cyl_egt[1], 1),
            cyl3_egt=round(self.cyl_egt[2], 1),
            cyl4_egt=round(self.cyl_egt[3], 1),
        )

        vibe_harmonics = VibrationHarmonics(
            overall_rms_g=round(self.vibe_overall_g, 3),
            peak_1x_g=round(self.vibe_1x_g, 3),
            peak_2x_g=round(self.vibe_2x_g, 3),
            peak_half_x_g=round(self.vibe_half_x_g, 3),
            high_freq_bearing_g=round(self.vibe_bearing_g, 3),
        )

        primary_fault_str = ", ".join(active_fault_keys) if active_fault_keys else None

        return TelemetryPacket(
            timestamp=time.time(),
            flight_time_sec=round(self.flight_time, 1),
            mission_phase=self.mission_phase,
            rpm=round(self.rpm, 1),
            cht_avg=round(avg_cht, 2),
            egt_avg=round(avg_egt, 1),
            oil_pressure_bar=round(self.oil_pressure_bar, 2),
            oil_temp_c=round(self.oil_temp_c, 2),
            fuel_flow_lph=round(self.fuel_flow_lph, 2),
            vibration_amplitude_g=round(self.vibe_overall_g, 3),
            battery_voltage_v=round(self.battery_voltage_v, 2),
            alternator_current_a=round(self.alternator_current_a, 2),
            injection_timing_deg_btdc=round(self.injection_timing_deg_btdc, 2),
            injection_pulse_width_ms=round(self.injection_pulse_width_ms, 2),
            cylinder_metrics=cyl_metrics,
            vibration_harmonics=vibe_harmonics,
            ambient_temp_c=round(self.ambient_temp_c, 1),
            altitude_m=round(self.altitude_m, 1),
            manifold_pressure_inhg=round(self.manifold_pressure_inhg, 2),
            throttle_pct=round(self.throttle_pct, 1),
            airspeed_knots=round(self.airspeed_knots, 1),
            fuel_capacity_liters=self.fuel_capacity_liters,
            fuel_remaining_liters=round(self.fuel_remaining_liters, 2),
            fuel_endurance_hours=fuel_endurance_hours,
            active_fault=primary_fault_str,
            active_faults=active_fault_keys,
            fault_intensity=round(self.fault_intensity, 3)
        )

    def get_latest_packet(self) -> TelemetryPacket:
        return self.update_step()
