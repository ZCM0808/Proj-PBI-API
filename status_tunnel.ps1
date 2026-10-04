# status_tunnel.ps1 - Check service status and public health
$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Proj-PBI-API + Cloudflare Tunnel Status" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check local port 8000 & owner process
$portConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($portConn) {
    $ownerPid = $portConn[0].OwningProcess
    Write-Host "  FastAPI Service   : [Running] (Port 8000 active, Worker PID: $ownerPid)" -ForegroundColor Green
    Write-Host "  Local Port 8000   : [Listening] (127.0.0.1:8000)" -ForegroundColor Green
} else {
    $apiProcs = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%src/main.py%' or CommandLine LIKE '%src\\main.py%'" | Where-Object { $_.Name -like "python*" }
    if ($apiProcs) {
        Write-Host "  FastAPI Service   : [Starting/Reloading] PID $($apiProcs[0].ProcessId)" -ForegroundColor Yellow
    } else {
        Write-Host "  FastAPI Service   : [Stopped]" -ForegroundColor Red
    }
    Write-Host "  Local Port 8000   : [Not Listening]" -ForegroundColor Red
}

# 2. Check Cloudflare Tunnel process
$cfProcs = Get-CimInstance Win32_Process -Filter "Name LIKE 'cloudflared%'" | Where-Object { $_.CommandLine -like "*tunnel run*" }
if ($cfProcs) {
    Write-Host "  Cloudflare Tunnel : [Running] PID $($cfProcs[0].ProcessId)" -ForegroundColor Green
} else {
    Write-Host "  Cloudflare Tunnel : [Stopped]" -ForegroundColor Red
}

# 3. Check Auto-start Registry
$regItem = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "PbiApiTunnel" -ErrorAction SilentlyContinue
if ($regItem) {
    Write-Host "  Auto-Start On Boot: [Enabled] (HKCU Run)" -ForegroundColor Green
} else {
    Write-Host "  Auto-Start On Boot: [Disabled]" -ForegroundColor Gray
}

# 4. Check public HTTPS
$Hostname = "pbi.carman.ccwu.cc"
try {
    $resp = Invoke-WebRequest -Uri "https://$Hostname/login" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Public Domain     : [200 OK] https://$Hostname" -ForegroundColor Green
} catch {
    Write-Host "  Public Domain     : [Connecting...] ($($_.Exception.Message))" -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Cyan
