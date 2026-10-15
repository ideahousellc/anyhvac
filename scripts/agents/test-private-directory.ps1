# Nonproduction fixture only. Retain evidence; never touch legacy files or APIs.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'private-directory.ps1')
$context = Get-AgentPrivateContext
Assert-AgentPrivateTree $context
$fixture = Join-Path (Join-Path $context.Root 'fixtures') ([Guid]::NewGuid().ToString())
New-AgentPrivateDirectory $fixture $context
$env:ANYHVAC_PRIVATE_FIXTURE = $fixture
$env:ANYHVAC_MIGRATION_MODULE = ([Uri](Join-Path $PSScriptRoot 'private-migration.mjs')).AbsoluteUri
$program = @'
import fs from 'node:fs/promises';
import path from 'node:path';
const {stageMigration,verifyMigration,rollbackMigration}=await import(process.env.ANYHVAC_MIGRATION_MODULE);
const base=process.env.ANYHVAC_PRIVATE_FIXTURE;
const source=path.join(base,'source'), destination=path.join(base,'destination');
for(const root of [source,destination]) for(const folder of ['production','runner','audit']) await fs.mkdir(path.join(root,folder),{recursive:true});
await fs.writeFile(path.join(source,'production/runner-config.json'),JSON.stringify({runnerId:'isolated-fixture',token:'NONPRODUCTION-CANARY'}));
const manifest=await stageMigration(source,destination);
await verifyMigration(source,destination,manifest);
await rollbackMigration(destination);
if(JSON.parse(await fs.readFile(path.join(destination,'audit/migration.json'),'utf8')).state!=='rolled-back-inactive') throw Error('Fixture failed');
'@
try {
    $program | node.exe --input-type=module
    if ($LASTEXITCODE -ne 0) { throw 'Fixture failed.' }
    Assert-AgentPrivateTree $context
    Write-Output 'Standard-user fixture migration, rollback and inherited ACL checks passed. Evidence retained privately.'
} finally {
    Remove-Item Env:ANYHVAC_PRIVATE_FIXTURE -ErrorAction SilentlyContinue
    Remove-Item Env:ANYHVAC_MIGRATION_MODULE -ErrorAction SilentlyContinue
}
