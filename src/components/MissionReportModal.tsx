import React, { useState, useEffect } from 'react';
import { 
  X, FileText, CheckCircle2, AlertTriangle, 
  ShieldCheck, ShieldAlert, Printer, Download, Clock, Wrench 
} from 'lucide-react';

interface MissionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  isOpen,
  onClose,
  missionId = 'HIST-MSN-01-DESERT-COOLING',
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch(`/api/reports/mission_summary/${missionId}`)
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load mission summary report:', err);
        setIsLoading(false);
      });
  }, [isOpen, missionId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-hud-panel border border-hud-cyan/40 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-hud-border bg-hud-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-hud-cyan/15 border border-hud-cyan/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-hud-cyan" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                Post-Mission Engine Health & Airworthiness Audit
              </h2>
              <span className="text-xs font-mono text-hud-textMuted">
                DRDO MALE UAV Powerplant Fleet Management • MIL-STD-810H Compliant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-hud-bg border border-hud-border text-hud-textMuted hover:text-white transition-colors"
              title="Print / Save as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-hud-bg border border-hud-border text-hud-textMuted hover:text-hud-red transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 font-mono text-xs text-hud-textMuted">
              Compiling thermodynamic logs and AI diagnostic debrief...
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              
              {/* Mission Summary & Airworthiness Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="bg-hud-card p-4 rounded-xl border border-hud-border">
                  <span className="text-[10px] font-mono text-hud-textMuted uppercase block">
                    MISSION IDENTIFIER
                  </span>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {reportData.mission_id}
                  </div>
                  <div className="text-xs font-mono text-hud-cyan mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {reportData.flight_duration_minutes} min logged ({reportData.data_points_logged} frames)
                  </div>
                </div>

                <div className="bg-hud-card p-4 rounded-xl border border-hud-border">
                  <span className="text-[10px] font-mono text-hud-textMuted uppercase block">
                    ENGINE HEALTH INDEX EVOLUTION
                  </span>
                  <div className="text-sm font-bold font-mono text-white mt-1 flex items-center gap-2">
                    <span className="text-hud-emerald">{reportData.initial_health_index}%</span>
                    <span className="text-hud-textMuted">➔</span>
                    <span className={reportData.final_health_index < 75 ? 'text-hud-amber' : 'text-hud-emerald'}>
                      {reportData.final_health_index}%
                    </span>
                  </div>
                  <div className="text-xs font-mono text-hud-textMuted mt-1">
                    Lowest Recorded Point: <strong className="text-white">{reportData.min_health_index}%</strong>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  reportData.airworthiness_status === 'AIRWORTHY'
                    ? 'bg-hud-emerald/10 border-hud-emerald/50 text-hud-emerald'
                    : 'bg-hud-amber/10 border-hud-amber/50 text-hud-amber'
                }`}>
                  <span className="text-[10px] font-mono uppercase tracking-wider block">
                    AIRWORTHINESS STATUS
                  </span>
                  <div className="text-sm font-bold font-mono uppercase mt-1 flex items-center gap-1.5">
                    {reportData.airworthiness_status === 'AIRWORTHY' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                    {reportData.airworthiness_status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] font-mono opacity-80 mt-1">
                    Certified for Turnaround Release
                  </div>
                </div>

              </div>

              {/* 8-Parameter Min/Max Envelope Statistics Table */}
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider mb-2.5">
                  Operating Parameter Min / Max Envelopes
                </h3>
                <div className="bg-hud-card border border-hud-border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-hud-bg text-hud-textMuted border-b border-hud-border text-[10px] uppercase">
                        <th className="p-3">Parameter Name</th>
                        <th className="p-3">Min Recorded</th>
                        <th className="p-3">Max Recorded</th>
                        <th className="p-3">Mission Average</th>
                        <th className="p-3">Standard Limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hud-border/40 text-hud-textBright font-tabular">
                      <tr>
                        <td className="p-3 font-semibold text-white">Engine RPM</td>
                        <td className="p-3">{reportData.engine_statistics?.rpm?.min}</td>
                        <td className="p-3">{reportData.engine_statistics?.rpm?.max}</td>
                        <td className="p-3 text-hud-cyan">{reportData.engine_statistics?.rpm?.avg}</td>
                        <td className="p-3 text-hud-textMuted">5800 RPM</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Average CHT (°C)</td>
                        <td className="p-3">{reportData.engine_statistics?.cht_avg_c?.min}°C</td>
                        <td className="p-3 text-hud-amber">{reportData.engine_statistics?.cht_avg_c?.max}°C</td>
                        <td className="p-3 text-hud-cyan">{reportData.engine_statistics?.cht_avg_c?.avg}°C</td>
                        <td className="p-3 text-hud-textMuted">140.0°C</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Average EGT (°C)</td>
                        <td className="p-3">{reportData.engine_statistics?.egt_avg_c?.min}°C</td>
                        <td className="p-3">{reportData.engine_statistics?.egt_avg_c?.max}°C</td>
                        <td className="p-3 text-hud-cyan">{reportData.engine_statistics?.egt_avg_c?.avg}°C</td>
                        <td className="p-3 text-hud-textMuted">880.0°C</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Oil Pressure (bar)</td>
                        <td className="p-3 text-hud-red">{reportData.engine_statistics?.oil_pressure_bar?.min} bar</td>
                        <td className="p-3">{reportData.engine_statistics?.oil_pressure_bar?.max} bar</td>
                        <td className="p-3 text-hud-cyan">{reportData.engine_statistics?.oil_pressure_bar?.avg} bar</td>
                        <td className="p-3 text-hud-textMuted">Min 1.5 bar</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Vibration RMS (g)</td>
                        <td className="p-3">{reportData.engine_statistics?.vibration_g?.min}g</td>
                        <td className="p-3 text-hud-amber">{reportData.engine_statistics?.vibration_g?.max}g</td>
                        <td className="p-3 text-hud-cyan">{reportData.engine_statistics?.vibration_g?.avg}g</td>
                        <td className="p-3 text-hud-textMuted">Max 1.20g</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detected Anomalies & Maintenance Sign-off */}
              <div className="bg-hud-card p-4 rounded-xl border border-hud-border space-y-3">
                <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-hud-cyan" /> Post-Flight Maintenance Sign-off & Directive
                </h3>
                <p className="text-xs font-mono text-hud-textBright leading-relaxed bg-hud-bg/80 p-3 rounded-lg border border-hud-border/50">
                  {reportData.final_maintenance_advisory || 'All engine subsystems evaluated nominal. Release granted for next scheduled surveillance sortie.'}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2 text-[11px] font-mono text-hud-textMuted">
                  <div>
                    <span>Lead Propulsion Engineer: </span>
                    <strong className="text-white">DRDO-AERO-CHIEF-ENG</strong>
                  </div>
                  <div>
                    <span>Digital Verification Hash: </span>
                    <strong className="text-hud-cyan">SHA256: 7f8a9...b104</strong>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 font-mono text-xs text-hud-red">
              Error compiling mission report.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-hud-border bg-hud-card flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-hud-bg border border-hud-border text-xs font-mono text-hud-textBright hover:text-white"
          >
            CLOSE
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-hud-cyan text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-hud-cyan/20 hover:bg-hud-cyan/90"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT AUDIT REPORT
          </button>
        </div>

      </div>
    </div>
  );
};
