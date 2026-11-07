import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const script=new URL('../../../../scripts/oracle/deploy-api.sh',import.meta.url);
const workflow=new URL('../../../../.github/workflows/oracle-api-deploy.yml',import.meta.url);
const frontendDelivery=new URL('../../../../.github/workflows/oracle-frontend-delivery.yml',import.meta.url);
const systemdDiagnostic=new URL('../../../../.github/workflows/oracle-systemd-diagnostic.yml',import.meta.url);
const diagnostic=new URL('../../../../scripts/oracle/check-communication-backlog.sh',import.meta.url);
const startupDiagnostic=new URL('../../../../scripts/oracle/diagnose-api-startup.py',import.meta.url);
const ownerRepair=new URL('../../../../scripts/oracle/repair-oauth-function-owner.py',import.meta.url);
const managerRecovery=new URL('../../../../scripts/oracle/recover-systemd-manager.sh',import.meta.url);
const mcpFailedCleanup=new URL('../../../../scripts/oracle/clear-failed-mcp-brokers.sh',import.meta.url);
const mcpInstaller=new URL('../../../../scripts/oracle/install-mcp-broker.sh',import.meta.url);
const busRecovery=new URL('../../../../scripts/oracle/recover-systemd-bus.sh',import.meta.url);
const ownerTests=new URL('../../../../scripts/oracle/',import.meta.url);

