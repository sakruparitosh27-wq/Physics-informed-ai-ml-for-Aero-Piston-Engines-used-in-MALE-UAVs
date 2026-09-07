@echo off
echo =========================================================================
echo  AEROTWIN - MALE UAV Aero Piston Engine Digital Twin Dashboard (SIH26054)
echo =========================================================================
echo.
echo Starting AeroTwin Backend (FastAPI + ML Engine + WebSocket at port 8000)...
start "AeroTwin Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 2 >nul

echo Starting AeroTwin Frontend (Vite + React Dashboard at port 5173)...
start "AeroTwin Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo AeroTwin services launched!
echo Open your browser at: http://localhost:5173
echo.
pause
