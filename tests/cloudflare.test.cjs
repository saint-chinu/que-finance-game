const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('Cloudflare artifact serves assets separately and keeps API requests in the shared engine', async () => {
  execFileSync(process.execPath, ['scripts/build-cloudflare.cjs'], { cwd: root });
  const worker = (await import('../.cloudflare/worker.mjs')).default;
  let served = 0;
  const env = { ASSETS: { fetch: async () => { served++; return new Response('asset'); } } };
  assert.equal(await (await worker.fetch(new Request('https://game.test/'), env)).text(), 'asset');
  assert.equal((await worker.fetch(new Request('https://game.test/api/scenario'), env)).status, 503);
  assert.equal((await worker.fetch(new Request('https://game.test/', { method: 'POST' }), env)).status, 405);
  assert.equal(served, 1);
  assert(fs.existsSync(path.join(root, '.cloudflare/public/index.html')));
  assert(!fs.existsSync(path.join(root, '.cloudflare/public/server')));
  assert(!fs.existsSync(path.join(root, '.cloudflare/public/.openai')));
  const config = JSON.parse(fs.readFileSync(path.join(root, '.cloudflare/wrangler.local.json')));
  assert.equal(config.d1_databases[0].binding, 'DB');
  assert.equal(config.d1_databases[0].migrations_dir, '../drizzle');
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
});

test('production deployment refuses absent database identity before any remote action', () => {
  const result = spawnSync(process.execPath, ['scripts/configure-cloudflare.cjs'], {
    cwd: root, env: { ...process.env, CLOUDFLARE_D1_DATABASE_ID: '' }, encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLOUDFLARE_D1_DATABASE_ID/);
});
