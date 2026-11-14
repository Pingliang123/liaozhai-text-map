const test=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const t=require('../reports/chapter-spatial-types-tsne.json'),p=require('../reports/chapter-spatial-types-visualization.json');
test('t-SNE changes coordinates without changing labels or probabilities',()=>{
 a.equal(t.source_sha256,p.source_sha256);a.equal(t.points.length,443);
 t.points.forEach((point,i)=>{const{x,y,...rest}=point;const{x:ox,y:oy,...original}=p.points[i];a.deepEqual(rest,original);a.ok(Number.isFinite(x)&&Number.isFinite(y));});
 a.deepEqual(t.unassigned,p.unassigned);a.equal(t.parameters.random_state,42);
 a.ok(t.trustworthiness_10_neighbors>=0&&t.trustworthiness_10_neighbors<=1);
});
test('interactive alternative embeds actual t-SNE coordinates and both color modes',()=>{
 const html=fs.readFileSync(require.resolve('../reports/篇目空間主題_tSNE互動圖.html'),'utf8');
 const script=html.split('<script>')[1].split('</script>')[0];new vm.Script(script);
 a.deepEqual(JSON.parse(script.slice(script.indexOf('const D=')+8,script.indexOf(',ns='))),t);a.ok(html.includes('五主题分组')&&html.includes('异事类型对照'));a.ok(!html.includes('PCA'));
});
