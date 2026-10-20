"""Archive exact pre-migration documents without adding them to page downloads."""
from pathlib import Path
import subprocess
import zipfile
target = Path('backups/revisions-before-unification-20261020.zip')
target.parent.mkdir(exist_ok=True)
if target.exists():
    raise SystemExit('Backup already exists; preserving it')
with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
    for revision in ['49a3296', 'e3e2ad5']:
        archive.writestr(revision + '-manual-revisions.json', subprocess.check_output(['git', 'show', revision + ':manual-revisions.json']))
print(target)
