#!/bin/bash
echo "========================================================================="
echo " AEROTWIN - MALE UAV Aero Piston Engine Digital Twin Dashboard (SIH26054)"
echo "========================================================================="
echo ""
echo "Starting Backend (FastAPI + ML Engine on port 8000)..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2

echo "Starting Frontend (Vite + React on port 5173)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "AeroTwin Dashboard running at: http://localhost:5173"
echo "Press Ctrl+C to terminate both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
