"""
Modular Telemetry Interface for AeroTwin UAV Engine Health Monitoring.
Allows seamless plug-and-play swapping between:
- PhysicsTelemetrySimulator (simulated MALE UAV aero piston engine)
- HardwareTelemetrySource (CAN-bus / ECU / FADEC / ARINC-429 serial interface)
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import time


class CylinderMetrics(BaseModel):
    cyl1_cht: float = Field(..., description="Cylinder 1 CHT in °C")
    cyl2_cht: float = Field(..., description="Cylinder 2 CHT in °C")
    cyl3_cht: float = Field(..., description="Cylinder 3 CHT in °C")
    cyl4_cht: float = Field(..., description="Cylinder 4 CHT in °C")
    cyl1_egt: float = Field(..., description="Cylinder 1 EGT in °C")
    cyl2_egt: float = Field(..., description="Cylinder 2 EGT in °C")
    cyl3_egt: float = Field(..., description="Cylinder 3 EGT in °C")
    cyl4_egt: float = Field(..., description="Cylinder 4 EGT in °C")


class VibrationHarmonics(BaseModel):
    overall_rms_g: float = Field(..., description="Overall vibration RMS in g")
    peak_1x_g: float = Field(..., description="1X Engine rotational order harmonic (shaft/prop unbalance)")
    peak_2x_g: float = Field(..., description="2X Engine order harmonic (piston reciprocating / firing)")
    peak_half_x_g: float = Field(..., description="0.5X Sub-harmonic (misfire / cyclic irregularity)")
    high_freq_bearing_g: float = Field(..., description="High-frequency bearing friction / cavitation noise")


class TelemetryPacket(BaseModel):
    timestamp: float = Field(default_factory=time.time, description="Unix timestamp (seconds)")
    flight_time_sec: float = Field(0.0, description="Elapsed mission flight time in seconds")
    mission_phase: str = Field("CRUISE", description="TAKEOFF, CLIMB, CRUISE, LOITER, DESCENT, LANDING, HOT_WEATHER")
    
    # 8 Core Parameters specified by SIH26054 / DRDO
    rpm: float = Field(..., description="Engine crankshaft speed in RPM")
    cht_avg: float = Field(..., description="Average Cylinder Head Temperature in °C")
    egt_avg: float = Field(..., description="Average Exhaust Gas Temperature in °C")
    oil_pressure_bar: float = Field(..., description="Engine lubrication oil pressure in bar")
    oil_temp_c: float = Field(..., description="Engine lubrication oil temperature in °C")
    fuel_flow_lph: float = Field(..., description="Fuel consumption flow rate in Liters/Hour")
    vibration_amplitude_g: float = Field(..., description="Vibration amplitude in g (RMS)")
    battery_voltage_v: float = Field(..., description="28V DC bus / battery voltage")
    alternator_current_a: float = Field(..., description="Alternator supply current in Amperes")
    injection_timing_deg_btdc: float = Field(..., description="Fuel injection advance angle in deg BTDC")
    injection_pulse_width_ms: float = Field(..., description="Fuel injector pulse duration in milliseconds")
    
    # Detailed sub-parameters for multi-cylinder inspection
    cylinder_metrics: CylinderMetrics
    vibration_harmonics: VibrationHarmonics
    
    # Environmental & Aerodynamic context
    ambient_temp_c: float = Field(20.0, description="Ambient air temperature in °C")
    altitude_m: float = Field(3000.0, description="Barometric altitude in meters (MALE UAV 1,000-6,000m)")
    manifold_pressure_inhg: float = Field(28.0, description="Turbocharger Manifold Absolute Pressure in inHg")
    throttle_pct: float = Field(70.0, description="Throttle lever position percentage (0-100%)")
    airspeed_knots: float = Field(90.0, description="Indicated airspeed in knots (ram-air cooling factor)")
    
    # Fuel & Endurance Tracking
    fuel_capacity_liters: float = Field(120.0, description="Total UAV usable fuel tank capacity in Liters")
    fuel_remaining_liters: float = Field(115.0, description="Current remaining usable fuel in Liters")
    fuel_endurance_hours: float = Field(6.2, description="Remaining nominal flight endurance based on current fuel flow")

    # Fault Injection Context (Supports Multiple Concurrent Failures)
    active_fault: Optional[str] = Field(None, description="Comma-separated active fault names")
    active_faults: List[str] = Field(default_factory=list, description="List of all currently active injected fault classes")
    fault_intensity: float = Field(0.0, description="Peak degradation severity level across active faults (0.0 to 1.0)")


class TelemetrySource(ABC):
    """
    Abstract base interface for telemetry ingestion.
    Allows swappable backends (Physics Simulator vs. Hardware CAN/FADEC feed).
    """

    @abstractmethod
    def start(self) -> None:
        """Initialize and start the telemetry stream."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Safely stop the telemetry stream."""
        pass

    @abstractmethod
    def get_latest_packet(self) -> TelemetryPacket:
        """Return the most recent telemetry frame."""
        pass

    @abstractmethod
    def set_mission_profile(self, profile_name: str) -> None:
        """Switch current flight profile (e.g. CRUISE, HOT_WEATHER, RAPID_THROTTLE)."""
        pass

    @abstractmethod
    def inject_fault(self, fault_type: str, ramp_rate_sec: float = 60.0, target_severity: float = 1.0) -> None:
        """Inject progressive degradation fault scenario."""
        pass

    @abstractmethod
    def remove_fault(self, fault_type: str) -> None:
        """Remove a specific active fault."""
        pass

    @abstractmethod
    def clear_faults(self) -> None:
        """Clear all active fault degradations."""
        pass
