const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('five-topic combined vocabulary projection preserves all eligible chapters',()=>{
 const d=require('../reports/place-space-five-topic-results.json'),s=require('../reports/place-space-topic-counts-events.json');
 a.equal(d.source_sha256,s.source_sha256);a.equal(d.points.length,471);a.equal(d.unassigned.length,20);a.equal(d.counts.tokens,4951);
 for(const p of d.points){a.equal(p.weights.length,5);a.ok(Math.abs(p.weights.reduce((x,y)=>x+y)-1)<1e-8);a.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
 const h=fs.readFileSync(require.resolve('../reports/地點與空間詞_五主題篇目比較.html'),'utf8'),js=h.split('<script>')[1].split('</script>')[0];new vm.Script(js);
 a.deepEqual(JSON.parse(js.slice(js.indexOf('const D=')+8,js.indexOf(',ns='))),d);a.ok(h.includes('异事类型对照'));
});
