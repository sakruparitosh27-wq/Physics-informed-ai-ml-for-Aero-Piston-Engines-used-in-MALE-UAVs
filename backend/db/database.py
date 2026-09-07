"""
SQLite Database Engine for AeroTwin Mission Logs and Telemetry Persistence.
Provides lightweight, reliable local storage for post-flight black-box replay.
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "aerotwin_missions.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table 1: Missions metadata
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS missions (
        mission_id TEXT PRIMARY KEY,
        mission_name TEXT NOT NULL,
        profile_type TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL,
        duration_sec REAL,
        initial_health REAL,
        final_health REAL,
        primary_fault_detected TEXT,
        status TEXT DEFAULT 'COMPLETED'
    )
    """)

    # Table 2: Telemetry Frames (Time-series log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        flight_time_sec REAL NOT NULL,
        mission_phase TEXT NOT NULL,
        rpm REAL,
        cht_avg REAL,
        egt_avg REAL,
        oil_pressure_bar REAL,
        oil_temp_c REAL,
        fuel_flow_lph REAL,
        vibration_amplitude_g REAL,
        battery_voltage_v REAL,
        health_index REAL,
        anomaly_score REAL,
        active_fault TEXT,
        rul_hours REAL,
        legacy_breached INTEGER DEFAULT 0,
        raw_json TEXT NOT NULL,
        FOREIGN KEY (mission_id) REFERENCES missions (mission_id)
    )
    """)

    # Index on mission_id and flight_time_sec for fast scrubbing
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_telemetry_mission_time 
    ON telemetry_logs (mission_id, flight_time_sec)
    """)

    # Table 3: Fault events & maintenance logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fault_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        flight_time_sec REAL NOT NULL,
        fault_code TEXT NOT NULL,
        fault_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        rul_at_detection REAL,
        lead_time_seconds REAL,
        FOREIGN KEY (mission_id) REFERENCES missions (mission_id)
    )
    """)

    conn.commit()
    conn.close()


# Initialize schema upon module load
init_db()
