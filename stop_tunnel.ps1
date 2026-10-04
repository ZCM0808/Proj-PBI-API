# stop_tunnel.ps1 - Gracefully stop Proj-PBI-API and Cloudflare Tunnel
$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   Stopping Proj-PBI-API & Cloudflare Tunnel" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

$stoppedAny = $false

# 1. Stop cloudflared tunnel
$cfProcs = Get-CimInstance Win32_Process -Filter "Name LIKE 'cloudflared%'" | Where-Object { $_.CommandLine -like "*tunnel run*" }
foreach ($p in $cfProcs) {
    Write-Host "[*] Stopping Cloudflare Tunnel (PID: $($p.ProcessId))..." -ForegroundColor Gray
    Stop-Process -Id $p.ProcessId -Force
    $stoppedAny = $true
}

# 2. Stop FastAPI service and related python/cmd workers
$apiProcs = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%src/main.py%' or CommandLine LIKE '%src\\main.py%'"
foreach ($p in $apiProcs) {
    Write-Host "[*] Stopping FastAPI service (PID: $($p.ProcessId))..." -ForegroundColor Gray
    Stop-Process -Id $p.ProcessId -Force
    $stoppedAny = $true
}

# 3. Clean PID file
$PidFile = "D:\ZCM\Proj-PBI-API\data\tunnel_pids.json"
if (Test-Path $PidFile) {
    Remove-Item -Path $PidFile -Force
}

if ($stoppedAny) {
    Write-Host "[+] All services safely stopped." -ForegroundColor Green
} else {
    Write-Host "[i] No active Tunnel or FastAPI processes found." -ForegroundColor Cyan
}
Write-Host "==========================================================" -ForegroundColor Yellow
