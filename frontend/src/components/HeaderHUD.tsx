import React from 'react';
import { 
  Activity, Cpu, Radio, RotateCcw, 
  Layers, Gauge, Plane, FileText, Clock, AlertTriangle, Fuel
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface HeaderHUDProps {
  currentFrame: TelemetryFrameMessage | null;
  isConnected: boolean;
  activeView: 'OPERATOR' | 'ENGINEER' | 'REPLAY';
  setActiveView: (view: 'OPERATOR' | 'ENGINEER' | 'REPLAY') => void;
  onOpenReportModal: () => void;
  onResetSimulation: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  currentFrame,
  isConnected,
  activeView,
  setActiveView,
  onOpenReportModal,
  onResetSimulation,
}) => {
  const health = currentFrame?.health;
  const telemetry = currentFrame?.telemetry;
  const rul = currentFrame?.rul;

  const healthScore = health?.overall_health_index ?? 100.0;
  const healthStatus = health?.status ?? 'NOMINAL';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOMINAL': return 'text-hud-emerald border-hud-emerald/40 bg-hud-emerald/10';
      case 'WATCH': return 'text-hud-cyan border-hud-cyan/40 bg-hud-cyan/10';
      case 'DEGRADED': return 'text-hud-amber border-hud-amber/40 bg-hud-amber/10';
      case 'CRITICAL': return 'text-hud-red border-hud-red/40 bg-hud-red/10 animate-pulse';
      default: return 'text-hud-emerald border-hud-emerald/40 bg-hud-emerald/10';
    }
  };

  const getGaugeStroke = (status: string) => {
    switch (status) {
      case 'NOMINAL': return '#10b981';
      case 'WATCH': return '#00f0ff';
      case 'DEGRADED': return '#f59e0b';
      case 'CRITICAL': return '#ef4444';
      default: return '#10b981';
    }
  };

  const formatFlightTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSafeFlightTime = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return `${h}h ${m}m`;
    }
    return `${minutes.toFixed(1)} min`;
  };

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const isEmergency = rul?.is_emergency_divert_required ?? false;
  const safeFlightMin = rul?.safe_flight_time_remaining_min ?? (rul?.nominal_fuel_endurance_hours ?? 6) * 60;
  const activeFaultCount = (telemetry?.active_faults ?? []).length;

  return (
    <header className="bg-hud-panel border-b border-hud-border px-4 py-3 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-[1750px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Branding & Status Badge */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 rounded-lg bg-hud-card border border-hud-cyan/40 flex items-center justify-center shadow-lg shadow-hud-cyan/10">
              <Cpu className="w-6 h-6 text-hud-cyan animate-pulse" />
            </div>
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-hud-emerald rounded-full border-2 border-hud-panel shadow-sm shadow-hud-emerald animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-white flex items-center gap-1.5">
                AERO<span className="text-hud-cyan">TWIN</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-hud-border text-hud-cyan border border-hud-cyan/30 rounded">
                SIH26054 / DRDO
              </span>
            </div>
            <p className="text-xs text-hud-textMuted font-mono flex items-center gap-2">
              <span>MALE UAV DIGITAL TWIN</span>
              <span>•</span>
              <span className="text-hud-emerald flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> {isConnected ? 'LIVE 2.0Hz' : 'OFFLINE'}
              </span>
              {activeFaultCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-hud-red font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> {activeFaultCount} FAULT{activeFaultCount > 1 ? 'S' : ''}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center: Live Flight Context & Composite Health Meter */}
        <div className="flex items-center gap-4 bg-hud-card/80 px-4 py-2 rounded-xl border border-hud-border flex-wrap justify-center">
          
          {/* Circular Engine Health Index */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r={radius} stroke="#1f2f53" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32" cy="32" r={radius}
                  stroke={getGaugeStroke(healthStatus)}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-sm font-bold tracking-tighter text-white font-tabular">
                  {healthScore.toFixed(0)}
                </span>
                <span className="text-[8px] text-hud-textMuted uppercase -mt-0.5">EHI</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-mono text-hud-textMuted tracking-wider">
                ENGINE HEALTH
              </div>
              <div className={`px-2 py-0.5 mt-0.5 text-xs font-mono font-bold uppercase rounded border ${getStatusColor(healthStatus)}`}>
                {healthStatus}
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-hud-border hidden sm:block" />

          {/* Mission Phase & Flight Time */}
          <div className="hidden sm:flex flex-col">
            <div className="text-[10px] uppercase font-mono text-hud-textMuted tracking-wider flex items-center gap-1">
              <Plane className="w-3 h-3 text-hud-cyan" /> MISSION PHASE
            </div>
            <div className="text-sm font-mono font-bold text-hud-cyan tracking-wide mt-0.5">
              {telemetry?.mission_phase || 'CRUISE'}
            </div>
            <div className="text-[11px] font-mono text-hud-textMuted font-tabular">
              T+ {formatFlightTime(telemetry?.flight_time_sec ?? 0)}
            </div>
          </div>

          <div className="h-10 w-px bg-hud-border hidden md:block" />

          {/* RUL Countdown */}
          <div className="hidden md:flex flex-col">
            <div className="text-[10px] uppercase font-mono text-hud-textMuted tracking-wider">
              PROGNOSTIC RUL
            </div>
            <div className={`text-sm font-mono font-bold font-tabular mt-0.5 ${
              (rul?.overall_engine_rul_hours ?? 450) < 15 ? 'text-hud-red animate-pulse' : 'text-hud-textBright'
            }`}>
              {(rul?.overall_engine_rul_hours ?? 450).toFixed(1)} <span className="text-xs font-normal text-hud-textMuted">HRS</span>
            </div>
            <div className="text-[10px] font-mono text-hud-textMuted">
              LIMIT: <span className="text-hud-cyan">{rul?.limiting_subsystem || 'Thermal'}</span>
            </div>
          </div>

          <div className="h-10 w-px bg-hud-border hidden md:block" />

          {/* ── REMAINING SAFE FLIGHT TIME (NEW) ── */}
          <div className="flex flex-col">
            <div className="text-[10px] uppercase font-mono text-hud-textMuted tracking-wider flex items-center gap-1">
              {isEmergency ? (
                <AlertTriangle className="w-3 h-3 text-hud-red" />
              ) : (
                <Fuel className="w-3 h-3 text-hud-emerald" />
              )}
              {isEmergency ? 'DIVERT WINDOW' : 'FLIGHT ENDURANCE'}
            </div>
            <div className={`text-sm font-mono font-bold font-tabular mt-0.5 ${
              isEmergency
                ? safeFlightMin < 10 ? 'text-hud-red animate-pulse' : 'text-hud-amber'
                : 'text-hud-emerald'
            }`}>
              {formatSafeFlightTime(safeFlightMin)}
            </div>
            <div className="text-[10px] font-mono text-hud-textMuted">
              {isEmergency ? (
                <span className="text-hud-red">EMERGENCY DIVERT</span>
              ) : (
                <span>FUEL: {(telemetry?.fuel_remaining_liters ?? 0).toFixed(0)}L</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: View Toggles & Actions */}
        <div className="flex items-center gap-2">
          
          {/* View Mode Toggle Buttons */}
          <div className="flex bg-hud-bg p-1 rounded-lg border border-hud-border">
            <button
              onClick={() => setActiveView('OPERATOR')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'OPERATOR'
                  ? 'bg-hud-cyan text-black shadow-md shadow-hud-cyan/20'
                  : 'text-hud-textMuted hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> OPERATOR
            </button>
            <button
              onClick={() => setActiveView('ENGINEER')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'ENGINEER'
                  ? 'bg-hud-cyan text-black shadow-md shadow-hud-cyan/20'
                  : 'text-hud-textMuted hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> ENGINEER
            </button>
            <button
              onClick={() => setActiveView('REPLAY')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'REPLAY'
                  ? 'bg-hud-purple text-white shadow-md shadow-hud-purple/20'
                  : 'text-hud-textMuted hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> BLACK-BOX
            </button>
          </div>

          {/* Mission Health Debrief Report Modal Button */}
          <button
            onClick={onOpenReportModal}
            className="p-2 rounded-lg bg-hud-card border border-hud-border text-hud-textMuted hover:text-hud-cyan hover:border-hud-cyan/40 transition-colors"
            title="Generate Mission Health Audit Report"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Reset Simulation Button */}
          <button
            onClick={onResetSimulation}
            className="p-2 rounded-lg bg-hud-card border border-hud-border text-hud-textMuted hover:text-hud-amber hover:border-hud-amber/40 transition-colors"
            title="Reset Simulation / Clear Faults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Emergency Divert Banner */}
      {isEmergency && (
        <div className="max-w-[1750px] mx-auto mt-2 bg-hud-red/10 border border-hud-red/40 rounded-lg px-4 py-2 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-hud-red shrink-0 animate-pulse" />
          <p className="text-xs font-mono text-hud-red font-bold">
            TACTICAL ADVISORY: {rul?.tactical_divert_guidance ?? 'Engine degradation detected. Consider emergency divert.'}
          </p>
        </div>
      )}
    </header>
  );
};
