# disable_autostart.ps1 - Disable auto-start on Windows boot / reboot
$ErrorActionPreference = "SilentlyContinue"

$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   Disable Auto-Start on Windows Boot/Reboot" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

$item = Get-ItemProperty -Path $RegPath -Name "PbiApiTunnel" -ErrorAction SilentlyContinue
if ($item) {
    Remove-ItemProperty -Path $RegPath -Name "PbiApiTunnel" -Force
    Write-Host "[+] Auto-start item successfully removed from registry." -ForegroundColor Green
} else {
    Write-Host "[i] Auto-start is currently not enabled." -ForegroundColor Cyan
}
Write-Host "==========================================================" -ForegroundColor Yellow
