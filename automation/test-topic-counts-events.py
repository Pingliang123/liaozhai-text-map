import unittest,runpy,pathlib,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
M=runpy.run_path(str(ROOT/'automation/compare-topic-counts-events.py'));np=M['np']

class AssociationTests(unittest.TestCase):
 def test_bh_known_values(self):
  np.testing.assert_allclose(M['bh']([.01,.04,.03]),[.03,.04,.04])
 def test_length_control_removes_between_stratum_confounding(self):
  theta=np.array([[.9,.1]]*4+[[.1,.9]]*4);labels=np.array([[1],[1],[1],[0],[1],[0],[0],[0]],dtype=float)
  effects,ps=M['test_associations'](theta,labels,np.array([0]*4+[1]*4),permutations=99)
  np.testing.assert_allclose(effects,0,atol=1e-12);np.testing.assert_allclose(ps,1)
 def test_detectable_signal_and_fixed_seed(self):
  theta=np.array([[.9,.1]]*10+[[.1,.9]]*10);labels=np.array([[1]]*10+[[0]]*10,dtype=float);s=np.zeros(20)
  a,p=M['test_associations'](theta,labels,s,permutations=199);b,q=M['test_associations'](theta,labels,s,permutations=199)
  np.testing.assert_allclose(a[:,0],[.8,-.8]);np.testing.assert_equal(p,q);self.assertLessEqual(float(p.max()),.01)
 def test_saved_family_and_canonical_inputs(self):
  d=json.loads((ROOT/'reports/allword-topic-counts-events.json').read_text(encoding='utf8'))
  self.assertEqual(d['source_sha256'],hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest())
  self.assertEqual(d['document_count'],491);self.assertEqual(len(d['associations']),95)
  self.assertEqual([m['k']for m in d['models']],[3,6,10])
  self.assertEqual(sum(d['stratum_sizes']),491)
  np.testing.assert_allclose(M['bh']([r['permutation_p']for r in d['associations']]),[r['global_bh_q']for r in d['associations']])
  for m in d['models']:
   self.assertEqual(len(m['chapters']),491);self.assertEqual(len(m['topics']),m['k'])
   for c in m['chapters']:self.assertEqual(len(c['weights']),m['k']);self.assertAlmostEqual(sum(c['weights']),1)
  for r in d['associations']:
   self.assertEqual(r['n_label']+r['n_other'],491)
   self.assertTrue(.0002<=r['permutation_p']<=1);self.assertTrue(r['permutation_p']<=r['global_bh_q']+1e-10)
if __name__=='__main__':unittest.main()
