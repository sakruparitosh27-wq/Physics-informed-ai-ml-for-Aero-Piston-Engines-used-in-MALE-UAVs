import React, { useState } from 'react';
import { useTelemetryStream } from './hooks/useTelemetryStream';
import { HeaderHUD } from './components/HeaderHUD';
import { PredictiveVsReactiveRadar } from './components/PredictiveVsReactiveRadar';
import { DigitalTwinEngineView } from './components/DigitalTwinEngineView';
import { ParameterGaugesGrid } from './components/ParameterGaugesGrid';
import { EngineerTelemetryCharts } from './components/EngineerTelemetryCharts';
import { FaultInjectionPanel } from './components/FaultInjectionPanel';
import { MaintenanceAdvisoryCard } from './components/MaintenanceAdvisoryCard';
import { BlackBoxReplayViewer } from './components/BlackBoxReplayViewer';
import { MissionReportModal } from './components/MissionReportModal';

export function App() {
  const {
    currentFrame,
    isConnected,
    rollingHistory,
    injectFault,
    clearFaults,
    removeFault,
    setMissionProfile,
  } = useTelemetryStream();

  const [activeView, setActiveView] = useState<'OPERATOR' | 'ENGINEER' | 'REPLAY'>('OPERATOR');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportMissionId, setSelectedReportMissionId] = useState<string>('HIST-MSN-01-DESERT-COOLING');

  const handleOpenReportModal = (missionId?: string) => {
    if (missionId) setSelectedReportMissionId(missionId);
    setIsReportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-hud-bg text-hud-textBright flex flex-col selection:bg-hud-cyan selection:text-black">
      
      {/* 1. Cockpit Header HUD */}
      <HeaderHUD
        currentFrame={currentFrame}
        isConnected={isConnected}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenReportModal={() => handleOpenReportModal()}
        onResetSimulation={clearFaults}
      />

      {/* 2. Main Dashboard Workspace */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto p-4 space-y-4">
        
        {/* VIEW 1: OPERATOR VIEW (Streamlined HUD + Digital Twin + Differentiator Radar + Advisory + Fault Deck) */}
        {activeView === 'OPERATOR' && (
          <div className="space-y-4 animate-fade-in">
            {/* The Single Most Important Judging Differentiator */}
            <PredictiveVsReactiveRadar currentFrame={currentFrame} />

            {/* Virtual Engine 2.5D Digital Twin Schematic */}
            <DigitalTwinEngineView currentFrame={currentFrame} />

            {/* 8 Core Engine Parameter Telemetry Cards */}
            <ParameterGaugesGrid currentFrame={currentFrame} />

            {/* Predictive Maintenance Directives & SOP Checklist */}
            <MaintenanceAdvisoryCard currentFrame={currentFrame} />

            {/* Live Scenario & Fault Injection Deck */}
            <FaultInjectionPanel
              currentFrame={currentFrame}
              onInjectFault={injectFault}
              onClearFaults={clearFaults}
              onRemoveFault={removeFault}
              onSetMissionProfile={setMissionProfile}
            />
          </div>
        )}

        {/* VIEW 2: ENGINEER VIEW (Deep Multi-strip Time Series + FFT Spectrum + AI Attribution + Full Gauges) */}
        {activeView === 'ENGINEER' && (
          <div className="space-y-4 animate-fade-in">
            {/* Predictive vs Reactive Benchmark */}
            <PredictiveVsReactiveRadar currentFrame={currentFrame} />

            {/* Detailed Real-Time Multi-Strip Charts & FFT Spectrum */}
            <EngineerTelemetryCharts
              currentFrame={currentFrame}
              history={rollingHistory}
            />

            {/* Virtual Engine Digital Twin */}
            <DigitalTwinEngineView currentFrame={currentFrame} />

            {/* 8 Core Parameters Grid */}
            <ParameterGaugesGrid currentFrame={currentFrame} />

            {/* Scenario Deck */}
            <FaultInjectionPanel
              currentFrame={currentFrame}
              onInjectFault={injectFault}
              onClearFaults={clearFaults}
              onRemoveFault={removeFault}
              onSetMissionProfile={setMissionProfile}
            />
          </div>
        )}

        {/* VIEW 3: POST-FLIGHT BLACK-BOX REPLAY */}
        {activeView === 'REPLAY' && (
          <div className="space-y-4 animate-fade-in">
            <BlackBoxReplayViewer
              onOpenReportModalWithMission={handleOpenReportModal}
            />
          </div>
        )}

      </main>

      {/* 3. Footer */}
      <footer className="border-t border-hud-border py-3 px-4 bg-hud-panel text-center text-xs font-mono text-hud-textMuted">
        <div className="max-w-[1750px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            AeroTwin AI Digital Twin • Smart India Hackathon (SIH26054 / DRDO) Reference Solution
          </span>
          <span className="text-hud-cyan">
            DRDO TAPAS-BH-201 / Rotax 914 Turbo Aero Piston Class
          </span>
        </div>
      </footer>

      {/* 4. Post-Mission Health & Airworthiness Audit Report Modal */}
      <MissionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        missionId={selectedReportMissionId}
      />

    </div>
  );
}

export default App;
