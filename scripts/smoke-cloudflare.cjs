const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const E = require('../dist/js/engine.js'), R = require('../dist/js/replay.js');
const base = 'http://127.0.0.1:8787';
// Keep server and requests in the same execution/network namespace.
const server = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev',
  '--config', '.cloudflare/wrangler.local.json', '--port', '8787', '--ip', '127.0.0.1',
  '--inspector-port', '0', '--show-interactive-dev-session=false'], { cwd: root, detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
async function main() {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Wrangler startup timeout')), 45000);
    let output = '';
    const check = chunk => { output += chunk; if (output.includes('Ready on')) { clearTimeout(timer); resolve(); } };
    server.stdout.on('data', check); server.stderr.on('data', check);
    server.on('error', error => { clearTimeout(timer); reject(error); });
    server.on('exit', code => { clearTimeout(timer); reject(Error('Wrangler exited: ' + code + '\n' + output)); });
  });
  let response = await fetch(base + '/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<!DOCTYPE html>/i);
  for (const target of ['/server/index.js', '/.openai/hosting.json', '/worker.mjs']) {
    assert.equal((await fetch(base + target)).status, 404, target);
  }
  const scenario = await (await fetch(base + '/api/scenario')).json();
  assert(scenario.seed);
  response = await fetch(base + '/api/start', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: scenario.scenario }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0], run = await response.json(), state = R.create(run.seed);
  response = await fetch(base + '/api/run/' + run.id + '/step', { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, command: { op: 'run', args: [E.recommend(state), 'list', 'tend'] } }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 1);
  assert.equal((await fetch(base + '/api/run/' + run.id)).status, 404);
  console.log('Cloudflare local smoke passed: assets, hidden files, D1 start, turn replay, ownership.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else process.kill(-server.pid, 'SIGTERM'); } catch {}
});
