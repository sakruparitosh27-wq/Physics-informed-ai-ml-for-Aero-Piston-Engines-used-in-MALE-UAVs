import React from 'react';
import { 
  Gauge, Flame, Thermometer, Droplets, Fuel, 
  Activity, Zap, Clock, ShieldCheck, AlertTriangle, Radio
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface ParameterGaugesGridProps {
  currentFrame: TelemetryFrameMessage | null;
}

export const ParameterGaugesGrid: React.FC<ParameterGaugesGridProps> = ({ currentFrame }) => {
  const telemetry = currentFrame?.telemetry;
  const cyls = telemetry?.cylinder_metrics;
  const vibe = telemetry?.vibration_harmonics;
  const sensorValidation = currentFrame?.sensor_validation;

  // Helper for mini bar progress
  const renderMiniBar = (val: number, min: number, max: number, color: string) => {
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    return (
      <div className="w-full bg-hud-bg h-1.5 rounded-full overflow-hidden border border-hud-border/40 mt-1">
        <div 
          className={`h-full ${color} transition-all duration-300`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-3.5">
      
      {/* Sensor Cross-Validation Alert Banner if a sensor misfunctions */}
      {sensorValidation && !sensorValidation.all_sensors_valid && (
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in ${
          sensorValidation.is_sensor_fault_likely
            ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
            : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-purple-400 shrink-0 animate-pulse" />
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                <span>SENSOR CROSS-VALIDATION DIAGNOSTIC</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/80 border border-purple-400 text-white">
                  {sensorValidation.malfunctioning_count} CHANNEL{sensorValidation.malfunctioning_count > 1 ? 'S' : ''} FLAGGED
                </span>
              </div>
              <p className="text-[11px] font-mono mt-0.5 text-hud-textBright">
                {sensorValidation.summary}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 shrink-0">
            {sensorValidation.sensor_channels
              .filter(c => !c.is_valid)
              .map((c, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-mono rounded bg-black/50 border border-purple-400 text-purple-300" title={c.detail || ''}>
                  {c.sensor_name}: {c.anomaly_type} ({c.confidence_pct}% conf)
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 8 Core Parameter Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. RPM */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Gauge className="w-3.5 h-3.5 text-hud-cyan" /> 1. ENGINE RPM
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              REDLINE 5800
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono font-tabular text-white tracking-tight">
              {telemetry?.rpm ? telemetry.rpm.toFixed(0) : '----'}
            </span>
            <span className="text-xs font-mono text-hud-cyan">RPM</span>
          </div>
          {renderMiniBar(telemetry?.rpm ?? 0, 2000, 5800, (telemetry?.rpm ?? 0) > 5600 ? 'bg-hud-red' : 'bg-hud-cyan')}
          <div className="flex justify-between text-[10px] font-mono text-hud-textMuted mt-1">
            <span>Idle: 2200</span>
            <span>Max Cont: 5500</span>
          </div>
        </div>

        {/* 2. CHT (Cylinder Head Temperature) */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Thermometer className="w-3.5 h-3.5 text-hud-amber" /> 2. CHT (AVG)
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              LIMIT 145°C
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono font-tabular tracking-tight ${
              (telemetry?.cht_avg ?? 0) > 130 ? 'text-hud-red' : (telemetry?.cht_avg ?? 0) > 118 ? 'text-hud-amber' : 'text-white'
            }`}>
              {telemetry?.cht_avg ? telemetry.cht_avg.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-hud-amber">°C</span>
          </div>
          {renderMiniBar(telemetry?.cht_avg ?? 0, 60, 145, (telemetry?.cht_avg ?? 0) > 130 ? 'bg-hud-red' : 'bg-hud-amber')}
          {cyls && (
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-hud-textMuted mt-1 text-center font-tabular">
              <span>C1: {cyls.cyl1_cht.toFixed(0)}</span>
              <span>C2: {cyls.cyl2_cht.toFixed(0)}</span>
              <span>C3: {cyls.cyl3_cht.toFixed(0)}</span>
              <span>C4: {cyls.cyl4_cht.toFixed(0)}</span>
            </div>
          )}
        </div>

        {/* 3. EGT (Exhaust Gas Temperature) */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> 3. EGT (AVG)
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              MAX 920°C
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono font-tabular text-white tracking-tight">
              {telemetry?.egt_avg ? telemetry.egt_avg.toFixed(0) : '---'}
            </span>
            <span className="text-xs font-mono text-orange-400">°C</span>
          </div>
          {renderMiniBar(telemetry?.egt_avg ?? 0, 500, 920, (telemetry?.egt_avg ?? 0) > 870 ? 'bg-hud-red' : 'bg-orange-400')}
          {cyls && (
            <div className="flex justify-between text-[10px] font-mono text-hud-textMuted mt-1 font-tabular">
              <span>Delta: {(Math.max(cyls.cyl1_egt, cyls.cyl2_egt, cyls.cyl3_egt, cyls.cyl4_egt) - Math.min(cyls.cyl1_egt, cyls.cyl2_egt, cyls.cyl3_egt, cyls.cyl4_egt)).toFixed(0)}°C</span>
              <span>Nominal &lt; 45°C</span>
            </div>
          )}
        </div>

        {/* 4. Oil Pressure & Oil Temperature */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Droplets className="w-3.5 h-3.5 text-blue-400" /> 4. OIL SYSTEM
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              MIN 1.5 BAR
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">PRESSURE</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black font-mono font-tabular ${
                  (telemetry?.oil_pressure_bar ?? 0) < 2.0 ? 'text-hud-red' : 'text-white'
                }`}>
                  {telemetry?.oil_pressure_bar ? telemetry.oil_pressure_bar.toFixed(2) : '-.--'}
                </span>
                <span className="text-[10px] font-mono text-blue-400">bar</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">TEMP</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black font-mono font-tabular ${
                  (telemetry?.oil_temp_c ?? 0) > 115 ? 'text-hud-red' : 'text-white'
                }`}>
                  {telemetry?.oil_temp_c ? telemetry.oil_temp_c.toFixed(1) : '--.-'}
                </span>
                <span className="text-[10px] font-mono text-hud-amber">°C</span>
              </div>
            </div>
          </div>
          {renderMiniBar(telemetry?.oil_pressure_bar ?? 0, 1.0, 6.0, (telemetry?.oil_pressure_bar ?? 0) < 2.0 ? 'bg-hud-red' : 'bg-blue-400')}
        </div>

        {/* 5. Fuel Flow & Remaining Flight Time */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Fuel className="w-3.5 h-3.5 text-hud-emerald" /> 5. FUEL & ENDURANCE
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              {telemetry?.fuel_remaining_liters ? telemetry.fuel_remaining_liters.toFixed(0) : '--'}L REM
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono font-tabular text-white tracking-tight">
              {telemetry?.fuel_flow_lph ? telemetry.fuel_flow_lph.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-hud-emerald">L/HR</span>
          </div>
          {renderMiniBar(telemetry?.fuel_flow_lph ?? 0, 10, 32, 'bg-hud-emerald')}
          <div className="flex justify-between text-[10px] font-mono text-hud-textMuted mt-1">
            <span>Endurance: {(telemetry?.fuel_endurance_hours ?? 0).toFixed(1)}h</span>
            <span className="text-hud-emerald">Capacity 120L</span>
          </div>
        </div>

        {/* 6. Vibration Signatures (Harmonic breakdown) */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Activity className="w-3.5 h-3.5 text-purple-400" /> 6. VIBRATION RMS
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              LIMIT 1.20g
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono font-tabular tracking-tight ${
              (telemetry?.vibration_amplitude_g ?? 0) > 0.8 ? 'text-hud-red' : 'text-white'
            }`}>
              {telemetry?.vibration_amplitude_g ? telemetry.vibration_amplitude_g.toFixed(3) : '-.---'}
            </span>
            <span className="text-xs font-mono text-purple-400">g</span>
          </div>
          {renderMiniBar(telemetry?.vibration_amplitude_g ?? 0, 0.1, 1.2, (telemetry?.vibration_amplitude_g ?? 0) > 0.8 ? 'bg-hud-red' : 'bg-purple-400')}
          {vibe && (
            <div className="flex justify-between text-[9px] font-mono text-hud-textMuted mt-1 font-tabular">
              <span>1X: {vibe.peak_1x_g.toFixed(2)}g</span>
              <span>2X: {vibe.peak_2x_g.toFixed(2)}g</span>
              <span>0.5X: {vibe.peak_half_x_g.toFixed(2)}g</span>
            </div>
          )}
        </div>

        {/* 7. Electrical System (28V DC Bus) */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> 7. 28V DC BUS
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              AVIONICS
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">VOLTAGE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono font-tabular text-white">
                  {telemetry?.battery_voltage_v ? telemetry.battery_voltage_v.toFixed(1) : '--.-'}
                </span>
                <span className="text-[10px] font-mono text-yellow-400">V</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">CURRENT</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono font-tabular text-white">
                  {telemetry?.alternator_current_a ? telemetry.alternator_current_a.toFixed(1) : '--.-'}
                </span>
                <span className="text-[10px] font-mono text-yellow-400">A</span>
              </div>
            </div>
          </div>
          {renderMiniBar(telemetry?.battery_voltage_v ?? 0, 22.0, 32.0, 'bg-yellow-400')}
        </div>

        {/* 8. Fuel Injection Parameters */}
        <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 shadow-md hover:border-hud-cyan/40 transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <Clock className="w-3.5 h-3.5 text-hud-cyan" /> 8. INJECTION TIMING
            </span>
            <span className="text-[10px] bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
              FADEC CLOSED-LOOP
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">ADVANCE ANGLE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono font-tabular text-white">
                  {telemetry?.injection_timing_deg_btdc ? telemetry.injection_timing_deg_btdc.toFixed(1) : '--.-'}
                </span>
                <span className="text-[10px] font-mono text-hud-cyan">°BTDC</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-hud-textMuted font-mono block">PULSE WIDTH</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono font-tabular text-white">
                  {telemetry?.injection_pulse_width_ms ? telemetry.injection_pulse_width_ms.toFixed(2) : '-.--'}
                </span>
                <span className="text-[10px] font-mono text-hud-cyan">ms</span>
              </div>
            </div>
          </div>
          {renderMiniBar(telemetry?.injection_pulse_width_ms ?? 0, 2.0, 7.0, 'bg-hud-cyan')}
        </div>

      </div>
    </div>
  );
};
