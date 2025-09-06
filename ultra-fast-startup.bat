@echo off
echo 🚀 Starting SentinelAi Ultra-Fast Mode...
echo.

echo Starting ML Model (Port 5001)...
start "ML Model" cmd /k "cd model\app && python app.py"
timeout /t 3 /nobreak >nul

echo Starting Backend API (Port 3000)...
start "Backend" cmd /k "cd backend && npm start"
timeout /t 2 /nobreak >nul

echo Starting Frontend (Port 5173)...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ⚡ Running Performance Test...
timeout /t 5 /nobreak >nul
node performance-optimizer.js

echo.
echo 🎯 All services started in ultra-fast mode!
echo 📊 Open http://localhost:5173 to access the dashboard
echo.
pause