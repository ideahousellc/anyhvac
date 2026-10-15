$ErrorActionPreference = 'Stop'
try {
    $taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $launcherPath = Join-Path $PSScriptRoot 'production-runner.mjs'
    # No credentials in arguments or redirected output. Health logs are generated
    # inside the ACL-protected private runner directory by the worker itself.
    $worker = Start-Process -FilePath $nodePath -ArgumentList @('--experimental-strip-types', ('"' + $launcherPath + '"'), '--run') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -Wait
    exit $worker.ExitCode
} catch { exit 1 }
