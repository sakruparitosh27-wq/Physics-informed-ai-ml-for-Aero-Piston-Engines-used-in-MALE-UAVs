import React, { useState } from 'react';
import { 
  AlertTriangle, Play, RotateCcw, Sliders, ShieldCheck, 
  Flame, Droplets, Zap, Activity, Wind, X
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface FaultInjectionPanelProps {
  currentFrame: TelemetryFrameMessage | null;
  onInjectFault: (faultType: string, rampSec: number, severity: number) => void;
  onClearFaults: () => void;
  onRemoveFault: (faultType: string) => void;
  onSetMissionProfile: (profile: string) => void;
}

export const FaultInjectionPanel: React.FC<FaultInjectionPanelProps> = ({
  currentFrame,
  onInjectFault,
  onClearFaults,
  onRemoveFault,
  onSetMissionProfile,
}) => {
  const [rampSec, setRampSec] = useState<number>(30);
  const [severity, setSeverity] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'FAULTS' | 'PROFILES'>('FAULTS');

  // Multi-fault: read from active_faults list
  const activeFaults: string[] = currentFrame?.telemetry.active_faults ?? [];
  const faultIntensity = currentFrame?.telemetry.fault_intensity ?? 0;
  const currentPhase = currentFrame?.telemetry.mission_phase ?? 'CRUISE';

  const faultOptions = [
    { id: 'MISFIRE', code: 'DRDO-FLT-01', name: 'Cylinder #2 Misfire', icon: Flame, color: 'text-hud-amber', desc: 'Cold exhaust + 0.5X sub-harmonic vibration spike' },
    { id: 'INJECTOR_ABNORMALITY', code: 'DRDO-FLT-02', name: 'Injector Flow Restriction', icon: Sliders, color: 'text-orange-400', desc: 'Cyl #3 lean burn + high EGT peak + pulse widening' },
    { id: 'COOLING_DEGRADATION', code: 'DRDO-FLT-03', name: 'Cooling Radiator Loss', icon: Wind, color: 'text-hud-cyan', desc: 'Uniform exponential CHT thermal runaway' },
    { id: 'LUBRICATION_ISSUE', code: 'DRDO-FLT-04', name: 'Oil Pressure Collapse', icon: Droplets, color: 'text-blue-400', desc: 'Pressure drop to 1.4 bar + oil temp rise + bearing noise' },
    { id: 'SENSOR_DRIFT', code: 'DRDO-FLT-05', name: 'Sensor Bias Drift', icon: Activity, color: 'text-purple-400', desc: 'CHT #1 calibration drift without physical core overheating' },
    { id: 'COMBUSTION_INSTABILITY', code: 'DRDO-FLT-06', name: 'Combustion Dispersion', icon: Zap, color: 'text-yellow-400', desc: 'Cyclic flame speed jitter + manifold vacuum ripple' },
    { id: 'OVERHEATING_TREND', code: 'DRDO-FLT-07', name: 'High Ambient Heat-Soak', icon: Flame, color: 'text-hud-red', desc: '46°C desert ambient + sustained climb thermal accumulation' },
    { id: 'ABNORMAL_VIBRATION', code: 'DRDO-FLT-08', name: 'Propeller / Gear Resonance', icon: Activity, color: 'text-hud-red', desc: '1X & 2X harmonic vibration amplitude surge (> 1.4g)' },
  ];

  const profileOptions = [
    { id: 'TAKEOFF', name: 'Max Power Takeoff', desc: '5500 RPM • 98% Throttle' },
    { id: 'CLIMB', name: 'Climb to Altitude', desc: '5200 RPM • 85% Throttle' },
    { id: 'CRUISE', name: 'High-Altitude Cruise', desc: '4800 RPM • 4,000m Alt' },
    { id: 'LOITER', name: 'Endurance Loiter (18h+)', desc: '4200 RPM • Lean-burn Economy' },
    { id: 'HOT_WEATHER', name: 'Hot Weather Desert (46°C)', desc: '4900 RPM • DRDO Pokhran trial' },
    { id: 'RAPID_THROTTLE', name: 'Combat Throttle Steps', desc: 'Cyclic 45% - 95% throttle' },
    { id: 'DESCENT', name: 'Tactical Descent', desc: '3800 RPM • Ram-air cooling' },
    { id: 'LANDING', name: 'Approach & Landing', desc: '3200 RPM • Low power' },
  ];

  return (
    <div className="bg-hud-panel border border-hud-border rounded-xl p-4 md:p-5 shadow-xl">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-hud-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-hud-amber" />
            <h2 className="text-base font-bold tracking-wide text-white uppercase font-mono">
              Live Scenario & Fault Injection Deck (DRDO Demo Panel)
            </h2>
          </div>
          <p className="text-xs text-hud-textMuted font-sans mt-0.5">
            Inject multiple concurrent faults to test AI multi-fault detection, RUL degradation, and divert window calculations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-hud-bg p-1 rounded-lg border border-hud-border">
          <button
            onClick={() => setActiveTab('FAULTS')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              activeTab === 'FAULTS' ? 'bg-hud-amber text-black' : 'text-hud-textMuted hover:text-white'
            }`}
          >
            FAULT INJECTION (8)
          </button>
          <button
            onClick={() => setActiveTab('PROFILES')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              activeTab === 'PROFILES' ? 'bg-hud-cyan text-black' : 'text-hud-textMuted hover:text-white'
            }`}
          >
            MISSION PROFILES
          </button>
        </div>
      </div>

      {/* Multi-Fault Status Bar */}
      {activeFaults.length > 0 ? (
        <div className="mb-4 bg-hud-red/10 border border-hud-red/50 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-hud-red shrink-0 animate-pulse" />
              <div>
                <div className="text-xs font-mono font-bold text-hud-red uppercase">
                  {activeFaults.length} ACTIVE FAULT{activeFaults.length > 1 ? 'S' : ''} INJECTED — MULTI-FAULT MODE
                </div>
                <div className="text-[11px] font-mono text-hud-textBright">
                  Peak Severity: <strong className="text-white font-tabular">{(faultIntensity * 100).toFixed(0)}%</strong>
                </div>
              </div>
            </div>
            <button
              onClick={onClearFaults}
              className="px-3 py-1.5 rounded-md bg-hud-emerald text-black font-mono font-bold text-xs hover:bg-hud-emerald/90 transition-colors flex items-center gap-1.5 shadow-md shadow-hud-emerald/20 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> CLEAR ALL FAULTS
            </button>
          </div>
          {/* Individual fault pills with remove buttons */}
          <div className="flex flex-wrap gap-2 mt-1">
            {activeFaults.map((f) => (
              <span key={f} className="flex items-center gap-1.5 bg-hud-red/20 border border-hud-red/60 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold text-hud-red">
                {f}
                <button
                  onClick={() => onRemoveFault(f)}
                  className="hover:text-white transition-colors"
                  title={`Remove ${f}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 bg-hud-emerald/10 border border-hud-emerald/30 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-hud-emerald">
            <ShieldCheck className="w-4 h-4 text-hud-emerald" />
            <span>ENGINE RUNNING IN NOMINAL CRUISE ENVELOPE (NO ACTIVE FAULT INJECTION)</span>
          </div>
          <span className="text-[10px] font-mono text-hud-textMuted">Ready for scenario injection</span>
        </div>
      )}

      {/* TAB 1: FAULT INJECTION DECK */}
      {activeTab === 'FAULTS' && (
        <div className="space-y-4">
          
          {/* Controls: Ramp Duration & Severity Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-hud-card p-3 rounded-xl border border-hud-border/70">
            <div>
              <div className="flex justify-between text-xs font-mono text-hud-textMuted mb-1">
                <span>Degradation Ramp Rate:</span>
                <span className="text-hud-cyan font-bold font-tabular">{rampSec} Seconds</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={rampSec}
                onChange={(e) => setRampSec(Number(e.target.value))}
                className="w-full h-1.5 bg-hud-bg rounded-lg appearance-none cursor-pointer accent-hud-cyan"
              />
              <div className="flex justify-between text-[9px] font-mono text-hud-textMuted mt-1">
                <span>Instant (5s)</span>
                <span>Gradual (30s)</span>
                <span>Slow Drift (120s)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-hud-textMuted mb-1">
                <span>Target Severity Limit:</span>
                <span className="text-hud-amber font-bold font-tabular">{(severity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.1"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full h-1.5 bg-hud-bg rounded-lg appearance-none cursor-pointer accent-hud-amber"
              />
              <div className="flex justify-between text-[9px] font-mono text-hud-textMuted mt-1">
                <span>Mild (20%)</span>
                <span>Moderate (60%)</span>
                <span>Critical Red-line (100%)</span>
              </div>
            </div>
          </div>

          {/* 8 Fault Cards Grid — Multi-select supported */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {faultOptions.map((f) => {
              const Icon = f.icon;
              const isActive = activeFaults.includes(f.id);

              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    isActive 
                      ? 'bg-hud-red/15 border-hud-red shadow-md shadow-hud-red/20' 
                      : 'bg-hud-card/60 border-hud-border hover:border-hud-amber/60 hover:bg-hud-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono text-hud-cyan bg-hud-bg px-1.5 py-0.5 rounded border border-hud-border">
                        {f.code}
                      </span>
                      <Icon className={`w-3.5 h-3.5 ${f.color}`} />
                    </div>
                    <div className="text-xs font-mono font-bold text-white leading-tight">
                      {f.name}
                    </div>
                    <p className="text-[10px] text-hud-textMuted mt-1 line-clamp-2">
                      {f.desc}
                    </p>
                  </div>

                  {isActive ? (
                    <button
                      onClick={() => onRemoveFault(f.id)}
                      className="mt-2.5 w-full py-1.5 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all bg-hud-red/30 border border-hud-red text-hud-red hover:bg-hud-red hover:text-white"
                    >
                      <X className="w-3 h-3" /> REMOVE FAULT
                    </button>
                  ) : (
                    <button
                      onClick={() => onInjectFault(f.id, rampSec, severity)}
                      className="mt-2.5 w-full py-1.5 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all bg-hud-bg border border-hud-amber/50 text-hud-amber hover:bg-hud-amber hover:text-black"
                    >
                      <Play className="w-3 h-3" /> INJECT FAULT
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: MISSION PROFILES */}
      {activeTab === 'PROFILES' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {profileOptions.map((p) => {
            const isCurrent = currentPhase === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSetMissionProfile(p.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isCurrent 
                    ? 'bg-hud-cyan/15 border-hud-cyan shadow-md shadow-hud-cyan/20' 
                    : 'bg-hud-card/60 border-hud-border hover:border-hud-cyan/40 hover:bg-hud-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-white">
                    {p.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono bg-hud-cyan text-black px-1.5 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-hud-cyan mt-1">
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
