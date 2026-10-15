# Shared policy. No elevation, ownership takeover, policy override or credential output.
[CmdletBinding()]
param([switch]$Initialize)
$ErrorActionPreference = 'Stop'

function Get-AgentPrivateContext {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run as the designated standard Windows user, without elevation.' }
    $local = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if (-not $local -or $local.StartsWith('\\') -or $local -ne $env:LOCALAPPDATA) { throw 'Unexpected Windows user profile.' }
    $owner = (Get-Acl -LiteralPath $local).Owner
    $ownerSid = ([Security.Principal.NTAccount]::new($owner)).Translate([Security.Principal.SecurityIdentifier])
    if ($ownerSid.Value -ne $identity.User.Value) { throw 'Process identity differs from the designated profile owner. Do not use a sandbox identity.' }
    $parent = Join-Path $local 'AnyHVAC'
    return [pscustomobject]@{ Sid=$identity.User; Parent=$parent; Root=(Join-Path $parent 'AgentInbox'); Allowed=@($identity.User.Value,'S-1-5-18','S-1-5-32-544') }
}

function Assert-AgentPrivateItem($Item, $Context) {
    if ($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Private data cannot use a reparse point.' }
    $acl = Get-Acl -LiteralPath $Item.FullName
    $owner = ([Security.Principal.NTAccount]::new($acl.Owner)).Translate([Security.Principal.SecurityIdentifier]).Value
    if ($owner -ne $Context.Sid.Value) { throw 'Private data has another owner.' }
    if ($Item.FullName -in @($Context.Parent,$Context.Root) -and -not $acl.AreAccessRulesProtected) { throw 'Private directory inheritance is not protected.' }
    $seen = @{}
    foreach ($rule in $acl.Access) {
        $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if ($rule.AccessControlType -ne 'Allow' -or $sid -notin $Context.Allowed) { throw 'Private ACL contains an unexpected principal or deny rule.' }
        if (([int64]$rule.FileSystemRights -band [int64][Security.AccessControl.FileSystemRights]::FullControl) -ne [int64][Security.AccessControl.FileSystemRights]::FullControl) { throw 'Expected private full-control rule missing.' }
        $seen[$sid] = $true
    }
    foreach ($sid in $Context.Allowed) { if (-not $seen.ContainsKey($sid)) { throw 'Required private principal missing.' } }
}

function Assert-AgentPrivateTree($Context) {
    Assert-AgentPrivateItem (Get-Item -LiteralPath $Context.Parent -Force) $Context
    Assert-AgentPrivateItem (Get-Item -LiteralPath $Context.Root -Force) $Context
    foreach ($item in Get-ChildItem -LiteralPath $Context.Root -Recurse -Force) { Assert-AgentPrivateItem $item $Context }
    $record = Get-Content -LiteralPath (Join-Path $Context.Root 'identity.json') -Raw | ConvertFrom-Json
    if ($record.ownerSid -ne $Context.Sid.Value -or $record.version -ne 1) { throw 'Private identity record mismatch.' }
}

function New-AgentPrivateDirectory($Path, $Context) {
    if (Test-Path -LiteralPath $Path) { Assert-AgentPrivateItem (Get-Item -LiteralPath $Path -Force) $Context; return }
    $security = [Security.AccessControl.DirectorySecurity]::new()
    $security.SetOwner($Context.Sid)
    $security.SetAccessRuleProtection($true, $false)
    foreach ($sidValue in $Context.Allowed) {
        $sid = [Security.Principal.SecurityIdentifier]::new($sidValue)
        $security.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, [Security.AccessControl.FileSystemRights]::FullControl, [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit', [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow))
    }
    # Supplies the restrictive descriptor at creation, before any sensitive data.
    [IO.Directory]::CreateDirectory($Path, $security) | Out-Null
    Assert-AgentPrivateItem (Get-Item -LiteralPath $Path -Force) $Context
}

if ($Initialize) {
    try {
        $context = Get-AgentPrivateContext
        New-AgentPrivateDirectory $context.Parent $context
        New-AgentPrivateDirectory $context.Root $context
        foreach ($name in @('production','runner','audit','startup','fixtures')) { New-AgentPrivateDirectory (Join-Path $context.Root $name) $context }
        $identityFile = Join-Path $context.Root 'identity.json'
        if (-not (Test-Path -LiteralPath $identityFile)) {
            @{version=1;ownerSid=$context.Sid.Value;createdAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $identityFile -Encoding UTF8
        }
        Assert-AgentPrivateTree $context
        Write-Output 'User-owned private directory initialized and ACLs verified. No credentials transferred; runner inactive.'
    } catch { Write-Error 'Private directory initialization failed; stop without elevation or activation.'; exit 1 }
}
