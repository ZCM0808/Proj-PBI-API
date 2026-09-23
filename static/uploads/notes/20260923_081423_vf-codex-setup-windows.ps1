$ErrorActionPreference = "Stop"

Write-Host "VF Codex setup for Windows"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm was not found. Install Node.js first, then run this script again."
}

$secureKey = Read-Host "Paste your VF IDE API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  Write-Error "No API key entered."
}

$addAtlassian = (Read-Host "Add Atlassian MCP for Jira and Confluence? [y/N]") -match "^(?i:y|yes)$"
$addAzure = (Read-Host "Add Azure DevOps MCP? [y/N]") -match "^(?i:y|yes)$"
$azureDevopsOrgUrl = ""
$azureDevopsPat = ""

if ($addAzure) {
  $azureDevopsOrgUrl = Read-Host "Azure DevOps organization URL (example: https://dev.azure.com/vfcorp)"
  $azureDevopsOrgUrl = $azureDevopsOrgUrl.TrimEnd("/")
  if (-not [string]::IsNullOrWhiteSpace($azureDevopsOrgUrl)) {
    Write-Host "Open this page to create or copy an Azure DevOps PAT:"
    Write-Host "$azureDevopsOrgUrl/_usersSettings/tokens"
  }
  $secureAzurePat = Read-Host "Azure DevOps PAT" -AsSecureString
  $azureBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureAzurePat)
  try {
    $azureDevopsPat = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($azureBstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($azureBstr)
  }

  if ([string]::IsNullOrWhiteSpace($azureDevopsOrgUrl) -or [string]::IsNullOrWhiteSpace($azureDevopsPat)) {
    Write-Warning "Azure DevOps MCP needs both an organization URL and PAT. Skipping Azure DevOps MCP."
    $addAzure = $false
  }
}

function Escape-TomlString([string]$value) {
  return $value.Replace("\", "\\").Replace('"', '\"')
}

Write-Host "Installing Codex CLI..."
npm install -g @openai/codex

$codexDir = Join-Path $HOME ".codex"
New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

$config = @'
model = "gpt-5.5"
model_reasoning_effort = "high"
approvals_reviewer = "user"
plan_mode_reasoning_effort = "high"

model_provider = "proxy"

[model_providers.proxy]
name = "VF AI"
base_url = "https://pods-ai.vfc.com/api/v1"
env_key = "VF_API_KEY"
'@

if ($addAtlassian) {
  $config += @'

[mcp_servers.atlassian]
url = "https://mcp.atlassian.com/v1/mcp"
'@
}

if ($addAzure) {
  $escapedAzureOrgUrl = Escape-TomlString $azureDevopsOrgUrl
  $escapedAzurePat = Escape-TomlString $azureDevopsPat
  $config += @"

[mcp_servers.azure]
command = "npx"
args = ["-y", "@tiberriver256/mcp-server-azure-devops"]
env = { AZURE_DEVOPS_ORG_URL = "$escapedAzureOrgUrl", AZURE_DEVOPS_AUTH_METHOD = "pat", AZURE_DEVOPS_PAT = "$escapedAzurePat" }
"@
}

Set-Content -Path (Join-Path $codexDir "config.toml") -Value $config -Encoding UTF8

[Environment]::SetEnvironmentVariable("VF_API_KEY", $apiKey, "User")
$env:VF_API_KEY = $apiKey

Write-Host "Codex is configured."
if ($addAtlassian) {
  if (Get-Command codex -ErrorAction SilentlyContinue) {
    Write-Host "Starting Atlassian MCP login..."
    codex mcp login atlassian
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Atlassian login did not complete. You can retry later with: codex mcp login atlassian"
    }
  }
  else {
    Write-Warning "Atlassian MCP was added, but the codex command is not available in this shell yet."
    Write-Host "Open a new terminal, then run: codex mcp login atlassian"
  }
}
Write-Host "Open a new terminal, then run: codex"
Write-Host "If you use VS Code, install the official OpenAI Codex extension; it will use the same ~/.codex/config.toml file."
