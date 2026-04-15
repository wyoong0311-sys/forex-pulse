$projectRoot = "D:\Crypto Or Forex"
$backendRoot = Join-Path $projectRoot "backend"
$uvicornExe = Join-Path $backendRoot ".venv\Scripts\uvicorn.exe"
$cloudflaredExe = Join-Path $projectRoot "tools\cloudflared.exe"
$cloudflaredLog = Join-Path $projectRoot "tools\cloudflared.log"

if (-not (Test-Path $uvicornExe)) {
  throw "Could not find uvicorn at $uvicornExe"
}

if (-not (Test-Path $cloudflaredExe)) {
  throw "Could not find cloudflared at $cloudflaredExe"
}

if (-not (Get-Process -Name uvicorn -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $uvicornExe -ArgumentList "app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $backendRoot -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 3
}

if (Get-Process -Name cloudflared -ErrorAction SilentlyContinue) {
  Write-Host "Cloudflare tunnel is already running."
  exit 0
}

if (Test-Path $cloudflaredLog) {
  Remove-Item $cloudflaredLog -Force
}

Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel --url http://127.0.0.1:8000 --logfile ""$cloudflaredLog""" -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null
Start-Sleep -Seconds 6

$logContent = if (Test-Path $cloudflaredLog) { Get-Content $cloudflaredLog -Raw } else { "" }
if ($logContent -match "https://[-a-z0-9]+\.trycloudflare\.com") {
  Write-Host "Public backend URL: $($matches[0])"
} else {
  Write-Host "Tunnel started, but the public URL was not found yet. Check $cloudflaredLog."
}
