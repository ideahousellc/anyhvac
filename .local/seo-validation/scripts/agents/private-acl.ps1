# Read-only validation. No credentials are printed or modified.
$ErrorActionPreference = 'Stop'
try {
    $taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
    $privateRoot = Join-Path $taskRoot '.local/agent-inbox'
    $ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $allowed = @($ownerSid, 'S-1-5-18', 'S-1-5-32-544')
    # Future files inherit the directory ACL; check existing data as well.
    $productionRoot = Join-Path $privateRoot 'production'
    $runnerRoot = Join-Path $privateRoot 'runner'
    $items = @((Get-Item -LiteralPath $privateRoot), (Get-Item -LiteralPath $productionRoot), (Get-Item -LiteralPath $runnerRoot)) + @(Get-ChildItem -LiteralPath $productionRoot -Recurse -Force) + @(Get-ChildItem -LiteralPath $runnerRoot -Recurse -Force)
    foreach ($item in $items) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point requires review.' }
        foreach ($rule in (Get-Acl -LiteralPath $item.FullName).Access) {
            if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed) { throw 'Private ACL requires review.' }
        }
    }
    exit 0
} catch { Write-Error 'Private inbox permissions require owner review.'; exit 1 }
