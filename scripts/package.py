"""Build allowlisted Chrome, Firefox unsigned and Safari conversion-source archives."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parents[1]
runtime = ['identity.js', 'model.js', 'background.js', 'hook.js', 'content.js', 'README.md', 'LICENSE']
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
out = root / 'dist'
out.mkdir(exist_ok=True)
for suffix, manifest_file in [('', 'manifest.json'), ('-firefox-unsigned', 'manifest.firefox.json'), ('-safari-source', 'manifest.json')]:
    manifest = json.loads((root / manifest_file).read_text(encoding='utf-8'))
    assert manifest['version'] == version, 'Version mismatch'
    path = out / f'x-schedule-board{suffix}.zip'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(root / manifest_file, 'manifest.json')
        for file in runtime:
            assert (root / file).is_file(), file
            z.write(root / file, file)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(runtime + ['manifest.json'])
    print(f'Packaged {version}: {path.name}')
