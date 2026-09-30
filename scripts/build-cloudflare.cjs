const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.cloudflare');
const publicDir = path.join(output, 'public');
fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
// Explicit public allowlist: never publish server code, hosting metadata or archives.
for (const name of ['index.html', 'shop.css', 'expansion.css', 'js', 'assets']) {
  fs.cpSync(path.join(root, 'dist', name), path.join(publicDir, name), { recursive: true });
}
const shared = ['expansion-engine', 'rescue', 'engine', 'bank', 'underwriting', 'replay']
  .map(name => fs.readFileSync(path.join(root, 'dist/js', name + '.js'), 'utf8')).join('\n');
fs.writeFileSync(path.join(output, 'worker.mjs'), shared + '\nconst SITE_FILES = {};\n' + fs.readFileSync(path.join(root, 'worker/index.mjs'), 'utf8'));
// This file is only used by local Wrangler commands; it cannot target a remote database.
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.template.json'), 'utf8'));
config.d1_databases[0].database_id = 'local-que-finance';
fs.writeFileSync(path.join(output, 'wrangler.local.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Cloudflare build ready: shared game engine, separate public assets, D1 binding DB.');
