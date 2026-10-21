"""Verify cleanup removes obsolete outputs but preserves source and restores data."""
import importlib.util
import json
from pathlib import Path
import tempfile
import zipfile

spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('finalize-cloud-release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
with tempfile.TemporaryDirectory(dir=Path.cwd()) as temporary:
    root = Path(temporary)
    revisions = {'overrides': [], 'place_locations': []}
    (root / 'manual-revisions.json').write_text(json.dumps(revisions), encoding='utf-8')
    (root / 'topic-input.json').write_text('private build input', encoding='utf-8')
    (root / 'data-package.json').write_text(json.dumps({'revisions': revisions}), encoding='utf-8')
    (root / 'index.html').write_text('current website', encoding='utf-8')
    (root / 'assets').mkdir()
    (root / 'assets' / 'current.js').write_text('current code', encoding='utf-8')
    files = [*release.OBSOLETE_ARCHIVE_FILES, 'outputs/ghost_map_template.html', 'outputs/source.txt', 'manual-revisions.json']
    (root / 'release-manifest.json').write_text(json.dumps({'counts': {}, 'research_files': [{'path': f} for f in files]}), encoding='utf-8')
    with zipfile.ZipFile(root / 'research-data.zip', 'w') as archive:
        for name in files:
            archive.writestr(name, 'original content')
    release.finalize(root)
    release.finalize(root)
    with zipfile.ZipFile(root / 'research-data.zip') as archive:
        assert not release.OBSOLETE_ARCHIVE_FILES.intersection(archive.namelist())
        assert archive.read('outputs/source.txt') == b'original content'
        assert archive.read('outputs/ghost_map_template.html') == b'original content'
        assert json.loads(archive.read('manual-revisions.json')) == revisions
        assert json.loads(archive.read('data-package.json'))['revisions'] == revisions
        assert archive.read('index.html') == b'current website'
        assert archive.read('assets/current.js') == b'current code'
    manifest = json.loads((root / 'release-manifest.json').read_text(encoding='utf-8'))
    assert not release.OBSOLETE_ARCHIVE_FILES.intersection(r['path'] for r in manifest['research_files'])
    assert 'topic-input.json' not in {r['path'] for r in manifest['artifacts']}
print('PASS obsolete archive removal, preserved sources, current revisions and repeatable packaging')
