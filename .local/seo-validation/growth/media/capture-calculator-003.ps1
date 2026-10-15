$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$destination = Join-Path $root "growth/.generated/campaigns/003-why-duct-size-matters/images/duct-calculator-page.png"
$destinationDirectory = Split-Path -Parent $destination
$profile = Join-Path $env:TEMP ("anyhvac-campaign003-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
New-Item -ItemType Directory -Path $profile | Out-Null
$arguments = @(
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--user-data-dir=$profile", "--window-size=1440,1200", "--virtual-time-budget=7000",
  "--screenshot=$destination", "http://localhost:3000/tools/duct-calculator"
)
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList $arguments -WindowStyle Hidden -Wait
if (!(Test-Path -LiteralPath $destination)) { throw "Calculator capture was not created. Start npm run dev on port 3000 and retry." }
Write-Output "Captured the hydrated local Duct Calculator at $destination"
