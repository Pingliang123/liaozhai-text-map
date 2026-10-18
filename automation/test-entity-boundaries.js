const assert=require('assert');const {revise}=require('./fix-entity-boundaries');
function c(text,words){return {source_units:[{text,tokens:[[0,text.length]]}],...words};}
assert.equal(revise(c('赴金陵',{places:[{word:'金陵'}]})).note,'赴 / 金陵');
assert.equal(revise(c('洞庭君',{places:[{word:'洞庭'}],people:[{word:'洞庭君'}]})).note,'洞庭君');
assert.equal(revise(c('入卧室',{space_words:['卧室']})).note,'入 / 卧室');
assert.equal(revise(c('后二十年',{years:{二十年:1}})).note,'后 / 二十年');
const broken={source_units:[{text:'长山',tokens:[[0,1],[1,2]]}],places:[{word:'长山'}]};assert.equal(revise(broken).note,'长山');
const cross={source_units:[{text:'金陵人',tokens:[[0,1],[1,3]]}],places:[{word:'金陵'}]};assert.equal(revise(cross).applied.length,0);
console.log('PASS entity boundaries: four categories, nested names, fragmented and crossed boundaries');
