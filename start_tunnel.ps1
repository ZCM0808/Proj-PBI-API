# start_tunnel.ps1 - Launch Proj-PBI-API and Cloudflare Tunnel via 100% Silent WMI Daemon
$ErrorActionPreference = "Stop"
$ProjectRoot = "D:\ZCM\Proj-PBI-API"
Set-Location $ProjectRoot

# 1. Ensure log and data directories exist
$LogDir = Join-Path $ProjectRoot "logs"
$DataDir = Join-Path $ProjectRoot "data"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

$PidFile = Join-Path $DataDir "tunnel_pids.json"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Proj-PBI-API + Cloudflare Tunnel 100% Silent Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Prepare SW_HIDE (ShowWindow = 0) Startup Info to completely suppress console black windows
$startup = [wmiclass]"Win32_ProcessStartup"
$startupInfo = $startup.CreateInstance()
$startupInfo.ShowWindow = 0 # 0 = SW_HIDE

$processClass = [wmiclass]"Win32_Process"

# 2. Check and start FastAPI service via Silent WMI
$ApiProcess = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%src/main.py%' or CommandLine LIKE '%src\\main.py%'" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "python*" -or $_.Name -eq "cmd.exe" }
if ($ApiProcess) {
    $ApiPid = $ApiProcess[0].ProcessId
    Write-Host "[+] FastAPI service is already running (PID: $ApiPid)" -ForegroundColor Green
} else {
    Write-Host "[*] Launching FastAPI service in 100% hidden background..." -ForegroundColor Yellow
    $apiCmd = 'cmd.exe /c "python src/main.py > logs\api_server.log 2>&1"'
    $res = $processClass.Create($apiCmd, $ProjectRoot, $startupInfo)
    if ($res.ReturnValue -eq 0 -and $res.ProcessId) {
        $ApiPid = $res.ProcessId
        Write-Host "[+] FastAPI service launched silently (PID: $ApiPid)" -ForegroundColor Green
    } else {
        Write-Host "[-] Failed to launch FastAPI via WMI, ReturnValue: $($res.ReturnValue)" -ForegroundColor Red
        exit 1
    }
}

# 3. Read Tunnel Info
$TunnelInfoPath = Join-Path $ProjectRoot ".cf_tunnel_info.json"
if (-not (Test-Path $TunnelInfoPath)) {
    Write-Host "[-] Error: .cf_tunnel_info.json not found!" -ForegroundColor Red
    exit 1
}

$TunnelInfo = Get-Content $TunnelInfoPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Token = $TunnelInfo.tunnel_token
$Hostname = $TunnelInfo.hostname

# 4. Check and start Cloudflare Tunnel via Silent WMI
$CfProcess = Get-CimInstance Win32_Process -Filter "Name LIKE 'cloudflared%'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tunnel run*" }
if ($CfProcess) {
    $CfPid = $CfProcess[0].ProcessId
    Write-Host "[+] Cloudflare Tunnel is already running (PID: $CfPid)" -ForegroundColor Green
} else {
    Write-Host "[*] Launching Cloudflare Tunnel in 100% hidden background..." -ForegroundColor Yellow
    $cfPath = "C:\Users\ZCM\.agy_pool\bin\cloudflared.exe"
    if (-not (Test-Path $cfPath)) {
        $cfCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
        if ($cfCmd) { $cfPath = $cfCmd.Source } else { $cfPath = "cloudflared.exe" }
    }

    $cfCmdLine = "`"$cfPath`" tunnel run --token $Token"
    $resCf = $processClass.Create($cfCmdLine, $ProjectRoot, $startupInfo)
    if ($resCf.ReturnValue -eq 0 -and $resCf.ProcessId) {
        $CfPid = $resCf.ProcessId
        Write-Host "[+] Cloudflare Tunnel launched silently (PID: $CfPid)" -ForegroundColor Green
    } else {
        Write-Host "[-] Failed to launch Cloudflare Tunnel, ReturnValue: $($resCf.ReturnValue)" -ForegroundColor Red
        exit 1
    }
}

# 5. Save PID status
$PidsObj = @{
    api_pid = $ApiPid
    cloudflared_pid = $CfPid
    started_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    hostname = $Hostname
}
$PidsObj | ConvertTo-Json | Set-Content $PidFile -Encoding UTF8

# 6. Self-check
Write-Host "`n[*] Performing connectivity health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Local test
try {
    $localResp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/version" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($localResp.StatusCode -eq 200) {
        Write-Host "    [+] Local service responsive: http://127.0.0.1:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "    [*] Local service initializing..." -ForegroundColor Gray
}

# Public domain test
Write-Host "    [*] Testing public endpoint: https://$Hostname ..." -ForegroundColor Gray
Start-Sleep -Seconds 2
try {
    $remoteResp = Invoke-WebRequest -Uri "https://$Hostname/login" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($remoteResp.StatusCode -eq 200) {
        Write-Host "    [+] Public Tunnel direct access SUCCESS! (Status: 200 OK)" -ForegroundColor Green
    }
} catch {
    Write-Host "    [*] Tunnel edge routing is synchronizing, test directly in your browser." -ForegroundColor Yellow
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   Deployment Ready (100% Windowless Background)!" -ForegroundColor Green
Write-Host "   Public URL : https://$Hostname" -ForegroundColor Cyan
Write-Host "   Local  URL : http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "   Auth Mode  : Native Password + Mobile MFA TOTP" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
