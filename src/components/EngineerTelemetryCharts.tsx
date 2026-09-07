import React from 'react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell 
} from 'recharts';
import { Activity, BarChart2, Cpu, TrendingUp, AlertCircle } from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';
import { RollingHistoryPoint } from '../hooks/useTelemetryStream';

interface EngineerTelemetryChartsProps {
  currentFrame: TelemetryFrameMessage | null;
  history: RollingHistoryPoint[];
}

export const EngineerTelemetryCharts: React.FC<EngineerTelemetryChartsProps> = ({
  currentFrame,
  history,
}) => {
  const anomaly = currentFrame?.anomaly;
  const vibe = currentFrame?.telemetry.vibration_harmonics;

  // Format FFT Vibration Bar Data
  const fftData = [
    { order: '0.5X Sub-Harmonic (Misfire)', value: vibe?.peak_half_x_g ?? 0.05, limit: 0.12, color: (vibe?.peak_half_x_g ?? 0) > 0.12 ? '#ef4444' : '#00f0ff' },
    { order: '1X Rotational (Propeller)', value: vibe?.peak_1x_g ?? 0.18, limit: 0.35, color: (vibe?.peak_1x_g ?? 0) > 0.35 ? '#ef4444' : '#10b981' },
    { order: '2X Piston Firing Order', value: vibe?.peak_2x_g ?? 0.22, limit: 0.45, color: (vibe?.peak_2x_g ?? 0) > 0.45 ? '#f59e0b' : '#3b82f6' },
    { order: 'High-Freq Bearing Friction', value: vibe?.high_freq_bearing_g ?? 0.08, limit: 0.20, color: (vibe?.high_freq_bearing_g ?? 0) > 0.20 ? '#ef4444' : '#a855f7' },
  ];

  return (
    <div className="space-y-4">
      
      {/* Top Row: AI Anomaly & Health Trajectory + FFT Vibration Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left 7 cols: AI Anomaly Score % vs Composite Engine Health Index */}
        <div className="lg:col-span-7 bg-hud-panel border border-hud-border rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-hud-cyan" />
              <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                AI Anomaly Score % vs. Engine Health Index
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-hud-cyan">
                <span className="w-2 h-2 rounded-full bg-hud-cyan" /> Anomaly Score
              </span>
              <span className="flex items-center gap-1 text-hud-emerald">
                <span className="w-2 h-2 rounded-full bg-hud-emerald" /> Health Index
              </span>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2f53" opacity={0.5} />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c1322', borderColor: '#1f2f53', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                />
                <Area type="monotone" dataKey="anomalyScore" name="Anomaly Score %" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#anomalyGrad)" />
                <Line type="monotone" dataKey="healthIndex" name="Health Index" stroke="#10b981" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 5 cols: FFT Vibration Orders Spectrum */}
        <div className="lg:col-span-5 bg-hud-panel border border-hud-border rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                Vibration Harmonic Orders (FFT Spectrum)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-hud-textMuted">
              RMS: {(currentFrame?.telemetry.vibration_amplitude_g ?? 0).toFixed(3)}g
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fftData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2f53" horizontal={false} />
                <XAxis type="number" domain={[0, 1.0]} stroke="#475569" fontSize={9} />
                <YAxis dataKey="order" type="category" stroke="#94a3b8" fontSize={9} width={130} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c1322', borderColor: '#1f2f53', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                  formatter={(val: any) => [`${Number(val).toFixed(3)} g`, 'Peak Amplitude']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {fftData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Second Row: Detailed Multi-Strip Time-Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Strip 1: RPM & Fuel Flow */}
        <div className="bg-hud-panel border border-hud-border rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
              Engine RPM & Fuel Flow Correlation
            </h3>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-hud-cyan font-tabular">RPM: {currentFrame?.telemetry.rpm.toFixed(0)}</span>
              <span className="text-emerald-400 font-tabular">Fuel: {currentFrame?.telemetry.fuel_flow_lph.toFixed(1)} L/h</span>
            </div>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2f53" opacity={0.4} />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" domain={[3000, 6000]} stroke="#00f0ff" fontSize={9} />
                <YAxis yAxisId="right" orientation="right" domain={[10, 35]} stroke="#10b981" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c1322', borderColor: '#1f2f53', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="rpm" name="Engine RPM" stroke="#00f0ff" strokeWidth={1.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="fuelFlow" name="Fuel Flow (L/h)" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strip 2: Lubrication Oil Pressure & Oil Temp */}
        <div className="bg-hud-panel border border-hud-border rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
              Oil Pressure (bar) vs. Oil Temperature (°C)
            </h3>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-blue-400 font-tabular">P: {currentFrame?.telemetry.oil_pressure_bar.toFixed(2)} bar</span>
              <span className="text-hud-amber font-tabular">T: {currentFrame?.telemetry.oil_temp_c.toFixed(1)} °C</span>
            </div>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2f53" opacity={0.4} />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 6.0]} stroke="#60a5fa" fontSize={9} />
                <YAxis yAxisId="right" orientation="right" domain={[50, 140]} stroke="#f59e0b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c1322', borderColor: '#1f2f53', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="oilPressure" name="Oil Pressure (bar)" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="oilTemp" name="Oil Temp (°C)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Explainable AI Feature Attribution Callout */}
      {(anomaly?.top_contributing_features?.length ?? 0) > 0 && (
        <div className="bg-hud-card border border-hud-cyan/30 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2.5">
            <Cpu className="w-4 h-4 text-hud-cyan" />
            <h4 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
              Explainable AI: Sensor Deviation Attribution (SHAP Decomposition)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {anomaly?.top_contributing_features.map((feat, idx) => (
              <div key={idx} className="bg-hud-bg/80 border border-hud-border/60 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-hud-textMuted">
                  <span className="uppercase text-white font-semibold truncate max-w-[120px]">{feat.feature_name}</span>
                  <span className={`font-bold ${feat.deviation_pct > 0 ? 'text-hud-amber' : 'text-blue-400'}`}>
                    {feat.deviation_pct > 0 ? `+${feat.deviation_pct.toFixed(1)}%` : `${feat.deviation_pct.toFixed(1)}%`}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-mono font-tabular">
                  <span className="text-hud-textMuted">Observed: <strong className="text-white">{feat.sensor_value}</strong></span>
                  <span className="text-hud-textMuted">Nominal: <strong className="text-hud-cyan">{feat.nominal_baseline}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
