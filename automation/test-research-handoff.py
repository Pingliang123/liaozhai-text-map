import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('handoff', ROOT / 'automation/restore-research-handoff.py')
handoff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handoff)


class TransferTests(unittest.TestCase):
    def test_restore_idempotent_and_preserves_local_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = pathlib.Path(tmp)
            manifest = handoff.restore(destination=target)
            self.assertEqual(len(manifest['files']), 3)
            self.assertEqual(handoff.restore(destination=target), manifest)
            edited = target / 'latest-live-package.json'
            edited.write_text('local revision', encoding='utf-8')
            with self.assertRaises(FileExistsError):
                handoff.restore(destination=target)
            self.assertEqual(edited.read_text(), 'local revision')


if __name__ == '__main__':
    unittest.main()
