const assert=require('assert/strict'),{apply}=require('./context-vocabulary-review');
const c={chapter:'测试',source_units:[{text:'林乃托疾，使戚独宿。'}]},d={people:[{word:'林乃托疾',person_types:{人:1}}]};
assert.equal(apply(c,d,[1,'people','林乃托疾','林','林氏']).after,'林');assert.equal(d.people[0].canonical,'林氏');assert.deepEqual(d.people[0].person_types,{人:1});assert.equal(apply(c,d,[1,'people','林乃托疾','林','林氏']),null);
assert.throws(()=>apply(c,{people:[{word:'林乃托疾'}]},[1,'people','林乃托疾','无此姓名','']),/absent/);
const s={space_words:['其中','祠']};apply({chapter:'甲',source_units:[{text:'建祠，肖像其中。'}]},s,[2,'spaces','其中','祠']);assert.deepEqual(s.space_words,['祠']);
console.log('PASS contextual correction: evidence, identity, idempotence and deduplication');
