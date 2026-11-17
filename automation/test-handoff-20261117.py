"""Validate the portable research handoff without modifying source data."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HandoffTests(unittest.TestCase):
    def test_documents_and_references(self):
        texts = [
            (ROOT / 'reports' / name).read_text(encoding='utf-8')
            for name in ('項目交接總結_20261117.md', '新窗口提示詞_20261117.md')
        ]
        for text in texts:
            self.assertGreater(len(text), 1000)
            self.assertNotRegex(text, r'sk-[A-Za-z0-9]{16,}')
        for ref in set(re.findall(r'`((?:reports|automation)/[^`]+)`', '\n'.join(texts))):
            self.assertTrue((ROOT / ref).is_file(), ref)
        self.assertIn('項目交接總結_20261117.md', texts[1])

    def test_report_totals(self):
        self.assertEqual(sum([60, 122, 105, 30, 56, 66, 9, 14, 3, 4, 6, 1, 7, 1, 3, 4]), 491)
        self.assertEqual(645 + 1002, 1647)
        self.assertEqual(2581 + 2370, 4951)
        self.assertEqual(259 + 151 + 108 + 104 + 23, 645)


if __name__ == '__main__':
    unittest.main()
