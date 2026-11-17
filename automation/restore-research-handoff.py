"""Restore the frozen research inputs; never overwrite a different local input."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'reports' / 'research-handoff-inputs-20261117.zip'
NAMES = {'latest-live-package.json', 'latest-place-space-input.json',
         'spatial-vocabulary-registry.json'}


def restore(archive=ARCHIVE, destination=ROOT / '.network-runtime'):
    destination = Path(destination)
    with zipfile.ZipFile(archive) as z:
        manifest = json.loads(z.read('manifest.json'))
        if set(manifest['files']) != NAMES or set(z.namelist()) != NAMES | {'manifest.json'}:
            raise ValueError('Unexpected archive members')
        payloads = {name: z.read(name) for name in NAMES}
        for name, data in payloads.items():
            if hashlib.sha256(data).hexdigest() != manifest['files'][name]:
                raise ValueError('Checksum mismatch: ' + name)
            target = destination / name
            if target.exists() and target.read_bytes() != data:
                raise FileExistsError('Preserving different local file: ' + str(target))
        destination.mkdir(parents=True, exist_ok=True)
        for name, data in payloads.items():
            target = destination / name
            if not target.exists():
                with target.open('xb') as f:
                    f.write(data)
    return manifest


if __name__ == '__main__':
    restored = restore()
    print('Verified and restored 3 frozen research inputs; current publication data unchanged.')
