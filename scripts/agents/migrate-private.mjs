import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { privateHome, readPrivateJson } from './private-home.mjs';
import { validateProductionConfig } from './production-runner.mjs';
import { runnerApi } from './runner-runtime.mjs';
import { migrationPlan, stageMigration, rollbackMigration } from './private-migration.mjs';

try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const mode = process.argv[2];
  if (process.platform !== 'win32' || !['--plan', '--stage', '--rollback', '--auth-check'].includes(mode)) throw Error('Explicit Windows migration mode required.');
  const check = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/agents/private-acl.ps1')], { windowsHide: true, stdio: 'pipe' });
  if (check.status !== 0) throw Error('Private ACL check failed.');
  const destination = privateHome(process.env).root;
  const source = path.join(root, '.local/agent-inbox');
  if (mode === '--plan' || mode === '--stage') validateProductionConfig(await readPrivateJson(path.join(source, 'production/runner-config.json')));
  if (mode === '--plan') {
    const plan = await migrationPlan(source);
    console.log(JSON.stringify({ state: plan.state, files: plan.entries.length, credentialsPrinted: false }));
  } else if (mode === '--stage') {
    await stageMigration(source, destination);
    console.log('Copy verified; both runners remain inactive. Legacy credential protection still required.');
  } else if (mode === '--auth-check') {
    const config = await readPrivateJson(path.join(destination, 'production/runner-config.json'));
    validateProductionConfig(config);
    const status = await runnerApi(new URL('/api/agent-runner', config.url), config.runnerId, config.token)('status');
    if (status.protocol !== 2 || status.runnerMatches !== true) throw Error('Authentication or runner identity mismatch.');
    console.log(JSON.stringify({ authenticationAccepted: true, protocol: status.protocol, runnerOnline: status.runnerOnline === true, action: 'status-only' }));
  } else {
    await rollbackMigration(destination);
    console.log('Migration rolled back inactive. All original and copied files preserved.');
  }
} catch { console.error('Migration stopped safely. Review private records; no activation or deletion performed.'); process.exitCode = 1; }
