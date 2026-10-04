# enable_autostart.ps1 - Configure auto-start on Windows boot / reboot
$ErrorActionPreference = "Stop"

$ProjectRoot = "D:\ZCM\Proj-PBI-API"
$StartScript = Join-Path $ProjectRoot "start_tunnel.ps1"
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$Value = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$StartScript`""

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Enable Auto-Start on Windows Boot/Reboot" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-ItemProperty -Path $RegPath -Name "PbiApiTunnel" -Value $Value
Write-Host "[+] Auto-start item successfully registered in HKCU Run registry!" -ForegroundColor Green
Write-Host "    Registry Path : $RegPath" -ForegroundColor Gray
Write-Host "    Command Value : $Value" -ForegroundColor Gray
Write-Host "[+] Henceforth, upon computer boot or reboot, the service will" -ForegroundColor Green
Write-Host "    automatically launch in 100% hidden background silently!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
