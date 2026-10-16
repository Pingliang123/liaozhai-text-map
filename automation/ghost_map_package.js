(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('./ghost_map_model.js') : root.GhostMapModel;
  const identity = base => base.corpus_id || base.source_sha256;
  const fail = message => { throw new Error(message); };
  function validate(bundle, current) {
    if (!bundle || bundle.package_type !== 'liaozhai-text-map' || bundle.package_version !== 1) fail('不是受支持的总资料包');
    const base = bundle.base;
    if (!base || base.schema_version !== 2 || identity(base) !== identity(current)) fail('总资料包的底本文本不匹配');
    if (!Array.isArray(base.chapter_overview) || !Array.isArray(base.places)) fail('总资料包缺少篇目或地图数据');
    for (const key of Object.keys(current)) {
      if (!Object.hasOwn(base, key) || typeof base[key] !== typeof current[key] || Array.isArray(base[key]) !== Array.isArray(current[key])) fail('总资料包缺少或损坏资料字段：' + key);
    }
    // A matching ID alone is insufficient: preserve every original unit and token offset.
    const source = data => data.chapter_overview.map(c => [c.chapter_id, c.chapter, c.source_units]);
    if (JSON.stringify(source(base)) !== JSON.stringify(source(current))) fail('总资料包的原文或分词基线不完整、不一致');
    for (const c of base.chapter_overview) {
      if (!Array.isArray(c.people) || !Array.isArray(c.places) || !Array.isArray(c.realm_evidence) || !c.event_types || !Array.isArray(c.realms_present)) fail('总资料包篇目资料不完整');
    }
    const model = M.create(base);
    for (const id of model.ids) model.save(id, model.editable(id));
    // Validate all imported saved changes against the bundled baseline before any write.
    model.importDocument(bundle.revisions);
    return {...bundle, revisions:model.document()};
  }
  function create(base, revisions) {
    const bundle = {package_type:'liaozhai-text-map', package_version:1, exported_at:new Date().toISOString(),
      note:'完整基线与人工修订保存在同一文件；恢复时人工修订优先。', base, revisions};
    return validate(bundle, base);
  }
  function database(idb, key, value, write) {
    if (!idb) return Promise.reject(new Error('此浏览器不支持完整资料包恢复，请保留下载文件并换用支持 IndexedDB 的浏览器'));
    return new Promise((resolve, reject) => {
      const request = idb.open('liaozhai-text-map-packages', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('packages');
      request.onerror = () => reject(new Error('无法打开本机资料包存储'));
      request.onsuccess = () => {
        const db = request.result;
        let result;
        try {
          const transaction = db.transaction('packages', write ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('packages');
          const operation = write ? store.put(value, key) : store.get(key);
          operation.onsuccess = () => { result = operation.result; };
          transaction.oncomplete = () => { db.close(); resolve(result); };
          transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('资料包未保存：本机空间不足或存储被限制，现有资料保留')); };
        } catch (error) { db.close(); reject(error); }
      };
    });
  }
  const api = {identity, validate, create,
    load:(idb, base) => database(idb, identity(base), null, false),
    install:(idb, current, bundle) => database(idb, identity(current), validate(bundle, current), true)};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GhostMapPackage = api;
})(globalThis);