test('Oracle backend release deploys API and Communication worker as one rollback unit',()=>{
 const sh=readFileSync(script,'utf8');
 assert.match(sh,/LOCAL_OK=0/);
 assert.match(sh,/PUBLIC_OK=0/);
 assert.match(sh,/diagnose-api-startup\.py/);
 const portLine=sh.split('\n').find(line=>line.startsWith('API_PORT="$(sed -nE'));
 const portFilter=portLine?.match(/sed -nE '([^']+)'/)?.[1];
 assert.ok(portFilter,'Local health check must parse configured numeric PORT');
 if(process.platform!=='win32'){
  const port=spawnSync('sed',['-nE',portFilter],{input:'PORT=3001\n',encoding:'utf8'});
  assert.equal(port.status,0,port.stderr);
  assert.equal(port.stdout.trim(),'3001');
 }

 assert.match(sh,/API_SERVICE=metadrive-api\.service/);
 assert.match(sh,/WORKER_SERVICE=metadrive-worker\.service/);
 assert.match(sh,/job-worker-entrypoint\.js/);
 assert.match(sh,/restore_override "\$WORKER_BACKUP" "\$WORKER_OVERRIDE"/);
 assert.match(sh,/restore_override "\$API_BACKUP" "\$API_OVERRIDE"/);
 assert.match(sh,/systemctl restart "\$WORKER_SERVICE"/);
 assert.match(sh,/systemctl restart "\$API_SERVICE"/);
 assert.match(sh,/systemctl show -p ExecStart --value "\$WORKER_SERVICE"/);
 assert.match(sh,/systemctl show -p ExecStart --value "\$API_SERVICE"/);
 assert.ok(sh.indexOf('systemctl restart "$API_SERVICE"')<
           sh.lastIndexOf('systemctl restart "$WORKER_SERVICE"'),
  'Schema-owning API must start before the worker');
 if(process.platform!=='win32'){
  const syntax=spawnSync('bash',['-n',fileURLToPath(script)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
});

test('Oracle deployment runs on main backend changes behind environment protection',()=>{
 const yaml=readFileSync(workflow,'utf8');
 assert.match(yaml,/push:\s*\n\s*branches: \[main\]/);
 assert.match(yaml,/apps\/server\/\*\*/);
 assert.match(yaml,/environment: oracle-production/);
 assert.match(yaml,/runs-on: \[self-hosted, linux, ARM64, metadrive-oracle\]/);
 assert.match(yaml,/job-worker-entrypoint\.js/);
 assert.match(yaml,/bash -n scripts\/oracle\/deploy-api\.sh/);
 assert.match(yaml,/statuses: write/);
 assert.match(yaml,/oracle-production\/communication/);
 assert.match(yaml,/check-communication-backlog\.sh/);
 assert.match(yaml,/repair-oauth-function-owner\.py/);
 const startup=readFileSync(startupDiagnostic,'utf8');
 assert.match(startup,/journalctl/);
 assert.match(startup,/sanitize/);
 assert.doesNotMatch(startup,/print\\(logs\\)/);
 const probe=readFileSync(diagnostic,'utf8');
 assert.match(probe,/md_communication_delivery_outbox/);
 assert.match(probe,/md_records/);
 assert.match(probe,/runuser -u postgres/);
 if(process.platform!=='win32'){
  const syntax=spawnSync('bash',['-n',fileURLToPath(diagnostic)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
});

test('Oracle OAuth function ownership repair is restricted, repeatable, and secret-free',()=>{
 const code=readFileSync(ownerRepair,'utf8');
 assert.match(code,/md_oauth_token_allowed/);
 assert.match(code,/NOT rolsuper/);
 assert.match(code,/runuser/);
 assert.doesNotMatch(code,/ALTER ROLE.*SUPERUSER/);
 if(process.platform!=='win32'){
  const py=spawnSync('python3',['-m','unittest','discover','-s',
   fileURLToPath(ownerTests),'-p','test_repair_oauth_function_owner.py'],
   {encoding:'utf8'});
  assert.equal(py.status,0,py.stdout+py.stderr);
 }
});

test('Oracle D-Bus recovery is bounded and cannot mask failed service health',()=>{
 const sh=readFileSync(busRecovery,'utf8');
 const yaml=readFileSync(workflow,'utf8');
 assert.match(yaml,/Recover Oracle systemd D-Bus control plane if unresponsive/);
 assert.match(yaml,/sudo -n env GITHUB_REPOSITORY="\$GITHUB_REPOSITORY" bash scripts\/oracle\/recover-systemd-bus\.sh/);
 assert.match(yaml,/bash -n scripts\/oracle\/recover-systemd-bus\.sh/);
 assert.match(sh,/GITHUB_REPOSITORY/);
 assert.match(sh,/uname -m/);
 assert.match(sh,/\/proc\/1\/comm/);
 assert.match(sh,/systemctl show --property=Version --value/);
 assert.match(sh,/kill -s USR1 1/);
 assert.match(sh,/exit 1/);
 assert.doesNotMatch(sh,/^\s*(?:reboot|poweroff|shutdown|pkill|killall)\b/m);
 assert.doesNotMatch(sh,/kill -s (?!USR1)/);
 assert.ok(yaml.indexOf('Recover Oracle systemd D-Bus')<yaml.indexOf('Build release on the target architecture'));
 assert.ok(yaml.indexOf('Build release on the target architecture')<yaml.indexOf('Verify production runner and active services'));
 if(process.platform!=='win32'){
  const parsed=spawnSync('bash',['-n',fileURLToPath(busRecovery)],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
 }
});

test('One-time Oracle systemd manager reexecution requires a timed-out reload and retains all deployment safeguards',()=>{
 const sh=readFileSync(managerRecovery,'utf8');
 const yaml=readFileSync(workflow,'utf8');
 assert.match(yaml,/Recover stalled systemd daemon-reload once per boot/);
 assert.match(yaml,/bash -n scripts\/oracle\/recover-systemd-manager\.sh/);
 assert.match(yaml,/env GITHUB_REPOSITORY="\$GITHUB_REPOSITORY" bash scripts\/oracle\/recover-systemd-manager\.sh/);
 assert.match(sh,/GITHUB_REPOSITORY/);
 assert.match(sh,/\/proc\/1\/comm/);
 assert.match(sh,/version >= 239/);
 assert.match(sh,/timeout 35 systemctl daemon-reload/);
 assert.match(sh,/\$rc" != 124/);
 assert.match(sh,/metadrive-systemd-manager-reexec-once/);
 assert.match(sh,/set -C/);
 // A spent one-per-boot manager signal guard must still allow a bounded,
 // non-disruptive reset of only failed MCP broker template units.
 assert.match(sh,/Retrying non-disruptive failed MCP broker cleanup/);
 assert.ok(sh.includes('clear-failed-mcp-brokers.sh'));
 assert.match(sh,/if timeout 150 systemctl daemon-reload/);
 assert.equal((sh.match(/kill -s TERM 1/g)??[]).length,1);
 assert.equal((sh.match(/kill -s USR1 1/g)??[]).length,1);
 assert.ok(sh.indexOf('clear-failed-mcp-brokers.sh') <
   sh.indexOf('if timeout 150 systemctl daemon-reload'));
 assert.match(sh,/kill -s TERM 1/);
 assert.doesNotMatch(sh,/^\s*(?:reboot|poweroff|shutdown|pkill|killall)\b/m);
 assert.ok(yaml.indexOf('Recover stalled systemd daemon-reload')<yaml.indexOf('Build release on the target architecture'));
 assert.ok(yaml.indexOf('Deploy existing API/worker and frontend with SQL backup and rollback')>
  yaml.indexOf('Verify production runner and active services'));
 if(process.platform!=='win32'){
  const syntax=spawnSync('bash',['-n',fileURLToPath(managerRecovery)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
});

test('normal main pushes have one full-stack deployment owner, while manual frontend delivery fails closed',()=>{
 const fullstack=readFileSync(workflow,'utf8');
 const frontend=readFileSync(frontendDelivery,'utf8');
 assert.ok(fullstack.includes('branches: [main]'));
 assert.ok(fullstack.includes('apps/web/**'));
 assert.ok(frontend.includes('workflow_dispatch:'));
 assert.ok(!frontend.includes('  push:'),'frontend-only workflow must not race the full-stack main-push deployment');
 assert.ok(frontend.includes('Backend/shared changes require full-stack deployment') || frontend.includes('the live API is behind backend/shared changes'));
 assert.ok(frontend.includes('Frontend deployment blocked:'));
 assert.ok(frontend.includes('exit 1'),'incompatible manual frontend deployment must fail visibly');
 assert.ok(frontend.includes('oracle-production-release-main'),'manual frontend release retains production lock');
});

test('Oracle systemd diagnostic inspects recovery state without mutating live services',()=>{
 const yaml=readFileSync(systemdDiagnostic,'utf8');
 assert.ok(yaml.includes('Inspect recovery guards and transient MCP broker pressure'));
 assert.ok(yaml.includes('metadrive-systemd-manager-reexec-once'));
 assert.ok(yaml.includes('metadrive-systemd-manager-bus-reconnect-once'));
 assert.ok(yaml.includes('systemctl list-units --all'));
 assert.ok(yaml.includes('systemctl show -p Jobs -p NFailedUnits'));
 assert.ok(!yaml.includes('sudo -n systemctl restart'));
 assert.ok(!yaml.includes('sudo -n systemctl daemon-reload'));
});

test('failed MCP unit cleanup is bounded, only touches failed broker instances, and prevents recurrence',()=>{
 const cleanup=readFileSync(mcpFailedCleanup,'utf8');
 const installer=readFileSync(mcpInstaller,'utf8');
 const recovery=readFileSync(managerRecovery,'utf8');
 const workflowSource=readFileSync(workflow,'utf8');
 assert.ok(cleanup.includes('systemctl list-units --all --plain --no-legend --no-pager'));
 assert.ok(cleanup.includes('head -n "$batch"'));
 assert.ok(cleanup.includes('loaded failed failed'));
 assert.ok(cleanup.includes('max_passes=240'));
 assert.ok(!cleanup.includes("list-units --all --failed"),'avoid a full failed-unit listing on overloaded systemd');
 assert.ok(cleanup.includes('systemctl reset-failed --'));
 assert.ok(cleanup.includes('batch=96'));
 assert.ok(cleanup.includes('CollectMode=inactive-or-failed'));
 assert.ok(installer.includes('CollectMode=inactive-or-failed'));
 assert.ok(cleanup.includes('GITHUB_REPOSITORY'));
 assert.ok(cleanup.includes('uname -m'));
 assert.ok(recovery.includes('timeout 900 bash'));
 assert.ok(workflowSource.includes('bash -n scripts/oracle/clear-failed-mcp-brokers.sh'));
 assert.ok(!cleanup.includes('systemctl restart'));
 assert.ok(!cleanup.includes('systemctl stop'));
 assert.ok(!cleanup.includes('systemctl daemon-reload'));
 if(process.platform!=='win32'){
  const syntax=spawnSync('bash',['-n',fileURLToPath(mcpFailedCleanup)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
});

test('OCI latest deployment reuses protected runner and isolates build credentials',()=>{
 const helper=new URL('../../../../scripts/oracle/metadrive-oci-deploy-latest',import.meta.url);
 const install=new URL('../../../../scripts/oracle/install-oci-deploy-control.sh',import.meta.url);
 const operations=new URL('../../../../scripts/oracle/metadrive-mcp-operations',import.meta.url);
 const broker=new URL('../../../../scripts/oracle/metadrive-mcp-broker.py',import.meta.url);
 const fullstack=new URL('../../../../scripts/oracle/deploy-full-stack.sh',import.meta.url);
 const sh=readFileSync(helper,'utf8');
 const installer=readFileSync(install,'utf8');
 const ops=readFileSync(operations,'utf8');
 const brokerPy=readFileSync(broker,'utf8');
 const pipeline=readFileSync(workflow,'utf8');
 const full=readFileSync(fullstack,'utf8');
 assert.ok(sh.includes('[[ $EUID == 0 && $# == 1'));
 assert.match(sh,/\^\[0-9a-f\]\{40\}/);
 assert.match(sh,/metadrive-build/);
 assert.match(sh,/runuser -u metadrive-build/);
 assert.match(sh,/https:\/\/github\.com\/unedev00\/uneengine\.git/);
 assert.match(sh,/refs\/heads\/main/);
 assert.match(sh,/fetched.*==.*sha/);
 assert.match(sh,/remote_sha.*==.*sha/);
 assert.match(sh,/script_digest/);
 assert.match(sh,/updated_digest/);
 assert.match(sh,/chown -R root:root/);
 assert.match(sh,/npm --prefix.*run check/);
 assert.match(sh,/npm --prefix.*run build/);
 assert.match(sh,/backup/);
 assert.match(sh,/deploy-full-stack\.sh/);
 assert.match(sh,/frontend-release\.json/);
 assert.doesNotMatch(sh,/GITHUB_TOKEN|METADRIVE_GITHUB_DEPLOY_TOKEN|gh auth login|curl.*token/);
 assert.match(ops,/deploy_latest\)/);
 assert.match(ops,/deploy_status\)/);
 assert.match(ops,/systemd-run --quiet --collect/);
 assert.match(ops,/RuntimeMaxSec=7200/);
 assert.match(brokerPy,/deploy_latest/);
 assert.match(brokerPy,/deploy_status/);
 assert.match(installer,/useradd --system/);
 assert.match(installer,/metadrive-mcp-broker\.py/);
 assert.match(pipeline,/Install OCI deployment control using the existing operations socket/);
 assert.match(full,/metadrive-full-stack\.lock/);
 if(process.platform!=='win32'){
  for(const item of [helper,install,operations,fullstack]){
   const result=spawnSync('bash',['-n',fileURLToPath(item)],{encoding:'utf8'});
   assert.equal(result.status,0,item.pathname+' '+result.stderr);
  }
  const py=spawnSync('python3',['-c',
   'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())',
   fileURLToPath(broker)],{encoding:'utf8',
   env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(py.status,0,py.stderr);
 }
});

test('manual OCI tenant API normalization is protected, opt-in and restarts services on failure',()=>{
 const action=readFileSync(new URL('../../../../.github/workflows/oracle-tenant-api-names.yml',import.meta.url),'utf8');
 const helper=new URL('../../../../scripts/oracle/run-tenant-api-casefold-action.sh',import.meta.url);
 const sh=readFileSync(helper,'utf8');
 assert.match(action,/workflow_dispatch:/);
 assert.doesNotMatch(action,/^\s+push:/m);
 assert.match(action,/environment: oracle-production/);
 assert.match(action,/runs-on: \[self-hosted, linux, ARM64, metadrive-oracle\]/);
 assert.match(action,/oracle-production-release-main/);
 assert.match(action,/confirmation/);
 assert.match(action,/NORMALIZE TEST TENANT/);
 assert.doesNotMatch(action,/secrets\./);
 assert.match(sh,/md_casefold_tenant_api_names/);
 assert.match(sh,/runuser -u postgres -- psql/);
 assert.match(sh,/metadrive-full-stack\.lock/);
 assert.match(sh,/recover_services/);
 assert.match(sh,/systemctl stop metadrive-worker/);
 assert.match(sh,/systemctl start metadrive-api/);
 assert.match(sh,/sha.*GITHUB_SHA/);
 assert.match(sh,/COMMIT;/);
 assert.doesNotMatch(sh,/DATABASE_URL|curl .*github|sudo.*ssh/);
 if(process.platform!=='win32'){
  const syntax=spawnSync('bash',['-n',fileURLToPath(helper)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
});

test('Oracle release completes CartSession retirement after SQL backup and before frontend',()=>{
 const deploy=readFileSync(new URL('../../../../scripts/oracle/deploy-full-stack.sh',import.meta.url),'utf8');
 const path=new URL('../../../../scripts/oracle/apply-cart-session-retirement.sh',import.meta.url);
 const helper=readFileSync(path,'utf8');
 assert.ok(deploy.indexOf('backup-production-sql.sh')<deploy.indexOf('apply-cart-session-retirement.sh'));
 assert.ok(deploy.indexOf('deploy-api.sh')<deploy.indexOf('apply-cart-session-retirement.sh'));
 assert.ok(deploy.indexOf('apply-cart-session-retirement.sh')<deploy.indexOf('deploy-frontend.sh'));
 const ordered=['migrate-cart-session-to-cart.mjs --apply',
  'upgrade-cart-flow-metadata.mjs --apply',
  'migrate-cart-page-bindings.mjs --apply --publish',
  'retire-cart-session.mjs --apply'];
 for(let i=1;i<ordered.length;i++)
  assert.ok(helper.indexOf(ordered[i-1])<helper.indexOf(ordered[i]),
   'Cart data and live metadata must migrate before the Object is retired');
 assert.match(helper,/runuser -u metadrive -- node/);
 assert.match(helper,/source \/etc\/metadrive\/production\.env/);
 if(process.platform!=='win32'){
  const parsed=spawnSync('bash',['-n',fileURLToPath(path)],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
 }
});
