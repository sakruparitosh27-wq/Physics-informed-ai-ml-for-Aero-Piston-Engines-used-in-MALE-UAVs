export interface CylinderMetrics {
  cyl1_cht: number;
  cyl2_cht: number;
  cyl3_cht: number;
  cyl4_cht: number;
  cyl1_egt: number;
  cyl2_egt: number;
  cyl3_egt: number;
  cyl4_egt: number;
}

export interface VibrationHarmonics {
  overall_rms_g: number;
  peak_1x_g: number;
  peak_2x_g: number;
  peak_half_x_g: number;
  high_freq_bearing_g: number;
}

export interface TelemetryPacket {
  timestamp: number;
  flight_time_sec: number;
  mission_phase: string;
  rpm: number;
  cht_avg: number;
  egt_avg: number;
  oil_pressure_bar: number;
  oil_temp_c: number;
  fuel_flow_lph: number;
  vibration_amplitude_g: number;
  battery_voltage_v: number;
  alternator_current_a: number;
  injection_timing_deg_btdc: number;
  injection_pulse_width_ms: number;
  cylinder_metrics: CylinderMetrics;
  vibration_harmonics: VibrationHarmonics;
  ambient_temp_c: number;
  altitude_m: number;
  manifold_pressure_inhg: number;
  throttle_pct: number;
  airspeed_knots: number;
  // Fuel & Endurance
  fuel_capacity_liters: number;
  fuel_remaining_liters: number;
  fuel_endurance_hours: number;
  // Multi-Fault Support
  active_fault?: string | null;
  active_faults: string[];
  fault_intensity: number;
}

export interface SubsystemHealth {
  thermal_score: number;
  lubrication_score: number;
  combustion_score: number;
  electrical_score: number;
  vibration_score: number;
}

export interface HealthAssessment {
  overall_health_index: number;
  status: 'NOMINAL' | 'WATCH' | 'DEGRADED' | 'CRITICAL';
  subsystems: SubsystemHealth;
  primary_stress_driver: string;
}

export interface FeatureAttribution {
  feature_name: string;
  sensor_value: number;
  nominal_baseline: number;
  deviation_pct: number;
  importance_weight: number;
}

export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;
  confidence: number;
  top_contributing_features: FeatureAttribution[];
  lead_time_advantage_sec: number;
}

export interface SubsystemRUL {
  subsystem_name: string;
  rul_flight_hours: number;
  confidence_lower_hours: number;
  confidence_upper_hours: number;
  critical_parameter: string;
  current_value: number;
  critical_threshold: number;
  degradation_rate_per_hour: number;
}

export interface EngineRULAssessment {
  overall_engine_rul_hours: number;
  confidence_lower_hours: number;
  confidence_upper_hours: number;
  limiting_subsystem: string;
  urgency_level: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL_IMMINENT';
  subsystems_rul: SubsystemRUL[];
  remaining_mission_cycles: number;
  // Safe Flight Time & Divert Window
  safe_flight_time_remaining_min: number;
  nominal_fuel_endurance_hours: number;
  is_emergency_divert_required: boolean;
  tactical_divert_guidance: string;
}

export interface IndividualFaultItem {
  fault_code: string;
  fault_name: string;
  severity: string;
  confidence_pct: number;
  affected_component: string;
}

export interface FaultDiagnosis {
  fault_code: string;
  fault_name: string;
  severity: 'NOMINAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence_pct: number;
  affected_component: string;
  root_cause_summary: string;
  diagnostic_evidence: string[];
  active_faults_count: number;
  detected_faults_list: IndividualFaultItem[];
}

export interface MaintenanceAdvisory {
  advisory_id: string;
  headline: string;
  action_type: 'INSPECT' | 'SERVICE' | 'CALIBRATE' | 'OVERHAUL' | 'MONITOR' | 'DIVERT_IMMEDIATE';
  recommended_timeframe: string;
  tactical_flight_directive: string;
  technical_reference: string;
  estimated_downtime_hours: number;
  safety_criticality: 'ROUTINE' | 'ADVISORY' | 'MISSION_CRITICAL' | 'FLIGHT_SAFETY';
  safe_flight_window_min: number;
}

export interface LegacyThresholdCheck {
  is_breached: boolean;
  status: 'NORMAL' | 'REDLINE_ALARM';
  breached_parameters: string[];
  warning_lead_time_seconds: number;
}

export interface PredictiveVsReactiveComparison {
  legacy_system: LegacyThresholdCheck;
  aerotwin_ai_system: {
    status: string;
    health_index: number;
    anomaly_score: number;
    detected_fault: string;
    fault_code: string;
    rul_hours: number;
    subsystem_at_risk: string;
    confidence: number;
  };
  early_warning_advantage_sec: number;
  decision_advantage_summary: string;
  risk_level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'SEVERE' | 'CATASTROPHIC';
}

export interface SensorChannelHealth {
  sensor_name: string;
  is_valid: boolean;
  confidence_pct: number;
  anomaly_type?: string | null;
  detail?: string | null;
}

export interface SensorValidationResult {
  all_sensors_valid: boolean;
  malfunctioning_count: number;
  sensor_channels: SensorChannelHealth[];
  is_sensor_fault_likely: boolean;
  summary: string;
}

export interface TelemetryFrameMessage {
  type: string;
  telemetry: TelemetryPacket;
  health: HealthAssessment;
  anomaly: AnomalyResult;
  rul: EngineRULAssessment;
  fault: FaultDiagnosis;
  advisory: MaintenanceAdvisory;
  comparison: PredictiveVsReactiveComparison;
  sensor_validation?: SensorValidationResult;
  server_time: number;
}

export interface FaultPresetInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  drdo_code: string;
  primary_sensor_symptoms: string[];
}

export interface MissionProfileInfo {
  id: string;
  name: string;
  description: string;
  target_rpm: number;
  target_alt_m: number;
  ambient_temp_c: number;
}

export interface MissionHistoryItem {
  mission_id: string;
  mission_name: string;
  profile_type: string;
  start_time: number;
  end_time: number | null;
  duration_sec: number;
  initial_health: number;
  final_health: number;
  primary_fault_detected: string;
  status: string;
}

export interface WhatIfStepFrame {
  step: number;
  flight_time_sec: number;
  health_index: number;
  health_status: string;
  anomaly_score: number;
  is_anomaly: boolean;
  rul_hours: number;
  safe_flight_min: number;
  is_emergency: boolean;
  fault_code: string;
  fault_name: string;
  severity: string;
  advisory_headline: string;
  tactical_directive: string;
  sensor_valid: boolean;
}

export interface WhatIfOutcomeSummary {
  final_health_index: number;
  final_health_status: string;
  final_rul_hours: number;
  final_safe_flight_min: number;
  is_emergency_at_end: boolean;
  detected_fault: string;
  ai_first_anomaly_at_sec: number | null;
  tactical_recommendation: string;
}

export interface WhatIfSimulationResponse {
  mission_id: string;
  whatif_fault: string;
  inject_at_flight_sec: number;
  simulation_duration_sec: number;
  total_steps: number;
  outcome_summary: WhatIfOutcomeSummary;
  frames: WhatIfStepFrame[];
}
