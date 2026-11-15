import runpy,unittest,json,pathlib
R=pathlib.Path(__file__).resolve().parents[1];m=runpy.run_path(str(R/'automation/chapter-space-only-similarity.py'));np=m['np']
class Tests(unittest.TestCase):
 def test_known(self):
  v,j,c=m['compute']([['门','室','室'],['门','院'],['门','室','室']]);self.assertAlmostEqual(j[0,1],1/3);self.assertEqual(j[0,2],1);self.assertAlmostEqual(c[0,2],1)
 def test_saved(self):
  d=json.loads((R/'reports/chapter-space-only-similarity.json').read_text(encoding='utf8'));self.assertEqual(len(d['chapters']),443);self.assertEqual(len(set(d['order'])),443)
  for name in ['jaccard','cosine']:
   a=np.array(d[name]);np.testing.assert_allclose(a,a.T);np.testing.assert_allclose(np.diag(a),1);self.assertTrue(((a>=0)&(a<=1.0000001)).all())
  for c in d['chapters']:
   for name in ['jaccard','cosine']:
    ns=c['nearest'][name];self.assertEqual(len(ns),10);self.assertTrue(all(n['id']!=c['id']for n in ns));self.assertEqual([n['similarity']for n in ns],sorted([n['similarity']for n in ns],reverse=True))
if __name__=='__main__':unittest.main()
