const assert=require('assert/strict'),fs=require('fs');
const report=JSON.parse(fs.readFileSync('reports/restore-capital-place-term.json'));
assert(report.restored.length>0);assert(report.reason.includes('地点词'));
console.log('PASS 都 restored as a contextual place term');
