"""Package the current website and canonical corpus, retaining research sources."""
import hashlib
import json
from pathlib import Path
import zipfile

OBSOLETE_ARCHIVE_FILES = {
    'outputs/ghost_map/聊齋鬼怪歷史地理互動地圖.html',
    'outputs/ghost_map/全書詞雲.png',
}
PUBLIC_ARTIFACTS = {
    'index.html', 'data.html', 'data-package.json', 'manual-revisions.json',
    'research-data.zip', 'github-sync.js', 'github-login.js',
    'github-sync-config.json', 'audit-reports.js',
}

def finalize(root):
    root = Path(root)
    revisions = (root / 'manual-revisions.json').read_bytes()
    bundle = json.loads((root / 'data-package.json').read_text(encoding='utf-8'))
    if json.loads(revisions) != bundle['revisions']:
        raise ValueError('Canonical revisions do not match the published package')
    archive = root / 'research-data.zip'
    temporary = root / 'research-data.next.zip'
    current_files = {name: root / name for name in PUBLIC_ARTIFACTS - {'research-data.zip'} if (root / name).is_file()}
    for file in (root / 'assets').rglob('*'):
        if file.is_file():
            current_files[file.relative_to(root).as_posix()] = file
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as target:
        for entry in source.infolist():
            if entry.filename not in current_files and entry.filename not in OBSOLETE_ARCHIVE_FILES:
                target.writestr(entry, source.read(entry.filename))
        for name, file in sorted(current_files.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(entry, file.read_bytes())
    temporary.replace(archive)
    manifest = json.loads((root / 'release-manifest.json').read_text(encoding='utf-8'))
    manifest['research_files'] = [row for row in manifest.get('research_files', []) if row['path'] not in OBSOLETE_ARCHIVE_FILES]
    manifest['counts'].update(manual_chapters=len(bundle['revisions']['overrides']), manual_locations=len(bundle['revisions']['place_locations']))
    research = {row['path']: row for row in manifest.get('research_files', [])}
    for name, file in current_files.items():
        data = file.read_bytes()
        research[name] = {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    manifest['research_files'] = list(research.values())
    manifest['artifacts'] = []
    for file in sorted(root.iterdir()):
        if file.is_file() and file.name in PUBLIC_ARTIFACTS:
            data = file.read_bytes()
            manifest['artifacts'].append({'path': file.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    (root / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')

if __name__ == '__main__':
    finalize(Path.cwd())
