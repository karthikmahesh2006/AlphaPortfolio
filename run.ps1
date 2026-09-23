# One-click startup script for AlphaPortfolio Quant Platform
 
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ALPHA-PORTFOLIO QUANT PLATFORM STARTUP                  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$pythonExe = "$env:USERPROFILE\anaconda3\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Write-Host "1. Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app:app --reload --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -PassThru

Start-Sleep -Seconds 3

Write-Host "2. Starting Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Both Backend & Frontend are running!                    " -ForegroundColor Green
Write-Host "  Open your browser at: http://localhost:5173             " -ForegroundColor Cyan
Write-Host "  FastAPI Docs at:      http://127.0.0.1:8000/docs        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
