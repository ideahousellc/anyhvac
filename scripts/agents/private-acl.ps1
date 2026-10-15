# Read-only validation; no permission repairs or credential output.
[CmdletBinding()]
param([switch]$CheckLegacyCredential)
$ErrorActionPreference = 'Stop'
try {
    . (Join-Path $PSScriptRoot 'private-directory.ps1')
    $context = Get-AgentPrivateContext
    Assert-AgentPrivateTree $context
    if ($CheckLegacyCredential) {
        $repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
        $legacy = Join-Path $repository '.local/agent-inbox/production/runner-config.json'
        if (Test-Path -LiteralPath $legacy) {
            Assert-AgentPrivateItem (Get-Item -LiteralPath $legacy -Force) $context
            # A writable ancestor permits credential replacement despite a secure file ACL.
            foreach ($relative in @('.local', '.local/agent-inbox', '.local/agent-inbox/production')) {
                Assert-AgentPrivateItem (Get-Item -LiteralPath (Join-Path $repository $relative) -Force) $context
            }
        }
    }
    Write-Output 'Private ownership and ACL verification passed.'
} catch { Write-Error 'Private permissions or designated identity require owner review.'; exit 1 }
