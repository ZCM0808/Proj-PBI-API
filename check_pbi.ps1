# Read ClientAccess.xml - might have recent file info
$sp = "$env:USERPROFILE\Microsoft\Power BI Desktop Store App\User.zip"
$tempDir = Join-Path $env:TEMP "pbi_user_check"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
Expand-Archive $sp -DestinationPath $tempDir -Force

# Show first 2000 chars of each XML file
Get-ChildItem $tempDir -Filter "*.xml" -Recurse | ForEach-Object {
    Write-Host "===== $($_.Name) ====="
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        Write-Host $content.Substring(0, [Math]::Min(2000, $content.Length))
    }
    Write-Host ""
}

Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
