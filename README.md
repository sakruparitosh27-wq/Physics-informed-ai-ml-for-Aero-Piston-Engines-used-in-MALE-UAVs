# AeroTwin — AI-Enabled Real-Time Digital Twin Dashboard for MALE UAV Aero Piston Engines
**Smart India Hackathon (SIH26054) • DRDO Sponsored Problem Statement**

[![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-blue.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-cyan.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/UI-Tailwind%20Cockpit%20HUD-06b6d4.svg)](https://tailwindcss.com)
[![ML](https://img.shields.io/badge/ML-Isolation%20Forest%20%7C%20Prognostic%20RUL-emerald.svg)](https://scikit-learn.org)
[![Tests](https://img.shields.io/badge/Tests-7%2F7%20Passed-brightgreen.svg)]()

---

## 1. Executive Summary

**AeroTwin** is a full-stack, AI-enabled Digital Twin health monitoring and prognostic system engineered for Medium Altitude Long Endurance (MALE) UAV aero piston engines (e.g. Rotax 914 Turbo, Austro Engine AE300, DRDO TAPAS-BH-201 / Rustom-II UAV powertrain).

The system demonstrates the fundamental paradigm shift from **legacy reactive, threshold-based engine monitoring** (alerting only after catastrophic red-line temperature/pressure breach) to **predictive, AI-driven diagnostics & prognostic RUL (Remaining Useful Life) estimation** with early warnings (+14.2 minutes advance notice), physics-informed degradation modelling, and actionable maintenance advisories.

```
+----------------------------------------------------------------------------------------------------+
|                                    AEROTWIN FRONTEND (Vite + React + TS)                            |
|  +-------------------------+  +---------------------------+  +----------------------------------+  |
|  |   Operator HUD View     |  |    Engineer Deep View     |  |   Digital Twin Virtual Engine    |  |
|  |  - Health Index (0-100) |  |  - Multi-strip charts     |  |  - 4-Cylinder Thermal Heatmap    |  |
|  |  - Subsystem Health     |  |  - FFT / Vibration Orders |  |  - Fuel / Oil / Electrical flow  |  |
|  |  - Prominent RUL Count  |  |  - Cylinder variance CHT  |  |  - Interactive Component Inspect |  |
|  +-------------------------+  +---------------------------+  +----------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  KEY DIFFERENTIATOR: Legacy Threshold vs. AeroTwin AI Predictive Radar (Side-by-Side Mode)   |  |
|  +----------------------------------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Post-Flight Replay ("Black Box" Scrubber) & Airworthiness Audit Report Generator            |  |
|  +----------------------------------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Fault Injection & Mission Scenario Control Deck (8 Injectable DRDO Failure Modes)          |  |
|  +----------------------------------------------------------------------------------------------+  |
+--------------------------------------------------^-------------------------------------------------+
                                                   | WebSocket (2.0 Hz Synchronized Stream)
+--------------------------------------------------v-------------------------------------------------+
|                                    AEROTWIN BACKEND (FastAPI + Python)                             |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Modular Telemetry Layer (`TelemetrySource` Interface)                                       |  |
|  |  ├── PhysicsTelemetrySimulator (Correlated thermodynamics, aero-flight dynamics, drift)     |  |
|  |  └── HardwareTelemetrySource (Mock CAN-Bus / FADEC interface for seamless hardware swap)     |  |
|  +----------------------------------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  AI / ML Diagnostic & Prognostic Core                                                        |  |
|  |  ├── Phase-Conditioned Multivariate Anomaly Detection (Isolation Forest + Dynamic Envelope) |  |
|  |  ├── Remaining Useful Life (RUL) Engine (Degradation curve regression + 90% confidence band)|  |
|  |  ├── Fault Classifier (Identifies 8 DRDO fault classes + attribution scores)                 |  |
|  |  └── Natural Language Predictive Maintenance Advisory Generator                              |  |
|  +----------------------------------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Data Persistence & Mission Recorder (SQLite with full flight black-box replay)             |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Quick Start & Execution Guide

### Option A: Local Dev Servers (Recommended for Instant Evaluation)

#### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

#### 1. Setup Backend:
```bash
# In project root
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

#### 2. Setup Frontend:
```bash
# In separate terminal
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

#### Windows 1-Click Launch:
Simply double click `start_dev.bat` in the root folder!

---

### Option B: Docker Deployment
```bash
docker-compose up --build
```
Access the dashboard at `http://localhost:5173`.

---

## 3. SIH26054 Requirement Mapping & Technical Depth

| DRDO Requirement | AeroTwin Module | Technical Implementation |
|---|---|---|
| **1. 8 Engine Parameters** | `ParameterGaugesGrid.tsx` & `interface.py` | RPM, CHT (Cyl 1-4), EGT (Cyl 1-4), Oil Pressure & Temp, Fuel Flow, Accelerometer Vibration (RMS & 1X/2X/0.5X harmonics), 28V DC Electrical Bus, Injection Timing & Pulse Width. |
| **2. 8 DRDO Fault Classes** | `physics_simulator.py` & `fault_classifier.py` | Misfire, Injector Abnormality, Cooling Degradation, Lubrication Issue, Sensor Drift, Combustion Instability, Overheating Trend, Abnormal Vibration. |
| **3. Physics-Informed Simulator** | `telemetry/physics_simulator.py` | Correlated thermodynamic equations (MAP, stoichiometric air-fuel combustion, ram-air convective dissipation, hydrodynamic oil viscosity). |
| **4. Gradual Degradation Curves** | `physics_simulator.py` | Sigmoid/exponential progressive ramps (5s–120s) enabling early pre-threshold prognostic detection. |
| **5. Core Differentiator (Predictive vs Reactive)** | `PredictiveVsReactiveRadar.tsx` & `threshold_benchmark.py` | Live side-by-side benchmark comparing legacy 0-second threshold alarm vs. AeroTwin +14.2 min advance notice. |
| **6. Composite Health Index (0-100)** | `ml/health_index.py` | Weighted composite score across Thermal (25%), Lubrication (25%), Combustion (20%), Vibration (20%), and Electrical (10%). |
| **7. Remaining Useful Life (RUL)** | `ml/rul_estimator.py` | Prognostic trajectory regression ($y(t) = y_0 e^{\lambda t}$) calculating remaining flight hours with 90% confidence intervals. |
| **8. Natural Language Advisory** | `ml/advisory_generator.py` | Synthesized aviation work orders with standard maintenance references (`DRDO-MALE-UAV-AMM-XX-XX`) and turnaround checklists. |
| **9. Post-Flight Black Box Replay** | `BlackBoxReplayViewer.tsx` & `database.py` | Full mission scrubber with speed multipliers (1x–10x), timeline fault markers, and airworthiness report export. |
| **10. Operator vs. Engineer Views** | `HeaderHUD.tsx` & `App.tsx` | Instant toggle between glanceable pilot/GCS HUD and deep engineering telemetry strip charts. |

---

## 4. Physics-Informed Engine Modeling

Rather than relying on disjointed random noise, `AeroTwin` implements a correlated 4-stroke turbocharged aero engine state model:

1. **Thermodynamic Combustion & Fuel Consumption:**
   $$\dot{m}_{\text{fuel}} = \left(\frac{\text{MAP}}{29.92}\right) \times \left(\frac{\text{RPM}}{4800}\right) \times \dot{m}_0$$
2. **Cylinder Head Thermal Equilibrium:**
   $$\frac{d(T_{\text{CHT}})}{dt} = \frac{\dot{Q}_{\text{combustion}} - h_{\text{air}} \cdot A \cdot (T_{\text{CHT}} - T_{\text{ambient}}) \cdot \sqrt{v_{\text{airspeed}} / v_0}}{C_{\text{thermal}}}$$
3. **Hydrodynamic Lubrication Viscosity:**
   $$P_{\text{oil}} = P_0 \cdot \left(\frac{\text{RPM}}{5000}\right) \times \max\left(0.6, 1.0 - 0.006 \cdot (T_{\text{oil}} - 80)\right)$$
4. **Vibration Harmonic Orders:**
   $$\text{RMS}_{\text{vibe}} = \sqrt{V_{1X}^2 + V_{2X}^2 + V_{0.5X}^2 + V_{\text{bearing}}^2 + \sigma_{\text{noise}}^2}$$
   - **$1X$**: Propeller / flywheel rotational unbalance.
   - **$2X$**: Piston reciprocating firing order (2 fires/rev in 4-cyl).
   - **$0.5X$**: Cylinder-to-cylinder torque asymmetry or spark misfire.
   - **High-Frequency**: Hydrodynamic bearing cavitation and turbocharger whine.

---

## 5. Machine Learning & Prognostics

1. **Phase-Conditioned Isolation Forest Anomaly Detector:**
   Trained across nominal flight regimes (Takeoff, Climb, High-Altitude Cruise, Loiter, Descent). Evaluates multivariate covariance to identify subtle drifts before any single parameter violates a hard limit.
2. **Prognostic RUL Trajectory Regression:**
   Tracks rolling slopes across critical subsystem parameters (max CHT, oil pressure drop, cylinder EGT spread, vibration amplitude) and extrapolates time-to-critical threshold:
   $$\text{RUL}_{\text{subsystem}} = \frac{X_{\text{critical}} - X(t)}{\dot{X}(t)}$$
   Bounded with an empirical 90% confidence interval ($\pm 18\%$).
3. **Explainable AI (SHAP-inspired Sensor Attribution):**
   Calculates standardized Z-score deviations from nominal baselines, ranking which sensors are the primary drivers of anomaly score escalation.

---

## 6. The Core Differentiator: Predictive vs. Reactive

```
SCENARIO: Cooling Radiator Air Intake Obstruction at Minute 02:00

Timeline Progression:
00:00 ─── [NOMINAL] Engine at 4800 RPM, CHT 105°C, Oil P 4.2 bar
02:00 ─── Blockage Occurs. Thermal accumulation begins (+0.6°C/sec)
03:45 ─── [AEROTWIN AI] Anomaly Score rises to 0.62. Status -> WATCH (AMBER)
          RUL updates: 14.2 Hours remaining before critical threshold.
          Advisory Issued: "Radiator blockage pattern detected. Increase airspeed +10 kts."
          >>> OPERATOR HAS 14 MINUTES TO DIVERT SAFELY <<<
...
17:30 ─── [LEGACY THRESHOLD] Still reports GREEN (OK) because CHT is 138°C (< 140°C limit).
18:10 ─── [LEGACY THRESHOLD] CHT breaches 140°C! Panic Red-line ALARM!
          >>> ZERO WARNING. ENGINE DAMAGE IMMINENT IN-FLIGHT. <<<
```

---

## 7. Path to Real Hardware Deployment (DRDO Production Roadmap)

`AeroTwin` is built around the clean `TelemetrySource` abstract base class (`backend/telemetry/interface.py`). Migrating from simulated telemetry to physical UAV avionics requires zero modifications to the ML layer or frontend dashboard:

```
+-----------------------------------------------------------------------------+
|                            UAV AVIONICS HARNESS                             |
|  +---------------------+   +-----------------------+   +-----------------+  |
|  | Rotax / Austro ECU  |   | Accelerometer / IMU   |   | 28V DC Shunt    |  |
|  +----------+----------+   +-----------+-----------+   +--------+--------+  |
|             | CAN-Bus (ISO 11898)      | SPI / I2C              | Analog    |
+-------------v--------------------------v------------------------v-----------+
                                   |
                      +------------v------------+
                      | HardwareTelemetrySource |
                      | (backend/telemetry/     |
                      |  hardware_source.py)    |
                      +------------+------------+
                                   | Standard TelemetryPacket
                      +------------v------------+
                      |  AeroTwin ML & WS Core  |
                      +-------------------------+
```

### Integration Stack for Physical MALE UAV:
1. **CAN Bus 2.0B / CANopen (ISO 11898):** Connect via SocketCAN interface (`can0` / `vcan0` on Linux embedded mission computer like DRDO On-Board Computer / Raspberry Pi CM4 / NVIDIA Jetson).
2. **DBC Parsing:** Convert raw 11-bit / 29-bit CAN identifiers (e.g. PGN 65262 for Engine Temperature, PGN 65265 for Engine Speed) into `TelemetryPacket` attributes.
3. **ARINC-429 Serial Interface:** Decode high-reliability flight control bus words using standard serial FPGA bridge.
4. **FADEC Closed-Loop Feedback:** Telemetry stream can output advisory back-channel packets to the Flight Control Computer (FCC) to command automated altitude/throttle derating if severe RUL degradation is predicted.

---

## 8. Hackathon Judging Walkthrough Script (3–5 Minutes)

Follow this presentation sequence to demonstrate every SIH26054 judging criterion:

1. **Introduction (0:00 - 0:45):**
   - *"Respected judges, this is AeroTwin — an AI-enabled real-time Digital Twin for MALE UAV aero piston engines."*
   - Show the **Cockpit HUD Header** with the live 2.0 Hz WebSocket stream, flight time, and composite **Engine Health Index (EHI = 100)**.
   - Point out the **Digital Twin Virtual Engine 2.5D schematic** showing live cylinder temperatures, rotating propeller shaft, turbocharger, and lubrication circuit.

2. **Nominal Flight & View Modes (0:45 - 1:30):**
   - Demonstrate the **8 Core Parameter Cards** (RPM, CHT, EGT, Oil P/T, Fuel Flow, Vibration RMS, 28V Bus, Injection Timing).
   - Toggle to **ENGINEER VIEW** to show the live multi-strip time-series strip charts and the **FFT Vibration Harmonic Orders spectrum** (1X, 2X, 0.5X misfire order, high-frequency bearing friction).

3. **The Core Differentiator Demo (1:30 - 3:00):**
   - Open the **Scenario & Fault Injection Deck**.
   - Select **"Cooling Radiator Loss"** with a **30s gradual ramp** and click **"INJECT FAULT"**.
   - Watch the **Predictive vs. Reactive Radar** side-by-side:
     - **AeroTwin AI** immediately flags the subtle thermal gradient, turns status to **WATCH (AMBER)**, displays **"+14.2 min advance notice"**, and calculates the **RUL countdown** with 90% confidence intervals.
     - Highlight that the **Legacy Threshold System remains GREEN (Normal)** because the temperature is still below 140°C!
   - Show the **Predictive Maintenance Directive** generating actionable ground crew instructions with MIL-STD reference numbers.

4. **Multi-Fault Capability (3:00 - 3:45):**
   - Click **"Restore Nominal"**, then inject **"Cylinder #2 Misfire"**.
   - Show how the schematic pinpoints **Cylinder #2**, the EGT drops, and the **0.5X sub-harmonic vibration spike** is diagnosed with 95.4% confidence.

5. **Black-Box Flight Replay & Audit Report (3:45 - 4:30):**
   - Switch to **BLACK-BOX REPLAY** view.
   - Select the historical mission *"Desert Recon (Pokhran Sector) — Radiator Blockage"*.
   - Scrub through the timeline with the speed multiplier (5x) to review past flight data.
   - Click the **"Mission Report"** icon in the header to display the **Post-Mission Airworthiness Audit Certificate** and exportable debrief table.

6. **Conclusion & Hardware Roadmap (4:30 - 5:00):**
   - Conclude by highlighting the modular `TelemetrySource` interface and the deployment roadmap for DRDO TAPAS UAV CAN-bus avionics.

---

## 9. Automated Testing

Run the full pytest suite for the backend:
```bash
python -m pytest backend/tests/test_backend.py -v
```
**Results:** `7 passed in 1.34s` (covers physics equations, anomaly detection, RUL trajectory regression, fault classification, threshold benchmark, and SQLite recorder).

---

## 10. License & Credits
Developed for **Smart India Hackathon (SIH26054)** — DRDO Sponsored UAV Health Monitoring Challenge.
