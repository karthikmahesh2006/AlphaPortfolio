@echo off
title AlphaPortfolio Quant Platform Launcher
echo ==========================================================
echo   ALPHA-PORTFOLIO QUANT PLATFORM STARTUP
echo ==========================================================

set PYTHON_EXE=%USERPROFILE%\anaconda3\python.exe
if not exist "%PYTHON_EXE%" set PYTHON_EXE=python

echo 1. Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "FastAPI Backend" cmd /k "cd /d %~dp0backend && "%PYTHON_EXE%" -m uvicorn app:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo 2. Starting Vite React Frontend on http://localhost:5173 ...
start "Vite Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ==========================================================
echo   Both services have been launched in separate windows!
echo   Frontend: http://localhost:5173
echo   API Docs: http://127.0.0.1:8000/docs
echo ==========================================================
pause
