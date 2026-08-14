param (
    [string]$CommitMsg = ""
)

# Step 1: Commit changes if a message is provided
if ($CommitMsg -ne "") {
    Write-Host "[*] Adding all changes and committing..." -ForegroundColor Cyan
    git add .
    git commit -m $CommitMsg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] No changes to commit or commit failed." -ForegroundColor Yellow
    }
} else {
    Write-Host "[*] No commit message provided. Assuming changes are already committed, proceeding to push..." -ForegroundColor Cyan
}

$branch = $(git rev-parse --abbrev-ref HEAD)
$remote = "origin"

Write-Host "`n[*] Starting Smart Auto-Fallback Push to $remote/$branch..." -ForegroundColor Magenta

# Strategy 1: OpenSSL Direct
Write-Host "`n[Strategy 1] Attempting Direct Push (OpenSSL Backend)..." -ForegroundColor Yellow
$env:http_proxy=""
$env:https_proxy=""
git -c http.sslbackend=openssl push $remote $branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Strategy 1 Succeeded! Push completed using OpenSSL." -ForegroundColor Green
    exit 0
}

# Strategy 2: SChannel Direct
Write-Host "`n[!] Strategy 1 Failed. Falling back to Strategy 2..." -ForegroundColor Red
Write-Host "[Strategy 2] Attempting Direct Push (SChannel Backend with Revoke Check Disabled)..." -ForegroundColor Yellow
git -c http.sslbackend=schannel -c http.schannelCheckRevoke=false push $remote $branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Strategy 2 Succeeded! Push completed using SChannel." -ForegroundColor Green
    exit 0
}

# Strategy 3: Default Git Config (Relies on System Proxy or VPN)
Write-Host "`n[!] Strategy 2 Failed. Falling back to Strategy 3..." -ForegroundColor Red
Write-Host "[Strategy 3] Attempting Default Git Push (Using System Proxy/VPN)..." -ForegroundColor Yellow
git push $remote $branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Strategy 3 Succeeded! Push completed using default settings." -ForegroundColor Green
    exit 0
}

# All strategies failed
Write-Host "`n[X] All push strategies failed. Please check your network connection, proxy settings, or PAT validity." -ForegroundColor Red
exit 1
