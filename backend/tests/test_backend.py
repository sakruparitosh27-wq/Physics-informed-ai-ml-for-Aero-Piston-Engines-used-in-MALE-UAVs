"""
Unit and Integration Tests for AeroTwin Backend.
Tests:
- Physics simulator step execution & telemetry model validation
- Engine Health Index computation (Nominal vs. Degraded)
- Isolation Forest anomaly detection & explainability
- Prognostic RUL calculation & confidence bounds
- Multi-class DRDO fault diagnostic classification
- Legacy Threshold vs AI Benchmark comparison
- SQLite mission logging and replay retrieval
"""

import pytest
import numpy as np
from backend.telemetry.physics_simulator import PhysicsTelemetrySimulator
from backend.ml.health_index import EngineHealthCalculator
from backend.ml.anomaly_detector import EngineAnomalyDetector
from backend.ml.rul_estimator import RULEstimator
from backend.ml.fault_classifier import FaultClassifier
from backend.ml.advisory_generator import AdvisoryGenerator
from backend.ml.threshold_benchmark import ThresholdBenchmarkEngine
from backend.db.mission_recorder import MissionRecorder


def test_physics_simulator_nominal_step():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    packet = sim.update_step()

    assert packet.rpm > 3000.0 and packet.rpm < 6500.0
    assert packet.cht_avg > 60.0 and packet.cht_avg < 135.0
    assert packet.egt_avg > 600.0 and packet.egt_avg < 900.0
    assert packet.oil_pressure_bar > 2.0 and packet.oil_pressure_bar < 6.0
    assert packet.vibration_amplitude_g > 0.05 and packet.vibration_amplitude_g < 0.8
    assert packet.battery_voltage_v > 26.0 and packet.battery_voltage_v < 30.0


def test_health_calculator_nominal():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    packet = sim.update_step()
    
    health = EngineHealthCalculator.calculate(packet)
    assert health.overall_health_index >= 85.0
    assert health.status in ["NOMINAL", "WATCH"]
    assert health.subsystems.thermal_score > 80.0
    assert health.subsystems.lubrication_score > 80.0


def test_anomaly_detection_misfire_fault():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    # Inject misfire with 5s ramp
    sim.inject_fault("MISFIRE", ramp_rate_sec=5.0, target_severity=1.0)
    
    # Advance simulation 15 steps
    for _ in range(15):
        packet = sim.update_step()

    detector = EngineAnomalyDetector()
    anomaly = detector.detect(packet)
    assert anomaly.is_anomaly is True
    assert anomaly.anomaly_score > 0.40
    assert len(anomaly.top_contributing_features) > 0


def test_fault_classifier_misfire():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    sim.inject_fault("MISFIRE", ramp_rate_sec=5.0, target_severity=1.0)
    
    for _ in range(15):
        packet = sim.update_step()

    detector = EngineAnomalyDetector()
    anomaly = detector.detect(packet)
    diagnosis = FaultClassifier.classify(packet, anomaly)

    # Multi-fault: misfire may trigger together with other faults; check primary or list contains it
    assert diagnosis.fault_code in ("DRDO-FLT-01", "MULTI-FAULT")
    assert "Misfire" in diagnosis.fault_name or any("Misfire" in f.fault_name for f in diagnosis.detected_faults_list)
    assert diagnosis.confidence_pct > 80.0


def test_rul_and_advisory_generation():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    sim.inject_fault("COOLING_DEGRADATION", ramp_rate_sec=10.0, target_severity=1.0)
    
    rul_est = RULEstimator()
    for _ in range(25):
        packet = sim.update_step()
        health = EngineHealthCalculator.calculate(packet)
        rul = rul_est.estimate_rul(packet, health)

    assert rul.overall_engine_rul_hours < 450.0  # Degrading
    assert len(rul.subsystems_rul) == 4
    assert rul.safe_flight_time_remaining_min >= 0.0

    anomaly = EngineAnomalyDetector().detect(packet)
    diag = FaultClassifier.classify(packet, anomaly)
    advisory = AdvisoryGenerator.generate(diag, rul)

    assert advisory.advisory_id is not None
    assert advisory.tactical_flight_directive is not None
    assert "DRDO" in advisory.technical_reference


def test_threshold_benchmark_early_warning_advantage():
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    # Inject cooling failure with 15s ramp
    sim.inject_fault("COOLING_DEGRADATION", ramp_rate_sec=15.0, target_severity=1.0)
    
    detector = EngineAnomalyDetector()
    rul_est = RULEstimator()
    
    # At step 25, thermal degradation has progressed into the early warning window
    for _ in range(25):
        packet = sim.update_step()
    
    health = EngineHealthCalculator.calculate(packet)
    anomaly = detector.detect(packet)
    rul = rul_est.estimate_rul(packet, health)
    diag = FaultClassifier.classify(packet, anomaly)
    comp = ThresholdBenchmarkEngine.evaluate(packet, anomaly, health, rul, diag)

    # Legacy system should NOT have breached yet (CHT < 140°C)
    assert comp.legacy_system.is_breached is False
    assert comp.legacy_system.status == "NORMAL"
    
    # AeroTwin AI has already detected anomaly and provides lead time advantage
    assert comp.early_warning_advantage_sec > 0.0


def test_mission_recorder_and_history():
    recorder = MissionRecorder()
    missions = recorder.get_missions_list()
    assert len(missions) >= 3

    # Fetch historical mission telemetry
    hist_msn = next((m for m in missions if m["mission_id"].startswith("HIST-")), missions[0])
    telemetry = recorder.get_mission_telemetry(hist_msn["mission_id"])
    assert len(telemetry) > 0
    assert "telemetry" in telemetry[0]
    assert "health" in telemetry[0]


def test_nominal_rul_stability_does_not_drop():
    """Verify that during normal flight without faults, RUL remains at nominal baseline (450h)."""
    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    rul_est = RULEstimator()
    health_calc = EngineHealthCalculator()

    for _ in range(40):  # 20 seconds of flight
        pkt = sim.update_step()
        health = health_calc.calculate(pkt)
        rul = rul_est.estimate_rul(pkt, health)
        # RUL must NOT drop to near-zero during normal flight!
        assert rul.overall_engine_rul_hours >= 400.0
        assert rul.urgency_level == "NORMAL"
        assert not rul.is_emergency_divert_required


def test_sensor_cross_validation():
    """Verify that sensor divergence is correctly isolated as an instrumentation fault."""
    from backend.ml.sensor_validator import SensorCrossValidator
    validator = SensorCrossValidator()

    sim = PhysicsTelemetrySimulator(update_rate_hz=2.0)
    sim.start()
    pkt = sim.update_step()

    # Nominal check
    res_nominal = validator.validate(pkt)
    assert res_nominal.all_sensors_valid is True

    # Inject a simulated sensor malfunction (CHT 2 reads 185°C while others are normal ~105°C)
    pkt.cylinder_metrics.cyl2_cht = 185.0
    res_fault = validator.validate(pkt)
    assert res_fault.all_sensors_valid is False
    assert res_fault.is_sensor_fault_likely is True
    assert any(c.sensor_name == "CHT Cyl-2" and not c.is_valid for c in res_fault.sensor_channels)
