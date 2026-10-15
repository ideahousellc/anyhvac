# Preparation only: writes reviewable XML, never registers or starts a task.
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$outputDirectory = Join-Path $taskRoot '.local/agent-inbox/reliability-review'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$powershellPath = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $PSScriptRoot 'start-runner.ps1') + '"') -WorkingDirectory $taskRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$trigger.Delay = 'PT30S'
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'AnyHVAC restricted conversation runner; no collaboration, content production or publishing.'
$task.Settings.Hidden = $true
$outputPath = Join-Path $outputDirectory 'AnyHVAC-Agent-Conversations.xml'
$task | Export-ScheduledTask | Set-Content -LiteralPath $outputPath -Encoding Unicode
Write-Output ('Prepared only: ' + $outputPath)
