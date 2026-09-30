const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const database = process.env.CLOUDFLARE_D1_DATABASE_ID;
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(database || '')) {
  console.error('CLOUDFLARE_D1_DATABASE_ID に、Cloudflareで作成したD1の実際のUUIDを設定してください。デプロイは実行していません。');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.template.json'), 'utf8'));
config.d1_databases[0].database_id = database;
fs.mkdirSync(path.join(root, '.cloudflare'), { recursive: true });
fs.writeFileSync(path.join(root, '.cloudflare/wrangler.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Cloudflare deployment configuration ready.');
