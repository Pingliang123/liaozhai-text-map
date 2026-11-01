'use strict';
const assert=require('node:assert/strict'),E=require('./export-deepseek-space-progress');
assert.equal(E.csvCell('甲,"乙"'),'"甲,""乙"""');
assert(E.toCsv(['词','句'],[['金陵','赴金陵']]).startsWith('\uFEFF"词","句"\r\n'));
const summary=E.makeSummary({model:'deepseek-flash',candidates:[{type:'place'},{type:'built'},{type:'place'}],segmentation:[{}]},20,50);
assert(summary.includes('20 / 50'));assert(summary.includes('尚余 30'));assert(summary.includes('专名地点 | 2'));assert(summary.includes('阶段名单'));
console.log('PASS partial progress summary and Excel-compatible CSV escaping');
