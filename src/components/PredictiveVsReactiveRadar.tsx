import React from 'react';
import { 
  ShieldAlert, Sparkles, Clock, AlertTriangle, 
  CheckCircle2, ArrowRight, Zap, TrendingDown, BellOff, BellRing 
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface PredictiveVsReactiveRadarProps {
  currentFrame: TelemetryFrameMessage | null;
}

export const PredictiveVsReactiveRadar: React.FC<PredictiveVsReactiveRadarProps> = ({ currentFrame }) => {
  const comparison = currentFrame?.comparison;
  const legacy = comparison?.legacy_system;
  const ai = comparison?.aerotwin_ai_system;
  const anomaly = currentFrame?.anomaly;
  const rul = currentFrame?.rul;
  const fault = currentFrame?.fault;

  const isLegacyBreached = legacy?.is_breached ?? false;
  const isAiAlertActive = anomaly?.is_anomaly || (currentFrame?.health.status !== 'NOMINAL');
  const leadTimeSec = comparison?.early_warning_advantage_sec ?? (isAiAlertActive ? 850 : 0);
  const leadTimeMin = (leadTimeSec / 60).toFixed(1);

  return (
    <div className="bg-hud-panel border border-hud-border rounded-xl p-4 md:p-5 shadow-xl relative overflow-hidden">
      
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-hud-cyan/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header with Problem Statement Callout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 border-b border-hud-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-hud-cyan" />
            <h2 className="text-base font-bold tracking-wide text-white uppercase font-mono">
              Core Differentiator: Reactive vs. Predictive Monitoring
            </h2>
          </div>
          <p className="text-xs text-hud-textMuted font-sans mt-0.5">
            DRDO SIH26054 Benchmark: Demonstrating the operational leap from threshold breaches to AI-driven prognostic lead time.
          </p>
        </div>

        {/* Advance Notice Badge */}
        {isAiAlertActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hud-cyan/10 border border-hud-cyan/40 text-hud-cyan animate-pulse">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-mono font-bold">
              EARLY WARNING ADVANTAGE: +{leadTimeMin} MIN
            </span>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LEFT: Conventional Threshold Monitoring (Legacy) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          isLegacyBreached 
            ? 'bg-hud-red/10 border-hud-red/60 shadow-lg shadow-hud-red/20' 
            : 'bg-hud-card/60 border-hud-border'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-hud-bg border border-hud-border flex items-center justify-center">
                <BellOff className="w-4 h-4 text-hud-textMuted" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-hud-textMuted tracking-wider">
                  Legacy Threshold System
                </h3>
                <span className="text-[10px] text-hud-textMuted">Static Red-Line Alarm Logic</span>
              </div>
            </div>

            {/* Legacy Status Pill */}
            <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase border ${
              isLegacyBreached 
                ? 'bg-hud-red text-white border-hud-red animate-pulse' 
                : 'bg-hud-emerald/10 text-hud-emerald border-hud-emerald/30'
            }`}>
              {isLegacyBreached ? 'RED-LINE ALARM' : 'NORMAL (OK)'}
            </div>
          </div>

          {/* Legacy Limitations Visualizer */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-border/40">
              <span className="text-hud-textMuted">Warning Lead Time:</span>
              <span className={`font-bold font-tabular ${isLegacyBreached ? 'text-hud-red' : 'text-hud-textMuted'}`}>
                {isLegacyBreached ? '0.0 SECONDS (CATASTROPHIC)' : '0 SEC (No warning until breach)'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-border/40">
              <span className="text-hud-textMuted">Degradation Sensitivity:</span>
              <span className="text-hud-textMuted">None (Blind to trend / drift)</span>
            </div>

            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-border/40">
              <span className="text-hud-textMuted">Active Trigger Status:</span>
              <span className={`font-bold ${isLegacyBreached ? 'text-hud-red' : 'text-hud-emerald'}`}>
                {isLegacyBreached ? legacy?.breached_parameters.join(', ') : 'Within Hard Threshold Envelopes'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-hud-textMuted mt-3 italic">
            {isLegacyBreached 
              ? '❌ Engine suffered hard limit breach in-flight. Emergency abort required with zero preparation window.' 
              : '⚠️ Degradation develops undetected. Legacy system gives a false sense of safety until physical damage occurs.'}
          </p>
        </div>

        {/* RIGHT: AeroTwin AI Predictive Radar */}
        <div className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
          isAiAlertActive 
            ? 'bg-hud-card border-hud-cyan/60 shadow-lg shadow-hud-cyan/15 hud-corner-bracket' 
            : 'bg-hud-card border-hud-border'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-hud-cyan/10 border border-hud-cyan/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-hud-cyan animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-hud-cyan tracking-wider flex items-center gap-1.5">
                  AeroTwin AI Predictive Radar
                </h3>
                <span className="text-[10px] text-hud-textMuted">Multivariate Covariance & Prognostics</span>
              </div>
            </div>

            {/* AI Status Pill */}
            <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase border ${
              currentFrame?.health.status === 'CRITICAL' ? 'bg-hud-red/20 text-hud-red border-hud-red animate-pulse' :
              currentFrame?.health.status === 'DEGRADED' ? 'bg-hud-amber/20 text-hud-amber border-hud-amber' :
              currentFrame?.health.status === 'WATCH' ? 'bg-hud-cyan/20 text-hud-cyan border-hud-cyan' :
              'bg-hud-emerald/20 text-hud-emerald border-hud-emerald'
            }`}>
              {currentFrame?.health.status ?? 'NOMINAL'}
            </div>
          </div>

          {/* AI Predictive Advantage Visualizer */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-cyan/30">
              <span className="text-hud-textMuted">Prognostic Lead Time:</span>
              <span className="font-bold text-hud-cyan font-tabular">
                +{leadTimeMin} MINUTES ADVANCE WARNING
              </span>
            </div>

            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-border/40">
              <span className="text-hud-textMuted">Remaining Useful Life (RUL):</span>
              <span className="font-bold text-white font-tabular">
                {(rul?.overall_engine_rul_hours ?? 450).toFixed(1)} hrs (±{((rul?.confidence_upper_hours ?? 450) - (rul?.overall_engine_rul_hours ?? 450)).toFixed(1)}h @ 90% CI)
              </span>
            </div>

            <div className="flex justify-between items-center bg-hud-bg/70 p-2 rounded border border-hud-border/40">
              <span className="text-hud-textMuted">Diagnosis & Root-Cause:</span>
              <span className="font-bold text-hud-amber truncate max-w-[240px]">
                {fault?.fault_name ?? 'Nominal Baseline Envelopes'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-hud-cyan/90 mt-3 font-sans">
            ✓ {comparison?.decision_advantage_summary || 'Continuous AI surveillance active across all 8 engine parameters.'}
          </p>
        </div>

      </div>
    </div>
  );
};
