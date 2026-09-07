"""
Sensor Cross-Validation & Malfunction Detection for AeroTwin.
Detects sensor malfunctions by cross-checking redundant and correlated sensor channels.

Detects:
1. Single-sensor divergence (one CHT/EGT reading wildly different from siblings)
2. Cross-subsystem inconsistency (CHT high but oil temp and EGT normal → sensor fault)
3. Frozen/stuck sensors (value unchanged for extended period)
4. Out-of-physical-range readings (e.g., negative oil pressure, CHT > 300°C)

Reports per-sensor health confidence and flags specific malfunctioning channels.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from backend.telemetry.interface import TelemetryPacket


class SensorChannelHealth(BaseModel):
    sensor_name: str
    is_valid: bool
    confidence_pct: float = Field(..., description="0-100 confidence that this sensor is reading correctly")
    anomaly_type: Optional[str] = Field(None, description="DIVERGENT, FROZEN, OUT_OF_RANGE, INCONSISTENT, or None")
    detail: Optional[str] = None


class SensorValidationResult(BaseModel):
    all_sensors_valid: bool
    malfunctioning_count: int
    sensor_channels: List[SensorChannelHealth]
    is_sensor_fault_likely: bool = Field(..., description="True if anomalies are better explained by sensor failure than physical engine failure")
    summary: str


class SensorCrossValidator:
    """
    Cross-validates sensor readings using redundancy and physical correlation rules.
    """

    # Physical plausibility bounds — values outside these are clearly sensor faults
    PHYSICAL_RANGE = {
        "cht_min": 10.0, "cht_max": 300.0,
        "egt_min": 200.0, "egt_max": 1100.0,
        "oil_p_min": 0.0, "oil_p_max": 8.0,
        "oil_t_min": -20.0, "oil_t_max": 180.0,
        "vibe_min": 0.0, "vibe_max": 5.0,
        "voltage_min": 18.0, "voltage_max": 35.0,
    }

    # Maximum expected spread between sibling cylinder sensors under any real condition
    MAX_CHT_SIBLING_SPREAD = 40.0  # °C — beyond this, a sensor is likely drifting
    MAX_EGT_SIBLING_SPREAD = 100.0  # °C

    def __init__(self):
        self._prev_values: Dict[str, float] = {}
        self._frozen_counters: Dict[str, int] = {}

    def validate(self, packet: TelemetryPacket) -> SensorValidationResult:
        channels: List[SensorChannelHealth] = []

        # ──── 1. Per-cylinder CHT cross-validation ────
        chts = [
            ("CHT Cyl-1", packet.cylinder_metrics.cyl1_cht),
            ("CHT Cyl-2", packet.cylinder_metrics.cyl2_cht),
            ("CHT Cyl-3", packet.cylinder_metrics.cyl3_cht),
            ("CHT Cyl-4", packet.cylinder_metrics.cyl4_cht),
        ]
        cht_values = [v for _, v in chts]
        cht_mean = sum(cht_values) / len(cht_values)
        cht_spread = max(cht_values) - min(cht_values)

        for name, val in chts:
            ch = self._check_range(name, val, self.PHYSICAL_RANGE["cht_min"], self.PHYSICAL_RANGE["cht_max"])
            if ch:
                channels.append(ch)
                continue

            # Check sibling divergence: is this sensor far from the mean of the other three?
            others = [v for n, v in chts if n != name]
            others_mean = sum(others) / len(others)
            deviation = abs(val - others_mean)

            if deviation > self.MAX_CHT_SIBLING_SPREAD:
                # Cross-check: if oil temp and EGT are normal, this is likely a sensor fault
                oil_normal = 40.0 < packet.oil_temp_c < 105.0
                egt_mean = sum([packet.cylinder_metrics.cyl1_egt, packet.cylinder_metrics.cyl2_egt,
                                packet.cylinder_metrics.cyl3_egt, packet.cylinder_metrics.cyl4_egt]) / 4.0
                egt_normal = 650.0 < egt_mean < 870.0

                if oil_normal and egt_normal:
                    channels.append(SensorChannelHealth(
                        sensor_name=name,
                        is_valid=False,
                        confidence_pct=round(max(5.0, 100.0 - deviation * 2.0), 1),
                        anomaly_type="DIVERGENT",
                        detail=f"Reads {val:.1f}°C vs siblings avg {others_mean:.1f}°C (Δ{deviation:.1f}°C). Oil/EGT normal → sensor malfunction likely."
                    ))
                    continue

            channels.append(SensorChannelHealth(sensor_name=name, is_valid=True, confidence_pct=98.0))

        # ──── 2. Per-cylinder EGT cross-validation ────
        egts = [
            ("EGT Cyl-1", packet.cylinder_metrics.cyl1_egt),
            ("EGT Cyl-2", packet.cylinder_metrics.cyl2_egt),
            ("EGT Cyl-3", packet.cylinder_metrics.cyl3_egt),
            ("EGT Cyl-4", packet.cylinder_metrics.cyl4_egt),
        ]
        egt_vals = [v for _, v in egts]
        egt_spread = max(egt_vals) - min(egt_vals)

        for name, val in egts:
            ch = self._check_range(name, val, self.PHYSICAL_RANGE["egt_min"], self.PHYSICAL_RANGE["egt_max"])
            if ch:
                channels.append(ch)
                continue

            others = [v for n, v in egts if n != name]
            others_mean = sum(others) / len(others)
            deviation = abs(val - others_mean)

            if deviation > self.MAX_EGT_SIBLING_SPREAD:
                channels.append(SensorChannelHealth(
                    sensor_name=name,
                    is_valid=False,
                    confidence_pct=round(max(5.0, 100.0 - deviation * 1.0), 1),
                    anomaly_type="DIVERGENT",
                    detail=f"Reads {val:.1f}°C vs siblings avg {others_mean:.1f}°C (Δ{deviation:.1f}°C). Possible thermocouple malfunction."
                ))
                continue

            channels.append(SensorChannelHealth(sensor_name=name, is_valid=True, confidence_pct=97.5))

        # ──── 3. Oil Pressure sensor ────
        ch = self._check_range("Oil Pressure", packet.oil_pressure_bar,
                                self.PHYSICAL_RANGE["oil_p_min"], self.PHYSICAL_RANGE["oil_p_max"])
        if ch:
            channels.append(ch)
        else:
            channels.append(self._check_frozen("Oil Pressure", packet.oil_pressure_bar))

        # ──── 4. Oil Temperature sensor ────
        ch = self._check_range("Oil Temperature", packet.oil_temp_c,
                                self.PHYSICAL_RANGE["oil_t_min"], self.PHYSICAL_RANGE["oil_t_max"])
        if ch:
            channels.append(ch)
        else:
            channels.append(self._check_frozen("Oil Temperature", packet.oil_temp_c))

        # ──── 5. Vibration sensor ────
        ch = self._check_range("Vibration RMS", packet.vibration_amplitude_g,
                                self.PHYSICAL_RANGE["vibe_min"], self.PHYSICAL_RANGE["vibe_max"])
        if ch:
            channels.append(ch)
        else:
            channels.append(self._check_frozen("Vibration RMS", packet.vibration_amplitude_g))

        # ──── 6. Battery Voltage ────
        ch = self._check_range("Battery Voltage", packet.battery_voltage_v,
                                self.PHYSICAL_RANGE["voltage_min"], self.PHYSICAL_RANGE["voltage_max"])
        if ch:
            channels.append(ch)
        else:
            channels.append(SensorChannelHealth(sensor_name="Battery Voltage", is_valid=True, confidence_pct=99.0))

        # ──── Compile result ────
        malfunctioning = [c for c in channels if not c.is_valid]
        malfunction_count = len(malfunctioning)

        # Determine if anomalies are better explained by sensor failure
        # Rule: if a CHT sensor diverges but oil + EGT + vibration are all normal → sensor fault
        is_sensor_fault = any(c.anomaly_type == "DIVERGENT" and "CHT" in c.sensor_name for c in malfunctioning)

        if malfunction_count == 0:
            summary = "All sensor channels nominal. Cross-validation passed."
        elif is_sensor_fault:
            bad_names = ", ".join(c.sensor_name for c in malfunctioning)
            summary = f"SENSOR MALFUNCTION DETECTED: {bad_names}. Cross-subsystem analysis indicates instrumentation fault, NOT physical engine degradation."
        else:
            bad_names = ", ".join(c.sensor_name for c in malfunctioning)
            summary = f"Sensor anomalies on: {bad_names}. May indicate physical degradation or sensor fault — investigate."

        return SensorValidationResult(
            all_sensors_valid=(malfunction_count == 0),
            malfunctioning_count=malfunction_count,
            sensor_channels=channels,
            is_sensor_fault_likely=is_sensor_fault,
            summary=summary
        )

    def _check_range(self, name: str, value: float, vmin: float, vmax: float) -> Optional[SensorChannelHealth]:
        if value < vmin or value > vmax:
            return SensorChannelHealth(
                sensor_name=name,
                is_valid=False,
                confidence_pct=0.0,
                anomaly_type="OUT_OF_RANGE",
                detail=f"Value {value:.2f} outside physical range [{vmin:.1f}, {vmax:.1f}]"
            )
        return None

    def _check_frozen(self, name: str, value: float) -> SensorChannelHealth:
        """Detect frozen/stuck sensors by tracking change over consecutive calls."""
        prev = self._prev_values.get(name)
        self._prev_values[name] = value

        if prev is not None and abs(value - prev) < 0.001:
            self._frozen_counters[name] = self._frozen_counters.get(name, 0) + 1
        else:
            self._frozen_counters[name] = 0

        if self._frozen_counters.get(name, 0) > 20:  # Stuck for >10 seconds at 2Hz
            return SensorChannelHealth(
                sensor_name=name,
                is_valid=False,
                confidence_pct=15.0,
                anomaly_type="FROZEN",
                detail=f"Value stuck at {value:.3f} for >{self._frozen_counters[name]} consecutive samples. Possible sensor failure."
            )

        return SensorChannelHealth(sensor_name=name, is_valid=True, confidence_pct=98.0)
