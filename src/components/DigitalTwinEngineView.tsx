import React, { useState } from 'react';
import { 
  Flame, Droplets, Zap, Activity, AlertCircle, Info, 
  Wind, Disc, CheckCircle2, ChevronRight, Sliders 
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface DigitalTwinEngineViewProps {
  currentFrame: TelemetryFrameMessage | null;
}

export const DigitalTwinEngineView: React.FC<DigitalTwinEngineViewProps> = ({ currentFrame }) => {
  const [selectedComponent, setSelectedComponent] = useState<string>('CYL2');

  const telemetry = currentFrame?.telemetry;
  const cyls = telemetry?.cylinder_metrics;
  const vibe = telemetry?.vibration_harmonics;
  const fault = currentFrame?.fault;

  // Temperature to color gradient helper
  const getChtColor = (tempC: number) => {
    if (tempC < 90) return '#00f0ff'; // Cool
    if (tempC < 115) return '#10b981'; // Nominal
    if (tempC < 130) return '#f59e0b'; // Warm
    return '#ef4444'; // Hot / Overheating
  };

  const getEgtColor = (tempC: number) => {
    if (tempC < 650) return '#3b82f6'; // Cold (misfire)
    if (tempC < 820) return '#10b981'; // Nominal
    if (tempC < 860) return '#f59e0b'; // Lean
    return '#ef4444'; // Extreme Lean / Knock risk
  };

  const c1Cht = cyls?.cyl1_cht ?? 105;
  const c2Cht = cyls?.cyl2_cht ?? 105;
  const c3Cht = cyls?.cyl3_cht ?? 105;
  const c4Cht = cyls?.cyl4_cht ?? 105;

  const c1Egt = cyls?.cyl1_egt ?? 780;
  const c2Egt = cyls?.cyl2_egt ?? 780;
  const c3Egt = cyls?.cyl3_egt ?? 780;
  const c4Egt = cyls?.cyl4_egt ?? 780;

  const oilP = telemetry?.oil_pressure_bar ?? 4.2;
  const oilT = telemetry?.oil_temp_c ?? 86.0;
  const rpm = telemetry?.rpm ?? 4800;

  return (
    <div className="bg-hud-panel border border-hud-border rounded-xl p-4 md:p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 border-b border-hud-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-hud-cyan" />
            <h2 className="text-base font-bold tracking-wide text-white uppercase font-mono">
              Virtual Engine Digital Twin (4-Cylinder Turbo Aero Piston)
            </h2>
          </div>
          <p className="text-xs text-hud-textMuted font-sans mt-0.5">
            Real-time physical state synchronization • Rotax 914 / Austro AE300 / DRDO TAPAS UAV Powertrain
          </p>
        </div>

        {fault?.fault_code !== 'NOMINAL-00' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-hud-amber/10 border border-hud-amber/40 text-hud-amber text-xs font-mono font-bold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            FAULT LOCATOR: {fault?.affected_component}
          </div>
        )}
      </div>

      {/* Interactive Engine Schematic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* SVG Engine Virtual Schematic (8 cols) */}
        <div className="lg:col-span-8 bg-hud-bg/80 border border-hud-border rounded-xl p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
          
          {/* Background Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#1f2f53_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* SVG Aero Engine Schematic */}
          <svg viewBox="0 0 700 320" className="w-full max-w-[620px] h-auto select-none">
            <defs>
              {/* Glow filters */}
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Engine Crankcase & Central Block */}
            <rect x="200" y="80" width="300" height="150" rx="16" fill="#0d1629" stroke="#2a4173" strokeWidth="2.5" />
            <text x="350" y="160" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
              4-STROKE CRANKCASE
            </text>

            {/* Propeller Reduction Gearbox (Left) */}
            <path d="M 200 110 L 140 125 L 140 185 L 200 200 Z" fill="#121d34" stroke="#00f0ff" strokeWidth="1.5" />
            <text x="170" y="160" textAnchor="middle" fill="#00f0ff" fontSize="9" fontFamily="JetBrains Mono">
              GEARBOX
            </text>

            {/* Rotating Propeller Hub */}
            <g className="origin-[120px_155px] animate-spin-slow">
              <circle cx="120" cy="155" r="14" fill="#00f0ff" opacity="0.3" />
              <line x1="120" y1="90" x2="120" y2="220" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
            </g>
            <text x="120" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              {rpm.toFixed(0)} RPM
            </text>

            {/* Cylinder 1 (Top Left) */}
            <g 
              onClick={() => setSelectedComponent('CYL1')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <rect x="230" y="20" width="55" height="70" rx="8" fill="#15223e" stroke={getChtColor(c1Cht)} strokeWidth={selectedComponent === 'CYL1' ? 3 : 1.5} />
              <text x="257" y="45" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">CYL 1</text>
              <text x="257" y="60" textAnchor="middle" fill={getChtColor(c1Cht)} fontSize="9" fontFamily="JetBrains Mono">{c1Cht.toFixed(0)}°C</text>
              <text x="257" y="75" textAnchor="middle" fill={getEgtColor(c1Egt)} fontSize="8" fontFamily="JetBrains Mono">{c1Egt.toFixed(0)}°E</text>
            </g>

            {/* Cylinder 2 (Top Right) */}
            <g 
              onClick={() => setSelectedComponent('CYL2')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <rect x="305" y="20" width="55" height="70" rx="8" fill="#15223e" stroke={getChtColor(c2Cht)} strokeWidth={selectedComponent === 'CYL2' ? 3 : 1.5} />
              <text x="332" y="45" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">CYL 2</text>
              <text x="332" y="60" textAnchor="middle" fill={getChtColor(c2Cht)} fontSize="9" fontFamily="JetBrains Mono">{c2Cht.toFixed(0)}°C</text>
              <text x="332" y="75" textAnchor="middle" fill={getEgtColor(c2Egt)} fontSize="8" fontFamily="JetBrains Mono">{c2Egt.toFixed(0)}°E</text>
              {fault?.fault_code === 'DRDO-FLT-01' && (
                <circle cx="332" cy="20" r="7" fill="#ef4444" className="animate-ping" />
              )}
            </g>

            {/* Cylinder 3 (Bottom Left) */}
            <g 
              onClick={() => setSelectedComponent('CYL3')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <rect x="380" y="20" width="55" height="70" rx="8" fill="#15223e" stroke={getChtColor(c3Cht)} strokeWidth={selectedComponent === 'CYL3' ? 3 : 1.5} />
              <text x="407" y="45" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">CYL 3</text>
              <text x="407" y="60" textAnchor="middle" fill={getChtColor(c3Cht)} fontSize="9" fontFamily="JetBrains Mono">{c3Cht.toFixed(0)}°C</text>
              <text x="407" y="75" textAnchor="middle" fill={getEgtColor(c3Egt)} fontSize="8" fontFamily="JetBrains Mono">{c3Egt.toFixed(0)}°E</text>
              {fault?.fault_code === 'DRDO-FLT-02' && (
                <circle cx="407" cy="20" r="7" fill="#f59e0b" className="animate-ping" />
              )}
            </g>

            {/* Cylinder 4 (Bottom Right) */}
            <g 
              onClick={() => setSelectedComponent('CYL4')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <rect x="455" y="20" width="55" height="70" rx="8" fill="#15223e" stroke={getChtColor(c4Cht)} strokeWidth={selectedComponent === 'CYL4' ? 3 : 1.5} />
              <text x="482" y="45" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">CYL 4</text>
              <text x="482" y="60" textAnchor="middle" fill={getChtColor(c4Cht)} fontSize="9" fontFamily="JetBrains Mono">{c4Cht.toFixed(0)}°C</text>
              <text x="482" y="75" textAnchor="middle" fill={getEgtColor(c4Egt)} fontSize="8" fontFamily="JetBrains Mono">{c4Egt.toFixed(0)}°E</text>
            </g>

            {/* Turbocharger & Wastegate (Right Side) */}
            <g 
              onClick={() => setSelectedComponent('TURBO')}
              className="cursor-pointer"
            >
              <circle cx="560" cy="155" r="32" fill="#182645" stroke="#00f0ff" strokeWidth="1.5" />
              <circle cx="560" cy="155" r="22" fill="#0d1629" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" />
              <text x="560" y="152" textAnchor="middle" fill="#00f0ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">TURBO</text>
              <text x="560" y="167" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">{telemetry?.manifold_pressure_inhg.toFixed(1)} inHg</text>
            </g>

            {/* Oil Sump & Cooler (Bottom) */}
            <g 
              onClick={() => setSelectedComponent('OIL')}
              className="cursor-pointer"
            >
              <rect x="250" y="240" width="200" height="40" rx="6" fill="#15223e" stroke={oilP < 3.0 ? '#ef4444' : '#10b981'} strokeWidth="1.5" />
              <text x="350" y="258" textAnchor="middle" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                OIL SUMP & COOLER
              </text>
              <text x="350" y="272" textAnchor="middle" fill={oilP < 3.0 ? '#ef4444' : '#10b981'} fontSize="9" fontFamily="JetBrains Mono">
                {oilP.toFixed(2)} bar • {oilT.toFixed(0)}°C
              </text>
            </g>

            {/* Alternator / 28V DC (Bottom Left) */}
            <g 
              onClick={() => setSelectedComponent('ELEC')}
              className="cursor-pointer"
            >
              <rect x="210" y="240" width="30" height="30" rx="4" fill="#121d34" stroke="#a855f7" strokeWidth="1" />
              <text x="225" y="258" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="JetBrains Mono">28V</text>
            </g>
          </svg>

          <div className="text-[10px] font-mono text-hud-textMuted mt-1">
            Click any cylinder or subsystem on the schematic to inspect localized telemetry.
          </div>
        </div>

        {/* Selected Component Inspection Card (4 cols) */}
        <div className="lg:col-span-4 bg-hud-card border border-hud-border rounded-xl p-4 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between border-b border-hud-border/70 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-hud-cyan uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Subsystem Telemetry
              </span>
              <span className="text-xs font-mono font-bold text-white bg-hud-border px-2 py-0.5 rounded">
                {selectedComponent}
              </span>
            </div>

            {/* Dynamic details based on selection */}
            {selectedComponent.startsWith('CYL') && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Cylinder Head Temp (CHT):</span>
                  <span className="font-bold font-tabular text-white">
                    {selectedComponent === 'CYL1' ? c1Cht :
                     selectedComponent === 'CYL2' ? c2Cht :
                     selectedComponent === 'CYL3' ? c3Cht : c4Cht}°C
                  </span>
                </div>

                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Exhaust Gas Temp (EGT):</span>
                  <span className="font-bold font-tabular text-white">
                    {selectedComponent === 'CYL1' ? c1Egt :
                     selectedComponent === 'CYL2' ? c2Egt :
                     selectedComponent === 'CYL3' ? c3Egt : c4Egt}°C
                  </span>
                </div>

                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Injection Pulse Width:</span>
                  <span className="font-bold font-tabular text-hud-cyan">
                    {telemetry?.injection_pulse_width_ms.toFixed(2)} ms
                  </span>
                </div>

                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Sub-harmonic 0.5X Vibe:</span>
                  <span className={`font-bold font-tabular ${(vibe?.peak_half_x_g ?? 0) > 0.15 ? 'text-hud-red' : 'text-hud-emerald'}`}>
                    {(vibe?.peak_half_x_g ?? 0).toFixed(3)} g
                  </span>
                </div>
              </div>
            )}

            {selectedComponent === 'OIL' && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Oil Pressure:</span>
                  <span className={`font-bold font-tabular ${oilP < 3.0 ? 'text-hud-red' : 'text-hud-emerald'}`}>
                    {oilP.toFixed(2)} bar (Nominal: 3.5 - 4.8)
                  </span>
                </div>
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Oil Temperature:</span>
                  <span className={`font-bold font-tabular ${oilT > 105 ? 'text-hud-red' : 'text-hud-emerald'}`}>
                    {oilT.toFixed(1)} °C (Max: 125°C)
                  </span>
                </div>
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Hydrodynamic Bearing Noise:</span>
                  <span className="font-bold font-tabular text-hud-cyan">
                    {(vibe?.high_freq_bearing_g ?? 0).toFixed(3)} g
                  </span>
                </div>
              </div>
            )}

            {selectedComponent === 'TURBO' && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Manifold Abs Pressure:</span>
                  <span className="font-bold font-tabular text-hud-cyan">
                    {telemetry?.manifold_pressure_inhg.toFixed(2)} inHg
                  </span>
                </div>
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Fuel Consumption Flow:</span>
                  <span className="font-bold font-tabular text-white">
                    {telemetry?.fuel_flow_lph.toFixed(1)} L/h
                  </span>
                </div>
              </div>
            )}

            {selectedComponent === 'ELEC' && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">DC Bus Voltage:</span>
                  <span className="font-bold font-tabular text-hud-emerald">
                    {telemetry?.battery_voltage_v.toFixed(2)} V
                  </span>
                </div>
                <div className="flex justify-between items-center bg-hud-bg/80 p-2 rounded border border-hud-border/50">
                  <span className="text-hud-textMuted">Alternator Load:</span>
                  <span className="font-bold font-tabular text-white">
                    {telemetry?.alternator_current_a.toFixed(1)} A
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Subsystem Selector Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-hud-border/60">
            {['CYL1', 'CYL2', 'CYL3', 'CYL4', 'OIL', 'TURBO', 'ELEC'].slice(0, 4).map((comp) => (
              <button
                key={comp}
                onClick={() => setSelectedComponent(comp)}
                className={`py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                  selectedComponent === comp
                    ? 'bg-hud-cyan text-black'
                    : 'bg-hud-bg border border-hud-border text-hud-textMuted hover:text-white'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
