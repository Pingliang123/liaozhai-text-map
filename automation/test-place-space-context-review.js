const assert=require('assert/strict'),{revise}=require('./review-place-space-contexts');
const c={chapter:'甲',source_units:[{text:'逾年达金陵。'}]},d={places:[{word:'达金陵'},{word:'金陵'}],space_words:[],segmentation_note:'逾年 / 达金陵 / 。'};
revise(c,d,[1,'places','达金陵','金陵']);assert.deepEqual(d.places,[{word:'金陵'}]);assert.equal(d.segmentation_note,'逾年 / 达 / 金陵 / 。');assert.equal(revise(c,d,[1,'places','达金陵','金陵']),null);
const e={places:[],space_words:['君']};revise({chapter:'乙',source_units:[{text:'洞庭君山间有石洞'}]},e,[2,'spaces','君','君山','places']);assert.deepEqual(e.space_words,[]);assert.equal(e.places[0].word,'君山');
console.log('PASS contextual repairs: segmentation preserves text, categories, deduplication and repeat runs');
