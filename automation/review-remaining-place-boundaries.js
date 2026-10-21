'use strict';
const fs = require('node:fs');
const M = require('./ghost_map_model');

function apply(pack, doc) {
  const model = M.create(pack.base);
  model.importDocument(doc);
  const changes = [];

  function revise(id, edit) {
    const before = model.editable(id);
    const next = JSON.parse(JSON.stringify(before));
    edit(next);
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    model.save(id, next);
    changes.push({chapter_id: id, chapter: model.view(id).chapter});
  }

  revise(68, next => {
    next.places = next.places.filter(row => row.word !== '徐城');
    next.lexical_reviews['places:徐城'] = {status: 'rejected', word: '徐城', kind: 'places', note: '“父徐城卖浆者”语法有歧义，不能据此确认徐城为地名；暂不归入地点。'};
  });
  revise(71, next => {
    next.segmentation_note = next.segmentation_note.replace('遵化道 / 。', '遵化 / 道 / 。');
    next.places = next.places.filter(row => row.word !== '遵化道');
    if (!next.places.some(row => row.word === '遵化')) next.places.push({word: '遵化', mentions: 0});
    next.lexical_reviews['places:遵化道'] = {status: 'corrected', word: '遵化道', kind: 'places', note: '“遵化道”在句中为官职／辖区组合，分词改为“遵化／道”；地点词保留“遵化”。'};
    next.lexical_reviews['places:遵化'] = {status: 'accepted', word: '遵化', kind: 'places', note: '“诸城邱公为遵化道”中的遵化为直隶地名。'};
  });
  revise(285, next => {
    next.segmentation_note = next.segmentation_note.replace('河南道 / 篆', '河南 / 道 / 篆');
    next.places = next.places.filter(row => !['云南军', '河南道'].includes(row.word));
    if (!next.places.some(row => row.word === '云南')) next.places.push({word: '云南', mentions: 0});
    if (!next.places.some(row => row.word === '河南')) next.places.push({word: '河南', mentions: 0});
    next.lexical_reviews['places:云南军'] = {status: 'corrected', word: '云南军', kind: 'places', note: '原文“充云南军”中的“军”为充军用语；分词已是“云南／军”，地点词仅保留“云南”。'};
    next.lexical_reviews['places:河南道'] = {status: 'corrected', word: '河南道', kind: 'places', note: '原文“握河南道篆”中的“道”为官职／监察区称谓；分词改为“河南／道”，地点词仅保留“河南”。'};
  });
  return {revisions: model.document(), changes};
}

if (require.main === module) {
  const pack = require('../data-package.json');
  const doc = require('../manual-revisions.json');
  const result = apply(pack, doc);
  fs.writeFileSync('manual-revisions.json', JSON.stringify(result.revisions));
  fs.writeFileSync('reports/remaining-place-boundary-review-20261021.json', JSON.stringify({generated_at: new Date().toISOString(), changed: result.changes}, null, 2));
  console.log(`Reviewed remaining place boundaries: ${result.changes.length} chapters changed`);
}

module.exports = {apply};
