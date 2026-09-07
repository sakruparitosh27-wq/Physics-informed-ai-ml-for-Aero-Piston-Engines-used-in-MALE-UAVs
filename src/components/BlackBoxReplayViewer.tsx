import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, Rewind, 
  Layers, Clock, AlertTriangle, ShieldCheck, FileText, ChevronRight,
  Zap, Compass, Sliders, Activity, Flame, Wind, Droplets, ArrowRight, CheckCircle2
} from 'lucide-react';
import { 
  TelemetryFrameMessage, MissionHistoryItem, 
  WhatIfSimulationResponse, WhatIfStepFrame 
} from '../types/telemetry';
import { ParameterGaugesGrid } from './ParameterGaugesGrid';
import { PredictiveVsReactiveRadar } from './PredictiveVsReactiveRadar';
import { DigitalTwinEngineView } from './DigitalTwinEngineView';

interface BlackBoxReplayViewerProps {
  onOpenReportModalWithMission?: (missionId: string) => void;
}

export const BlackBoxReplayViewer: React.FC<BlackBoxReplayViewerProps> = ({ onOpenReportModalWithMission }) => {
  const [missionsList, setMissionsList] = useState<MissionHistoryItem[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [telemetryFrames, setTelemetryFrames] = useState<TelemetryFrameMessage[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // What-If Simulation State
  const [whatIfFault, setWhatIfFault] = useState<string>('COOLING_DEGRADATION');
  const [whatIfRamp, setWhatIfRamp] = useState<number>(20);
  const [whatIfSeverity, setWhatIfSeverity] = useState<number>(1.0);
  const [isSimulatingWhatIf, setIsSimulatingWhatIf] = useState<boolean>(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResponse | null>(null);
  const [whatIfFrameIdx, setWhatIfFrameIdx] = useState<number>(0);
  const [showWhatIfSection, setShowWhatIfSection] = useState<boolean>(true);

  const playbackTimerRef = useRef<number | null>(null);

  // Fetch list of available recorded missions
  useEffect(() => {
    fetch('/api/missions/history')
      .then(res => res.json())
      .then((data: MissionHistoryItem[]) => {
        setMissionsList(data);
        if (data.length > 0 && !selectedMissionId) {
          setSelectedMissionId(data[0].mission_id);
        }
      })
      .catch(err => console.error('Failed to load mission history:', err));
  }, []);

  // Fetch telemetry frames for the selected mission
  useEffect(() => {
    if (!selectedMissionId) return;

    setIsLoading(true);
    setIsPlaying(false);
    setWhatIfResult(null);
    fetch(`/api/missions/replay/${selectedMissionId}`)
      .then(res => res.json())
      .then(data => {
        setTelemetryFrames(data.frames || []);
        setCurrentFrameIdx(0);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load replay frames:', err);
        setIsLoading(false);
      });
  }, [selectedMissionId]);

  // Playback timer effect
  useEffect(() => {
    if (isPlaying && telemetryFrames.length > 0) {
      const intervalMs = Math.max(50, 500 / playbackSpeed);
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentFrameIdx(prev => {
          if (prev >= telemetryFrames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, telemetryFrames]);

  const activeFrame = telemetryFrames[currentFrameIdx] || null;
  const totalFrames = telemetryFrames.length;

  const currentFlightTimeSec = activeFrame?.telemetry?.flight_time_sec ?? 0;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Run What-If Fault Simulation at the current scrubber point
  const handleRunWhatIfSimulation = async () => {
    if (!selectedMissionId) return;
    setIsSimulatingWhatIf(true);
    try {
      const res = await fetch(
        `/api/missions/whatif?mission_id=${encodeURIComponent(selectedMissionId)}&fault_type=${encodeURIComponent(whatIfFault)}&inject_at_sec=${currentFlightTimeSec}&ramp_sec=${whatIfRamp}&severity=${whatIfSeverity}`,
        { method: 'POST' }
      );
      const data: WhatIfSimulationResponse = await res.json();
      setWhatIfResult(data);
      setWhatIfFrameIdx(0);
    } catch (err) {
      console.error('Failed to run what-if simulation:', err);
    } finally {
      setIsSimulatingWhatIf(false);
    }
  };

  const faultOptions = [
    { id: 'COOLING_DEGRADATION', name: 'Cooling Radiator Loss', code: 'DRDO-FLT-03', icon: Wind },
    { id: 'LUBRICATION_ISSUE', name: 'Oil Pressure Loss', code: 'DRDO-FLT-04', icon: Droplets },
    { id: 'MISFIRE', name: 'Cylinder Spark Misfire', code: 'DRDO-FLT-01', icon: Flame },
    { id: 'INJECTOR_ABNORMALITY', name: 'Injector Flow Restriction', code: 'DRDO-FLT-02', icon: Sliders },
    { id: 'SENSOR_DRIFT', name: 'Sensor Drift / False Alarm', code: 'DRDO-FLT-05', icon: Activity },
    { id: 'ABNORMAL_VIBRATION', name: 'Propeller Unbalance', code: 'DRDO-FLT-08', icon: Zap },
  ];

  return (
    <div className="space-y-4">
      
      {/* Replay Control Header */}
      <div className="bg-hud-panel border border-hud-border rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Mission Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-hud-purple/15 border border-hud-purple/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-hud-purple" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-hud-purple uppercase tracking-wider block">
                BLACK-BOX FLIGHT RECORDER REPLAY
              </span>
              <select
                value={selectedMissionId}
                onChange={(e) => setSelectedMissionId(e.target.value)}
                className="bg-hud-card border border-hud-border rounded px-3 py-1 text-xs font-mono text-white focus:outline-none focus:border-hud-purple mt-0.5"
              >
                {missionsList.map((m) => (
                  <option key={m.mission_id} value={m.mission_id}>
                    {m.mission_name} ({m.profile_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrubber Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Step backward */}
            <button
              onClick={() => setCurrentFrameIdx(prev => Math.max(0, prev - 5))}
              className="p-2 rounded-lg bg-hud-card border border-hud-border text-hud-textMuted hover:text-white"
              title="Rewind 5 steps"
            >
              <Rewind className="w-4 h-4" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-hud-purple text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-hud-purple/20 hover:bg-hud-purple/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>

            {/* Step forward */}
            <button
              onClick={() => setCurrentFrameIdx(prev => Math.min(totalFrames - 1, prev + 5))}
              className="p-2 rounded-lg bg-hud-card border border-hud-border text-hud-textMuted hover:text-white"
              title="Forward 5 steps"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Reset to Start */}
            <button
              onClick={() => { setCurrentFrameIdx(0); setIsPlaying(false); }}
              className="p-2 rounded-lg bg-hud-card border border-hud-border text-hud-textMuted hover:text-hud-amber"
              title="Reset to 00:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Multipliers */}
            <div className="flex bg-hud-bg p-1 rounded-lg border border-hud-border">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    playbackSpeed === spd ? 'bg-hud-purple text-white' : 'text-hud-textMuted hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Time readout */}
            <div className="px-3 py-1.5 bg-hud-card border border-hud-border rounded-lg text-xs font-mono text-hud-textBright font-tabular flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-hud-purple" />
              <span>
                {activeFrame ? formatTime(activeFrame.telemetry.flight_time_sec) : '00:00'} / 
                {telemetryFrames.length > 0 ? formatTime(telemetryFrames[telemetryFrames.length - 1].telemetry.flight_time_sec) : '00:00'}
              </span>
            </div>

            {/* Debrief Report button */}
            {onOpenReportModalWithMission && (
              <button
                onClick={() => onOpenReportModalWithMission(selectedMissionId)}
                className="px-3 py-1.5 rounded-lg bg-hud-card border border-hud-border text-hud-cyan hover:border-hud-cyan/50 text-xs font-mono flex items-center gap-1"
                title="Open Mission Debrief Report"
              >
                <FileText className="w-3.5 h-3.5" /> DEBRIEF
              </button>
            )}

          </div>

        </div>

        {/* Interactive Timeline Scrubber Slider */}
        <div className="mt-4 pt-3 border-t border-hud-border/70">
          <div className="flex items-center justify-between text-xs font-mono text-hud-textMuted mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hud-purple animate-pulse" />
              Mission Timeline Scrubber
            </span>
            <span className="text-hud-cyan font-bold font-tabular">
              Position: T+{formatTime(currentFlightTimeSec)} ({currentFrameIdx + 1}/{totalFrames} frames)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, totalFrames - 1)}
            value={currentFrameIdx}
            onChange={(e) => setCurrentFrameIdx(Number(e.target.value))}
            className="w-full h-2.5 bg-hud-bg rounded-lg appearance-none cursor-pointer accent-hud-purple"
          />
          <div className="flex justify-between text-[10px] font-mono text-hud-textMuted mt-1">
            <span>START (T+00:00)</span>
            <span className="text-hud-purple font-bold">DRAG SLIDER TO REPLAY ANY FLIGHT STAGE</span>
            <span>END OF SORTIE</span>
          </div>
        </div>

      </div>

      {/* ── WHAT-IF FAULT INJECTION & PROGNOSTIC SIMULATION SECTION ── */}
      <div className="bg-hud-panel border border-hud-cyan/40 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 border-b border-hud-border pb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-hud-cyan" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                What-If Scenario Simulator: Inject Fault at T+{formatTime(currentFlightTimeSec)}
              </h3>
              <p className="text-[11px] text-hud-textMuted font-sans">
                Branch off this exact past mission state, inject a fault, and simulate what would have happened to the UAV powertrain.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWhatIfSection(!showWhatIfSection)}
            className="text-xs font-mono text-hud-cyan hover:underline"
          >
            {showWhatIfSection ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>

        {showWhatIfSection && (
          <div className="space-y-4">
            {/* Fault Selection & Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fault Type Selector */}
              <div>
                <label className="text-[11px] font-mono text-hud-textMuted block mb-1">
                  Hypothetical Failure Mode to Inject:
                </label>
                <select
                  value={whatIfFault}
                  onChange={(e) => setWhatIfFault(e.target.value)}
                  className="w-full bg-hud-card border border-hud-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-hud-cyan"
                >
                  {faultOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ramp Duration */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-hud-textMuted mb-1">
                  <span>Degradation Ramp Rate:</span>
                  <span className="text-hud-cyan font-bold">{whatIfRamp}s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={whatIfRamp}
                  onChange={(e) => setWhatIfRamp(Number(e.target.value))}
                  className="w-full h-2 bg-hud-bg rounded-lg appearance-none cursor-pointer accent-hud-cyan mt-2"
                />
              </div>

              {/* Run Button */}
              <div className="flex items-end">
                <button
                  onClick={handleRunWhatIfSimulation}
                  disabled={isSimulatingWhatIf}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-hud-cyan/80 to-blue-600 hover:from-hud-cyan hover:to-blue-500 text-black font-mono font-bold text-xs rounded-lg shadow-lg shadow-hud-cyan/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulatingWhatIf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      SIMULATING AERO PHYSICS...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black" />
                      SIMULATE WHAT COULD GO WRONG
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simulation Results Display */}
            {whatIfResult && (
              <div className="bg-hud-card border border-hud-amber/50 rounded-xl p-4 space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-hud-border/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-hud-amber" />
                    <div>
                      <span className="text-[10px] font-mono text-hud-amber uppercase tracking-wider block">
                        WHAT-IF SIMULATION OUTCOME & AI DIAGNOSIS
                      </span>
                      <h4 className="text-sm font-bold font-mono text-white">
                        Injected {whatIfResult.whatif_fault} at Flight Time T+{formatTime(whatIfResult.inject_at_flight_sec)}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-hud-bg border border-hud-border px-2.5 py-1 rounded text-hud-cyan font-tabular">
                    Simulated 60s Forward ({whatIfResult.total_steps} steps)
                  </span>
                </div>

                {/* Outcome KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-hud-bg/80 p-2.5 rounded-lg border border-hud-border">
                    <span className="text-[10px] font-mono text-hud-textMuted uppercase block">Projected Health</span>
                    <span className={`text-base font-bold font-mono font-tabular ${
                      whatIfResult.outcome_summary.final_health_index < 50 ? 'text-hud-red' : 'text-hud-amber'
                    }`}>
                      {whatIfResult.outcome_summary.final_health_index.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-mono text-hud-textMuted block">
                      Status: {whatIfResult.outcome_summary.final_health_status}
                    </span>
                  </div>

                  <div className="bg-hud-bg/80 p-2.5 rounded-lg border border-hud-border">
                    <span className="text-[10px] font-mono text-hud-textMuted uppercase block">Projected RUL</span>
                    <span className="text-base font-bold font-mono font-tabular text-hud-red">
                      {whatIfResult.outcome_summary.final_rul_hours.toFixed(1)} HRS
                    </span>
                    <span className="text-[10px] font-mono text-hud-textMuted block">
                      TBO Degraded
                    </span>
                  </div>

                  <div className="bg-hud-bg/80 p-2.5 rounded-lg border border-hud-border">
                    <span className="text-[10px] font-mono text-hud-textMuted uppercase block">Safe Divert Window</span>
                    <span className="text-base font-bold font-mono font-tabular text-hud-amber">
                      {whatIfResult.outcome_summary.final_safe_flight_min.toFixed(1)} MIN
                    </span>
                    <span className="text-[10px] font-mono text-hud-textMuted block">
                      {whatIfResult.outcome_summary.is_emergency_at_end ? 'Emergency Divert' : 'Caution'}
                    </span>
                  </div>

                  <div className="bg-hud-bg/80 p-2.5 rounded-lg border border-hud-border">
                    <span className="text-[10px] font-mono text-hud-textMuted uppercase block">AI Early Detection</span>
                    <span className="text-base font-bold font-mono font-tabular text-hud-cyan">
                      {whatIfResult.outcome_summary.ai_first_anomaly_at_sec !== null
                        ? `T+${formatTime(whatIfResult.outcome_summary.ai_first_anomaly_at_sec)}`
                        : 'Immediate'}
                    </span>
                    <span className="text-[10px] font-mono text-hud-textMuted block">
                      Pre-threshold lead
                    </span>
                  </div>
                </div>

                {/* AI Tactical Recommendation for What Could Go Wrong */}
                <div className="bg-hud-red/10 border border-hud-red/30 rounded-lg p-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-hud-red font-bold uppercase mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> What Would Go Wrong & Required Action:
                  </div>
                  <p className="text-hud-textBright leading-relaxed">
                    {whatIfResult.outcome_summary.tactical_recommendation}
                  </p>
                  <p className="text-[11px] text-hud-cyan mt-1.5">
                    <strong>Diagnosis:</strong> {whatIfResult.outcome_summary.detected_fault}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Live View for the Selected Replay Frame */}
      {activeFrame ? (
        <div className="space-y-4">
          <PredictiveVsReactiveRadar currentFrame={activeFrame} />
          <DigitalTwinEngineView currentFrame={activeFrame} />
          <ParameterGaugesGrid currentFrame={activeFrame} />
        </div>
      ) : (
        <div className="bg-hud-panel border border-hud-border rounded-xl p-12 text-center text-sm font-mono text-hud-textMuted">
          {isLoading ? 'Loading black-box mission flight frames...' : 'No telemetry data loaded for this mission.'}
        </div>
      )}

    </div>
  );
};
