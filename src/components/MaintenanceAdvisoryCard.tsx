import React from 'react';
import { 
  Wrench, Clock, BookOpen, 
  AlertOctagon, ShieldAlert, Navigation, Radio, Crosshair
} from 'lucide-react';
import { TelemetryFrameMessage } from '../types/telemetry';

interface MaintenanceAdvisoryCardProps {
  currentFrame: TelemetryFrameMessage | null;
}

export const MaintenanceAdvisoryCard: React.FC<MaintenanceAdvisoryCardProps> = ({ currentFrame }) => {
  const advisory = currentFrame?.advisory;
  const fault = currentFrame?.fault;
  const rul = currentFrame?.rul;

  const isNominal = fault?.fault_code === 'NOMINAL-00' || !fault;
  const isEmergency = advisory?.action_type === 'DIVERT_IMMEDIATE';
  const isMultiFault = (fault?.active_faults_count ?? 0) > 1;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DIVERT_IMMEDIATE': return 'bg-hud-red/20 text-hud-red border-hud-red';
      case 'INSPECT': return 'bg-hud-amber/20 text-hud-amber border-hud-amber';
      case 'SERVICE': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'CALIBRATE': return 'bg-hud-cyan/20 text-hud-cyan border-hud-cyan';
      case 'OVERHAUL': return 'bg-hud-purple/20 text-hud-purple border-hud-purple';
      default: return 'bg-hud-emerald/20 text-hud-emerald border-hud-emerald';
    }
  };

  const getSeverityIcon = () => {
    if (isEmergency) return <AlertOctagon className="w-5 h-5 text-hud-red animate-pulse" />;
    if (!isNominal) return <ShieldAlert className="w-5 h-5 text-hud-amber" />;
    return <Wrench className="w-5 h-5 text-hud-cyan" />;
  };

  const formatSafeTime = (min: number) => {
    if (min >= 60) {
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return `${h}h ${m}m`;
    }
    return `${min.toFixed(1)} min`;
  };

  return (
    <div className={`bg-hud-panel border rounded-xl p-4 md:p-5 shadow-xl transition-all ${
      isEmergency ? 'border-hud-red/60' : 'border-hud-border'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 border-b border-hud-border/70 pb-3">
        <div className="flex items-center gap-2">
          {getSeverityIcon()}
          <div>
            <h2 className="text-base font-bold tracking-wide text-white uppercase font-mono">
              {isEmergency ? 'Emergency Tactical Directive & Divert Guidance' : 'AI Predictive Maintenance Directive'}
            </h2>
            <span className="text-xs text-hud-textMuted font-sans">
              {isEmergency
                ? 'GCS Operator In-Flight Emergency Protocol'
                : 'Synthesized Prognostic Advisory — DRDO MALE UAV AMM Reference'}
            </span>
          </div>
        </div>

        {advisory && (
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase border ${getActionColor(advisory.action_type)}`}>
            {advisory.action_type}
          </div>
        )}
      </div>

      {advisory ? (
        <div className="space-y-3.5">
          
          {/* Multi-Fault Banner */}
          {isMultiFault && (
            <div className="bg-hud-red/10 border border-hud-red/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-hud-red shrink-0" />
              <span className="text-xs font-mono text-hud-red font-bold">
                COMPOUND MULTI-FAULT: {fault?.active_faults_count} concurrent failures detected — {fault?.detected_faults_list?.map(f => f.fault_code).join(' + ')}
              </span>
            </div>
          )}

          {/* Advisory Header Summary */}
          <div className="bg-hud-card p-3.5 rounded-xl border border-hud-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-hud-cyan tracking-wider uppercase block">
                  ADVISORY REF: {advisory.advisory_id} • CRITICALITY: {advisory.safety_criticality}
                </span>
                <h3 className="text-sm font-bold font-mono text-white mt-0.5">
                  {advisory.headline}
                </h3>
              </div>

              {/* Safe Flight Window */}
              <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border shrink-0 ${
                isEmergency
                  ? 'bg-hud-red/10 border-hud-red/50 text-hud-red'
                  : 'bg-hud-bg/80 border-hud-border/50 text-hud-textMuted'
              }`}>
                <Clock className={`w-4 h-4 ${isEmergency ? 'text-hud-red animate-pulse' : 'text-hud-amber'}`} />
                <span>{isEmergency ? 'Safe Divert Window:' : 'Flight Endurance:'}</span>
                <strong className={`font-tabular ${isEmergency ? 'text-hud-red' : 'text-hud-emerald'}`}>
                  {formatSafeTime(advisory.safe_flight_window_min)}
                </strong>
              </div>
            </div>

            {/* Diagnostic Root Cause Evidence */}
            {fault?.root_cause_summary && (
              <p className="text-xs text-hud-textBright font-mono mt-2.5 pt-2.5 border-t border-hud-border/50 leading-relaxed">
                <span className="text-hud-cyan">Diagnostic Synthesis:</span> {fault.root_cause_summary}
              </p>
            )}
          </div>

          {/* ── TACTICAL FLIGHT DIRECTIVE (replaces ground crew checklist) ── */}
          <div className={`rounded-xl border p-3.5 ${
            isEmergency
              ? 'bg-hud-red/10 border-hud-red/40'
              : 'bg-hud-card border-hud-border'
          }`}>
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-hud-textMuted">
              {isEmergency ? (
                <><Navigation className="w-3.5 h-3.5 text-hud-red" /> GCS OPERATOR TACTICAL DIRECTIVE</>
              ) : (
                <><Radio className="w-3.5 h-3.5 text-hud-cyan" /> GCS MISSION COMMANDER ADVISORY</>
              )}
            </h4>
            <p className={`text-xs font-mono leading-relaxed ${
              isEmergency ? 'text-hud-red font-bold' : 'text-hud-textBright'
            }`}>
              {advisory.tactical_flight_directive}
            </p>

            {/* Recommended Timeframe */}
            <div className="mt-2.5 pt-2.5 border-t border-hud-border/40 text-[11px] font-mono text-hud-textMuted flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-hud-cyan" />
              <span>Action Window: </span>
              <strong className="text-white">{advisory.recommended_timeframe}</strong>
            </div>
          </div>

          {/* Sub-fault breakdown if multiple */}
          {isMultiFault && (fault?.detected_faults_list?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-hud-textMuted tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-hud-amber" /> Active Failure Mode Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fault.detected_faults_list.map((item, idx) => (
                  <div key={idx} className="bg-hud-card/60 border border-hud-border/40 rounded-lg px-3 py-2 text-xs font-mono">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-hud-cyan text-[10px]">{item.fault_code}</span>
                      <span className={`text-[10px] font-bold ${
                        item.severity === 'CRITICAL' ? 'text-hud-red' :
                        item.severity === 'HIGH' ? 'text-hud-amber' : 'text-yellow-400'
                      }`}>{item.severity}</span>
                    </div>
                    <div className="text-white font-bold truncate">{item.fault_name.split(' (')[0]}</div>
                    <div className="text-hud-textMuted text-[10px] mt-0.5 truncate">{item.affected_component}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Manual Reference */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-hud-border/60 text-xs font-mono text-hud-textMuted">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-hud-cyan" />
              <span>AMM Reference: <strong className="text-white">{advisory.technical_reference}</strong></span>
            </span>
            <span>
              Est. Downtime: <strong className="text-hud-cyan font-tabular">{advisory.estimated_downtime_hours} hrs</strong>
            </span>
          </div>

        </div>
      ) : (
        <div className="bg-hud-card p-6 rounded-xl border border-hud-border text-center text-xs font-mono text-hud-textMuted">
          Awaiting telemetry stream for maintenance directive generation...
        </div>
      )}
    </div>
  );
};
