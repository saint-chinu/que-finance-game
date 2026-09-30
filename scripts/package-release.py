"""Export tracked deliverables from the working tree, without history or credentials."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
target = Path(sys.argv[1]).resolve()
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
allowed_dirs = {'dist', 'worker', 'db', 'drizzle', 'scripts', 'tests', 'docs', '.github'}
allowed_root = {'package.json', 'package-lock.json', '.gitignore', 'wrangler.template.json', 'drizzle.config.ts', 'RELEASE_README.md', 'README.md'}
manifest = {'engine': 'v44-release', 'base_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(), 'source': 'current tracked working-tree files; existing character artwork edits preserved', 'files': {}}
target.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(filter(None, paths)):
        p = Path(name)
        if p.parts[0] not in allowed_dirs and name not in allowed_root:
            continue
        if any(part in {'.git', '.openai', 'node_modules', '.cloudflare', '.wrangler'} for part in p.parts):
            continue
        if p.parts[:2] == ('dist', 'server') or p.name.startswith(('.env', '.dev.vars')):
            continue
        data = (root / p).read_bytes()
        archive.writestr('que-finance-game/' + name, data)
        manifest['files'][name] = hashlib.sha256(data).hexdigest()
    archive.writestr('que-finance-game/release-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    for name, digest in manifest['files'].items():
        assert hashlib.sha256(archive.read('que-finance-game/' + name)).hexdigest() == digest
print(json.dumps({'path': str(target), 'bytes': target.stat().st_size, 'files': len(manifest['files']), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}))
