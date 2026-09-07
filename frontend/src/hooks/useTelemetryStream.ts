import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryFrameMessage, FaultPresetInfo, MissionProfileInfo } from '../types/telemetry';

export interface RollingHistoryPoint {
  time: string;
  flightTimeSec: number;
  rpm: number;
  chtAvg: number;
  egtAvg: number;
  oilPressure: number;
  oilTemp: number;
  fuelFlow: number;
  vibration: number;
  anomalyScore: number;
  healthIndex: number;
  rulHours: number;
}

export function useTelemetryStream() {
  const [currentFrame, setCurrentFrame] = useState<TelemetryFrameMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [rollingHistory, setRollingHistory] = useState<RollingHistoryPoint[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      
      console.log('Connecting to AeroTwin WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryFrameMessage = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_UPDATE') {
            setCurrentFrame(data);

            // Update rolling time-series buffer (max 40 points = 20s history)
            setRollingHistory((prev) => {
              const nowTime = new Date(data.server_time * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const newPoint: RollingHistoryPoint = {
                time: nowTime,
                flightTimeSec: data.telemetry.flight_time_sec,
                rpm: data.telemetry.rpm,
                chtAvg: data.telemetry.cht_avg,
                egtAvg: data.telemetry.egt_avg,
                oilPressure: data.telemetry.oil_pressure_bar,
                oilTemp: data.telemetry.oil_temp_c,
                fuelFlow: data.telemetry.fuel_flow_lph,
                vibration: data.telemetry.vibration_amplitude_g,
                anomalyScore: data.anomaly.anomaly_score * 100,
                healthIndex: data.health.overall_health_index,
                rulHours: data.rul.overall_engine_rul_hours,
              };

              const updated = [...prev, newPoint];
              return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            });
          }
        } catch (err) {
          console.error('Error parsing telemetry frame:', err);
        }
      };

      ws.onclose = () => {
        console.warn('WebSocket disconnected. Attempting auto-reconnect in 2s...');
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setConnectionError('Connection offline. Retrying stream...');
      };
    } catch (e: any) {
      setConnectionError(e.message || 'Failed to initialize WebSocket');
      reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendCommand = useCallback((action: string, payload: Record<string, any> = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    } else {
      console.warn('Cannot send command: WebSocket not open');
    }
  }, []);

  const injectFault = useCallback((faultType: string, rampSec: number = 30.0, severity: number = 1.0) => {
    sendCommand('inject_fault', { fault_type: faultType, ramp_rate_sec: rampSec, target_severity: severity });
  }, [sendCommand]);

  const clearFaults = useCallback(() => {
    sendCommand('clear_faults');
  }, [sendCommand]);

  const removeFault = useCallback((faultType: string) => {
    fetch('/api/faults/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault_type: faultType }),
    }).catch((e) => console.error('removeFault error:', e));
  }, []);

  const setMissionProfile = useCallback((profile: string) => {
    sendCommand('set_profile', { profile });
  }, [sendCommand]);

  return {
    currentFrame,
    isConnected,
    rollingHistory,
    connectionError,
    injectFault,
    clearFaults,
    removeFault,
    setMissionProfile,
  };
}
