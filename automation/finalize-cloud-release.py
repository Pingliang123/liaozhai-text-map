"""Refresh public download checksums and the revision inside the research ZIP."""
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
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as target:
        for entry in source.infolist():
            if entry.filename != 'manual-revisions.json' and entry.filename not in OBSOLETE_ARCHIVE_FILES:
                target.writestr(entry, source.read(entry.filename))
        target.writestr('manual-revisions.json', revisions)
    temporary.replace(archive)
    manifest = json.loads((root / 'release-manifest.json').read_text(encoding='utf-8'))
    manifest['research_files'] = [row for row in manifest.get('research_files', []) if row['path'] not in OBSOLETE_ARCHIVE_FILES]
    manifest['counts'].update(manual_chapters=len(bundle['revisions']['overrides']), manual_locations=len(bundle['revisions']['place_locations']))
    for row in manifest.get('research_files', []):
        if row['path'] == 'manual-revisions.json':
            row.update(bytes=len(revisions), sha256=hashlib.sha256(revisions).hexdigest())
    manifest['artifacts'] = []
    for file in sorted(root.iterdir()):
        if file.is_file() and file.name in PUBLIC_ARTIFACTS:
            data = file.read_bytes()
            manifest['artifacts'].append({'path': file.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    (root / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')

if __name__ == '__main__':
    finalize(Path.cwd())
