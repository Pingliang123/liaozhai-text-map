(function (root) {
  'use strict';
  const EVENTS = ['人', '鬼', '妖', '神'];
  const PEOPLE = ['人', '鬼', '妖', '神'];
  const REALMS = ['人间', '天界', '地界'];
  const LEVELS = {unknown:'待核',province:'省级',prefecture:'府／州／地市级',county:'县级',town:'乡镇级',village:'村落',natural:'山川水域',region:'区域／跨界'};
  const PLACE_REVIEW = typeof module!=='undefined' && module.exports ? require('./direction_place_review.json') : root.GhostMapPlaceReview || {};
  function placeWordReason(word, chapter='') {
    if(PLACE_REVIEW.chapter_exclusions?.[chapter]?.[word]) return PLACE_REVIEW.chapter_exclusions[chapter][word];
    if(PLACE_REVIEW.exclude?.[word]) return PLACE_REVIEW.exclude[word];
    if(PLACE_REVIEW.spaces?.[word]) return '相对方位／篇内空间，改列空间词：'+PLACE_REVIEW.spaces[word];
    if(PLACE_REVIEW.replacements?.[word]) return '误切片语，修正为：'+PLACE_REVIEW.replacements[word];
    if(word==='北山') return '未具名山地场景，归为空间词。';
    if(word==='北闱' || word==='北闈') return '赴试表述，不作独立地名。';
    return /^[东西南北東](?:去|行|距|走|往)?[一二三四五六七八九十百千万萬两兩数數几幾\d]+(?:余|餘|多)?里(?:许|許)?$/.test(word)
      ? '方位与距离片语，描述位置关系，不是地理专名。' : '';
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const strings = (values, allowed, label) => {
    assert(Array.isArray(values), label + '格式错误');
    assert(values.every(v => typeof v === 'string' && allowed.includes(v)), label + '包含不支援的值');
    assert(new Set(values).size === values.length, label + '不可重复');
    return [...values];
  };
  const text = (value, label, limit = 50000) => {
    assert(typeof value === 'string' && value.length <= limit, label + '格式或长度错误');
    return value.trim();
  };
  function create(base) {
    const table = base.migration_strings || {};
    const maxWord = Math.max(1, ...Object.keys(table).map(w => w.length));
    const simplify = value => {
      let out = '';
      for (let i = 0; i < value.length;) {
        let length = Math.min(maxWord, value.length - i);
        while (length > 1 && !Object.hasOwn(table, value.slice(i, i + length))) length--;
        const part = value.slice(i, i + length);
        out += Object.hasOwn(table, part) ? table[part] : part; i += length;
      }
      return out;
    };
    const convert = value => typeof value === 'string' ? simplify(value) : Array.isArray(value)
      ? value.map(convert) : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [simplify(k), convert(v)])) : value;
    const chapters = new Map(base.chapter_overview.map(c => [c.chapter_id, c]));
    const overrides = new Map();
    const locations = new Map();
    const views = new Map(), placeViews = new Map();
    let geographicCache = null;
    const normalize = base.name_aliases || {};
    const rejectedPlaces = new Set(base.rejected_place_words || []);
    const name = value => Object.hasOwn(normalize, value) ? normalize[value] : value;
    const placeID = word => base.places.find(p => name(p.name) === word)?.id || 'custom-place-' + encodeURIComponent(word);
    function validateLocation(input) {
      assert(input && typeof input === 'object', '定位资料格式错误');
      const word = name(simplify(text(input.name, '文本地名', 100)));
      assert(word && !rejectedPlaces.has(word), '地点词无效');
      assert(base.places.some(p => name(p.name) === word) || [...chapters.values()].some(c => c.places.some(p => name(p.word) === word)) ||
        [...overrides.keys()].some(id => view(id).places.some(p => name(p.word) === word)), '请先把地名加入篇目的地点词');
      assert(Object.hasOwn(LEVELS, input.admin_level), '地名层级无效');
      const record = {name:word, admin_level:input.admin_level, parent_id:text(input.parent_id || '', '关联上级／参考区域', 300) || null};
      for (const key of ['modern_name','region_description','modern_level','source_url','note']) record[key] = text(input[key] || '', '定位信息', key === 'source_url' ? 2000 : 3000);
      assert(record.region_description, '请填写所在区域说明');
      assert(!record.source_url || /^https?:\/\/[^\s]+$/i.test(record.source_url), '来源链接须为 http 或 https');
      assert(['pending','approximate','reference'].includes(input.coordinate_kind), '定位精度无效');
      record.coordinate_kind = input.coordinate_kind;
      const blank = v => v === undefined || v === null || v === '';
      assert(blank(input.lon) === blank(input.lat), '经纬度须同时填写或同时留空');
      record.lon = blank(input.lon) ? null : input.lon; record.lat = blank(input.lat) ? null : input.lat;
      if (record.lon !== null) {
        assert(typeof record.lon === 'number' && Number.isFinite(record.lon) && Math.abs(record.lon) <= 180 &&
          typeof record.lat === 'number' && Number.isFinite(record.lat) && Math.abs(record.lat) <= 85, '经纬度超出地图有效范围');
        assert(record.coordinate_kind !== 'pending', '填写坐标后请选择参考点或区域近似点');
        assert(record.region_description && (record.source_url || record.note), '定位须填写区域及来源或定位依据');
      } else assert(record.coordinate_kind === 'pending', '没有坐标时请选择待定位');
      return record;
    }
    function checkLocationGraph(records) {
      const parents = new Map(base.places.map(p => [p.id,p.parent_id || null]));
      for (const r of records.values()) parents.set(placeID(r.name),r.parent_id);
      for (const [id,parent] of parents) {
        assert(!parent || parents.has(parent), '包含区域不存在');
        const seen = new Set([id]); let cursor = parent;
        while (cursor) { assert(!seen.has(cursor), '地点包含关系不可成环'); seen.add(cursor); cursor = parents.get(cursor); }
      }
    }
    function placeInfo(word) {
      word = name(simplify(word));
      const p = base.places.find(p => name(p.name) === word);
      return clone(locations.get(word) || {name:word,modern_name:p?.modern_name || '',region_description:p?.region_description || '',
        admin_level:p?.admin_level || (p?.scale_category === 'province' ? 'province' : p?.scale_category === 'natural' ? 'natural' : 'unknown'),
        modern_level:p?.modern_level || '',parent_id:p?.parent_id || null,lon:p?.lon ?? null,lat:p?.lat ?? null,
        coordinate_kind:p ? (p.coordinate_kind || 'reference') : 'pending',source_url:p?.source_url || '',note:p?.note || ''});
    }
    function places() {
      if(geographicCache) return geographicCache;
      const rows = new Map(base.places.map(p => [name(p.name),p]));
      for (const r of locations.values()) {
        const original = rows.get(r.name);
        if (r.lon === null) { rows.delete(r.name); continue; }
        const category = r.admin_level === 'province' ? 'province' : r.admin_level === 'natural' ? 'natural' : r.admin_level === 'region' ? 'cultural' : 'settlement';
        rows.set(r.name,{...original,...r,id:placeID(r.name),chapter_ids:modelIDs.filter(id => view(id).places.some(p => name(p.word) === r.name)),
          modern_name:r.modern_name || r.region_description,search_names:[r.name,r.modern_name,r.region_description],scale_category:category,
          scale_label:LEVELS[r.admin_level],historical_level_status:'用户提供的文本地名层级；年代与范围见定位依据。',
          mapping_review_status:r.coordinate_kind === 'approximate' ? '人工区域近似点' : '人工参考点',confidence:'user',
          location_audit:{status:'user',note:'当前定位由用户修订；原始自动核查不覆盖用户判断。'},
          level_label:LEVELS[r.admin_level], min_zoom:1});
      }
      geographicCache=[...rows.values()].filter(p=>!placeWordReason(name(p.name))); return geographicCache;
    }
    const modelIDs = [...chapters.keys()];
    const view = id => {
      assert(chapters.has(id), '篇目不存在');
      if (!views.has(id)) {
        const c = {...chapters.get(id), ...(overrides.get(id) || {})};
        const source=c.source_units.map(u=>u.text || u.original || '').join('');
        const spaces=new Set(c.space_words || []), words=new Map();
        for(const p of c.places) {
          const word=name(p.word), target=PLACE_REVIEW.replacements?.[word], space=PLACE_REVIEW.spaces?.[word];
          if(space && source.includes(space) && c.lexical_reviews?.['spaces:'+space]?.status!=='rejected') spaces.add(space);
          if(target && source.includes(target)) words.set(target,{...p,word:target});
          else if(!placeWordReason(word,c.chapter)) words.set(word,p);
        }
        views.set(id, {...c, places:[...words.values()], space_words:[...spaces]});
      }
      return views.get(id);
    };
    function validate(id, input) {
      const originalNarrative = input?.narrative_events;
      input = convert(input);
      assert(chapters.has(id), '修订包含不存在的篇目');
      assert(input && typeof input === 'object', '修订格式错误');
      const result = {
        event_types: {}, realms_present: strings(input.realms_present, REALMS, '三界'),
        review_note: text(input.review_note || '', '修订说明', 10000),
        segmentation_note: text(input.segmentation_note || '', '分词修订', 200000),
      };
      const reviews = input.lexical_reviews === undefined ? view(id).lexical_reviews || {} : input.lexical_reviews;
      assert(reviews && typeof reviews === 'object' && !Array.isArray(reviews) && Object.keys(reviews).length <= 5000, '词语审核格式错误');
      result.lexical_reviews = {};
      for (const [key, row] of Object.entries(reviews)) {
        assert(/^(people|places|spaces|times):.{1,100}$/u.test(key), '词语审核键无效');
        assert(row && ['accepted','rejected','pending','corrected'].includes(row.status), '词语审核状态无效');
        result.lexical_reviews[key] = {status:row.status, word:text(row.word || '', '修订词语',100), kind:text(row.kind || '', '修订分类',20), note:text(row.note || '', '审核说明',3000)};
        assert(!row.kind || ['people','places','spaces','times'].includes(row.kind), '修订分类无效');
      }
      const years = input.years === undefined ? view(id).years || {} : input.years;
      assert(years && typeof years === 'object' && !Array.isArray(years), '时间词格式错误');
      assert(Object.keys(years).length <= 500, '时间词过多');
      result.years = {};
      const source = chapters.get(id).source_units.map(u => u.text || u.original).join('');
      for (const word of Object.keys(years)) {
        const term = text(word, '时间词', 100);
        assert(term && source.includes(term), '时间词必须在本篇简体原文中出现：' + term);
        result.years[term] = source.split(term).length - 1;
      }
      assert(input.event_types && typeof input.event_types === 'object' && !Array.isArray(input.event_types), '异事类型格式错误');
      for (const type of Object.keys(input.event_types)) {
        assert(EVENTS.includes(type) && input.event_types[type] === 1, '异事类型只接受人、鬼、妖、神的篇目标记');
        result.event_types[type] = 1;
      }
      assert(Array.isArray(input.places) && input.places.length <= 500, '地点格式错误');
      result.places = input.places.map(p => {
        const word=text(p.word,'地点',100), target=PLACE_REVIEW.replacements?.[word];
        return {word:target && source.includes(target) ? target : word,mentions:0};
      }).filter(p => !rejectedPlaces.has(name(p.word)) && !rejectedPlaces.has(p.word) && !placeWordReason(name(p.word),chapters.get(id).chapter));
      if(input.places.some(p=>PLACE_REVIEW.replacements?.[p.word])) result.places = [...new Map(result.places.map(p=>[p.word,p])).values()];
      assert(result.places.every(p => p.word), '地点不可为空');
      assert(new Set(result.places.map(p => name(p.word))).size === result.places.length, '地点不可重复');
      const spaces = input.space_words === undefined ? view(id).space_words || [] : input.space_words;
      assert(Array.isArray(spaces) && spaces.length <= 500, '空间词格式错误');
      result.space_words = spaces.map(w => text(w, '空间词', 100));
      assert(result.space_words.every(w => w && source.includes(w)), '空间词必须在本篇简体原文中出现');
      assert(new Set(result.space_words).size === result.space_words.length, '空间词不可重复');
      const narrative = input.narrative_events === undefined ? view(id).narrative_events || [] : input.narrative_events;
      assert(Array.isArray(narrative) && narrative.length <= 100, '情节路径格式错误');
      result.narrative_events = narrative.map((row,index) => {
        assert(row && typeof row === 'object', '情节记录格式错误');
        const unit = chapters.get(id).source_units.find(u => u.unit === row.unit);
        const entry = {unit: row.unit};
        for (const field of ['actors', 'location', 'space', 'event', 'identity', 'interpretation', 'quote']) entry[field] = text(row[field] || '', '情节字段', 3000);
        for (const field of ['from_space', 'to_space', 'temporal_order', 'space_function', 'boundary_medium']) {
          if (row[field] !== undefined) entry[field] = text(row[field], '空间转换字段', 500);
        }
        if (row.narrative_role) {
          assert(['隔离','通行','转换','显影','审判','庇护','诱导','混合'].includes(row.narrative_role), '空间叙事功能无效');
          entry.narrative_role = row.narrative_role;
        }
        if (row.transition_kind !== undefined) {
          assert(['mention', 'movement', 'plot'].includes(row.transition_kind), '空间转换类型错误');
          entry.transition_kind = row.transition_kind;
          if (row.transition_kind === 'movement') assert(entry.from_space && entry.to_space, '人物移动须填写出发与到达空间');
        }
        assert(entry.actors && entry.space && entry.event, '情节记录须填写人物、空间和事件');
        for (const field of ['from_place_id','to_place_id']) if (row[field]) entry[field]=text(row[field], '地图绑定地点', 500);
        for (const [field,allowed] of [['space_access',['私人','公共','混合','开放自然','待核']],['space_realm',['人间','异境','待核']]]) {
          if (row[field]) { assert(allowed.includes(row[field]),'空间分类无效'); entry[field]=row[field]; }
        }
        for(const [field,allowed] of [['from_access',['私人','公共','混合','开放自然','待核']],['from_realm',['人间','异境','待核']],...['from_type','to_type'].map(field=>[field,['家宅','卧室内室','书斋','庭院园林','道路街市','官署考场','寺观','旅店','自然山野','水域','异境场所','城郭聚落','其他','待核']])]) {
          if(row[field]) { assert(allowed.includes(row[field]),'双端空间分类无效'); entry[field]=row[field]; }
        }
        // Saving an unrelated field must not turn an AI classification into
        // a human judgment. Retain provenance only for unchanged judgments.
        const prior = (view(id).narrative_events || []).find(e => e.unit === row.unit && e.quote === row.quote);
        if (prior?.space_review_source === 'deepseek' && prior.space_access === entry.space_access && prior.space_realm === entry.space_realm) {
          entry.space_review_source = 'deepseek';
          entry.space_review_evidence = prior.space_review_evidence || '';
          if(prior.classification_binding) entry.classification_binding = prior.classification_binding;
        }
        if (prior?.ai_path_review === 'deepseek') entry.ai_path_review = 'deepseek';
        if (prior?.endpoint_review && ['actors','space','event','quote','from_space','to_space','space_access','space_realm'].every(key => (prior[key] || '') === (entry[key] || '')) && (prior.unit_end ?? prior.unit) === (row.unit_end ?? row.unit)) {
          entry.endpoint_review = clone(prior.endpoint_review);
          entry.step_id = prior.step_id;
        }
        const end = row.unit_end === undefined ? entry.unit : row.unit_end;
        const source = chapters.get(id).source_units, first = source.findIndex(u => u.unit === entry.unit), last = source.findIndex(u => u.unit === end);
        assert(Number.isInteger(end) && first >= 0 && last >= first, '情节引文起止单位无效');
        const span = source.slice(first,last+1).map(u => u.text || u.original).join('');
        const verbatim = originalNarrative?.[index]?.quote;
        // Already-matching source quotes must not undergo another conversion:
        // 乾纲 -> 干纲 and 怒徵 -> 怒征 are not idempotent OpenCC mappings.
        if(typeof verbatim === 'string' && span.includes(verbatim.trim())) entry.quote = text(verbatim,'情节字段',3000);
        assert(unit && entry.quote && span.includes(entry.quote), '情节引文必须出自所选本篇原文单位');
        if (end !== entry.unit) entry.unit_end = end;
        return entry;
      });
      assert(Array.isArray(input.people) && input.people.length <= 500, '人物格式错误');
      result.people = input.people.map((p, i) => {
        const word = text(p.word, '人物名称', 100);
        const canonical = text(p.canonical || '', '人物指向', 200);
        assert(word, '人物名称不可为空');
        assert(['candidate', 'reviewed'].includes(p.review_status), '人物审核状态错误');
        if (word.length === 1 && p.review_status === 'reviewed') assert(canonical.length > 1 && canonical !== word, '已确认的单字人物必须填写明确所指人物，不可只重复该字');
        const types = strings(Object.keys(p.person_types || {}).map(t => t === '神／仙' ? '神' : t), PEOPLE, '人物序列');
        assert(Array.isArray(p.aliases || []) && (p.aliases || []).length <= 100, '人物别称格式错误');
        const aliases = (p.aliases || []).map(a => text(a, '人物别称', 100)).filter(Boolean);
        return {id: 'c' + id + '-edited-p' + i, word, canonical, aliases: [...new Set(aliases)],
          review_status: p.review_status, person_types: Object.fromEntries(types.map(t => [t, 1])),
          evidence: text(p.evidence || '', '人物依据', 3000), role: text(p.role || '', '人物说明', 3000),
          ontology_status: p.review_status,
          ontology_evidence: text(p.ontology_evidence || '', '人物类型依据', 3000),
          mentions: null, identity_links: []};
      });
      assert(new Set(result.people.map(p => p.word)).size === result.people.length, '人物名称重复，请合并或补充区分');
      result.evidence_review = {};
      assert(input.evidence_review && typeof input.evidence_review === 'object' && !Array.isArray(input.evidence_review), '空间证据格式错误');
      const evidenceIDs = new Set(chapters.get(id).realm_evidence.map(e => e.id));
      for (const [eid, review] of Object.entries(input.evidence_review)) {
        assert(evidenceIDs.has(eid), '空间证据不属于此篇目');
        assert(['mention', 'crossing', 'reject'].includes(review.kind), '空间关联审核值错误');
        const note = text(review.note || '', '空间审核说明', 3000);
        const origin_place = text(review.origin_place || '', '跨界出发地', 100);
        if (review.kind === 'crossing') {
          assert(note, '确认跨界必须填写人物、方向及原文依据');
          assert(origin_place && result.places.some(p => name(p.word) === name(origin_place)), '确认跨界必须指定本篇地点词中的出发地');
        }
        result.evidence_review[eid] = {kind: review.kind, note, origin_place};
      }
      return result;
    }
    function editable(id) {
      const c = view(id);
      return {event_types: Object.fromEntries(EVENTS.filter(t => c.event_types[t] > 0).map(t => [t, 1])),
        realms_present: [...(c.realms_present || [])], people: clone(c.people), places: clone(c.places),
        review_note: c.review_note || '', segmentation_note: c.segmentation_note || '',
        lexical_reviews: clone(c.lexical_reviews || {}),
        years: clone(c.years || {}),
        space_words: clone(c.space_words || []),
        narrative_events: clone(c.narrative_events || []),
        evidence_review: clone(c.evidence_review || {})};
    }
    function document() {
      return {schema_version: 2, corpus_id: base.corpus_id, source_sha256: base.source_sha256,
        overrides: [...overrides].map(([chapter_id, changes]) => ({chapter_id, changes})),
        place_locations:[...locations.values()].map(clone)};
    }
    function importDocument(doc) {
      assert(doc && doc.schema_version === 2, '只接受新版修订档（schema_version 2）');
      assert((base.corpus_id && doc.corpus_id && doc.corpus_id === base.corpus_id) ||
        doc.source_sha256 === base.source_sha256 || (base.compatible_source_sha256 || []).includes(doc.source_sha256), '修订档不是本版本文本，未套用');
      assert(Array.isArray(doc.overrides) && doc.overrides.length <= chapters.size, '修订篇目清单错误');
      const next = new Map();
      for (const row of doc.overrides) {
        assert(Number.isInteger(row.chapter_id) && !next.has(row.chapter_id), '篇目编号重复或格式错误');
        next.set(row.chapter_id, validate(row.chapter_id, row.changes));
      }
      // Validate against the proposed chapters without losing the current state on failure.
      const previous = new Map(overrides);
      overrides.clear(); for (const [id,changes] of next) overrides.set(id,changes); views.clear();
      const nextLocations = new Map();
      try {
        assert(Array.isArray(doc.place_locations || []) && (doc.place_locations || []).length <= 5000, '定位清单格式错误');
        for (const input of doc.place_locations || []) {
          const row = validateLocation(input); assert(!nextLocations.has(row.name), '定位地名重复'); nextLocations.set(row.name,row);
        }
        checkLocationGraph(nextLocations);
      } catch (error) {
        overrides.clear(); for (const [id,changes] of previous) overrides.set(id,changes); views.clear(); throw error;
      }
      overrides.clear();
      for (const [id, changes] of next) overrides.set(id, changes);
      locations.clear(); for (const [word,row] of nextLocations) locations.set(word,row);
      views.clear(); placeViews.clear(); geographicCache=null;
    }
    function descendants(place) {
      const found = [], seen = new Set([place.id]), queue = [place.id];
      while (queue.length) {
        const parent = queue.shift();
        for (const p of places()) if (p.parent_id === parent && !seen.has(p.id)) {
          seen.add(p.id); found.push(p); queue.push(p.id);
        }
      }
      return found;
    }
    function atPlace(place, aggregate = false) {
      if (aggregate) {
        const all = new Map([place,...descendants(place)].flatMap(p => atPlace(p).map(c => [c.chapter_id,c])));
        return [...all.values()].sort((a,b) => a.chapter_id-b.chapter_id);
      }
      if (!placeViews.has(place.id)) placeViews.set(place.id, [...chapters.keys()].filter(id => overrides.has(id)
        ? view(id).places.some(p => name(p.word) === name(place.name))
        : place.chapter_ids.includes(id)).map(view).sort((a, b) => a.chapter_id - b.chapter_id));
      return placeViews.get(place.id);
    }
    function links(place, allowedIDs) {
      return atPlace(place).filter(c => !allowedIDs || allowedIDs.has(c.chapter_id)).flatMap(c =>
        c.realm_evidence.filter(e => c.realms_present.includes(e.realm) && (c.evidence_review?.[e.id]?.kind !== 'reject'))
          .map(e => {
            const review = c.evidence_review?.[e.id] || {kind: 'mention', note: ''};
            // A crossing from another location in the chapter is NOT a route
            // from the currently selected birthplace or mentioned location.
            return {...e, chapter_id: c.chapter_id, chapter: c.chapter, review: {...review,
              kind: review.kind === 'crossing' && name(review.origin_place) !== name(place.name) ? 'mention' : review.kind}};
          }));
    }
    function activeEvidence(allowedIDs) {
      return [...chapters.keys()].filter(id => !allowedIDs || allowedIDs.has(id)).flatMap(id => {
        const c = view(id);
        return c.realm_evidence.filter(e => c.realms_present.includes(e.realm) && c.evidence_review?.[e.id]?.kind !== 'reject')
          .map(e => ({...e, chapter_id: id, chapter: c.chapter, review: c.evidence_review?.[e.id] || {kind: 'mention', note: ''}}));
      });
    }
    function related(id) {
      const all = [...chapters.keys()].map(view);
      const features = c => {
        const result = new Map();
        for (const word of new Set(c.space_words || [])) {
          const source = c.source_units.find(u => (u.text || u.original || '').includes(word));
          result.set('空间：' + word, {kind:'空间', label:word, weight:1,
            evidence:source ? {unit:source.unit, quote:source.text || source.original} : undefined});
        }
        for (const row of c.narrative_analysis?.motifs || []) result.set('主题：' + row.label, {kind:'主题', label:row.label, weight:2, evidence:row});
        for (const row of c.narrative_analysis?.geography || []) {
          // Exclusions in manual place corrections take precedence over AI.
          const baselinePlaces = chapters.get(c.chapter_id).places.map(p => name(p.word)).sort();
          const currentPlaces = c.places.map(p => name(p.word)).sort();
          if (JSON.stringify(baselinePlaces) !== JSON.stringify(currentPlaces) && !currentPlaces.includes(name(row.name))) continue;
          result.set('地点：' + name(row.name), {kind:'地点', label:name(row.name), weight:row.role === 'event' ? 3 : 1, evidence:row});
        }
        return result;
      };
      const maps = new Map(all.map(c => [c.chapter_id, features(c)])), mine = maps.get(id), frequencies = new Map();
      for (const values of maps.values()) for (const key of values.keys()) frequencies.set(key, (frequencies.get(key) || 0) + 1);
      return all.filter(c => c.chapter_id !== id).map(c => {
        const shared = [...mine].filter(([key]) => maps.get(c.chapter_id).has(key)).map(([key, left]) => {
          const right = maps.get(c.chapter_id).get(key);
          return {kind:left.kind, label:left.label, left:left.evidence, right:right.evidence,
            score:Math.min(left.weight, right.weight) * Math.log(1 + all.length / frequencies.get(key))};
        });
        return {chapter_id:c.chapter_id, chapter:c.chapter, reasons:shared.sort((a,b) => b.score-a.score), score:shared.reduce((s,r) => s+r.score,0)};
      }).filter(c => c.reasons.length).sort((a,b) => b.score-a.score || a.chapter_id-b.chapter_id);
    }
    return {view, editable, atPlace, descendants, links, activeEvidence, document, importDocument, related, places, placeInfo,
      saveLocation: input => {const r=validateLocation(input), next=new Map(locations); next.set(r.name,r); checkLocationGraph(next); locations.set(r.name,r); placeViews.clear(); geographicCache=null;},
      resetLocation: word => {const next=new Map(locations); next.delete(name(word)); checkLocationGraph(next); locations.delete(name(word)); placeViews.clear(); geographicCache=null;},
      save: (id, changes) => {
        const before = editable(id), valid = validate(id, changes), chapter = view(id);
        const stream = c => c.segmentation_note || chapter.source_units.map(u => {
          const s=u.text || u.original, parts=[];let at=0;
          for(const t of u.tokens || []) {const a=Array.isArray(t)?t[0]:t.start,b=Array.isArray(t)?t[1]:t.end;if(a>at)parts.push(s.slice(at,a));parts.push(s.slice(a,b));at=b;}if(at<s.length)parts.push(s.slice(at));return parts.join(' / ');
        }).join('\n');
        const previous=stream(before).split(/[\s/|]+/u).filter(Boolean), tokens=stream(valid).split(/[\s/|]+/u).filter(Boolean);
        const raw=chapter.source_units.map(u=>u.text || u.original).join('').replace(/\s/gu,'');
        if(tokens.join('')!==raw) throw new Error('分词必须与原文一致，只能调整边界');
        const placesChanged=JSON.stringify(before.places.map(p=>p.word))!==JSON.stringify(valid.places.map(p=>p.word));
        if(placesChanged) {
          const boundaries=new Set([0]);let at=0;for(const t of tokens){at+=t.length;boundaries.add(at);}
          const spans=[];for(const p of valid.places){if(!raw.includes(p.word))throw new Error('地点词必须出现在原文：'+p.word);let start=0;while((start=raw.indexOf(p.word,start))!==-1){spans.push([start,start+p.word.length]);start+=p.word.length;}}
          spans.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);const chosen=[];for(const span of spans)if(!chosen.length||span[0]>=chosen[chosen.length-1][1])chosen.push(span);
          for(const [a,b] of chosen){for(const n of [...boundaries])if(n>a&&n<b)boundaries.delete(n);boundaries.add(a);boundaries.add(b);}
          const cuts=[...boundaries].sort((a,b)=>a-b);valid.segmentation_note=cuts.slice(1).map((b,i)=>raw.slice(cuts[i],b)).join(' / ');
        } else if(tokens.join('\0')!==previous.join('\0')) {
          const complete=new Set(tokens), old=new Set(previous), known=new Set([...base.places.map(p=>p.name),...chapter.places.map(p=>p.word)]);
          valid.places=valid.places.filter(p=>!old.has(p.word)||complete.has(p.word));
          for(const word of complete)if(!old.has(word)&&known.has(word)&&!valid.space_words.includes(word)&&!valid.places.some(p=>p.word===word)&&!placeWordReason(word,chapter.chapter))valid.places.push({word,mentions:0});
        }
        overrides.set(id, valid); views.delete(id); placeViews.clear(); geographicCache=null;
      },
      reset: id => { overrides.delete(id); views.delete(id); placeViews.clear(); geographicCache=null; }, hasEdit: id => overrides.has(id),
      ids: [...chapters.keys()], name, simplify};
  }
  function mergeDocuments(base, ancestor, local, remote) {
    const normalized = doc => { const m = create(base); if (doc) m.importDocument(doc); return m.document(); };
    const previous = normalized(ancestor), proposed = normalized(local), incoming = normalized(remote);
    const maps = [previous,proposed,incoming].map(d => new Map(d.overrides.map(row => [row.chapter_id,row.changes])));
    const ids = new Set(maps.flatMap(m => [...m.keys()])), result = [];
    for (const id of ids) {
      const [before,mine,theirs] = maps.map(m => m.get(id));
      const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
      if (!equal(before,mine) && !equal(before,theirs) && !equal(mine,theirs)) {
        throw new Error('保存冲突：《' + base.chapter_overview.find(c => c.chapter_id === id).chapter + '》已在其他页面修改。当前草稿保留，请先下载草稿，再载入最新修订。');
      }
      const changes = !equal(before,mine) ? mine : theirs;
      if (changes) result.push({chapter_id:id,changes});
    }
    const geographicMaps=[previous,proposed,incoming].map(d=>new Map(d.place_locations.map(r=>[r.name,r]))), geographic=[];
    for (const word of new Set(geographicMaps.flatMap(m=>[...m.keys()]))) {
      const [before,mine,theirs]=geographicMaps.map(m=>m.get(word)), equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      if (!equal(before,mine) && !equal(before,theirs) && !equal(mine,theirs)) throw new Error('定位保存冲突：'+word+'已在其他页面修改，当前输入保留。');
      const row=!equal(before,mine)?mine:theirs; if(row) geographic.push(row);
    }
    return normalized({...proposed, overrides:result.sort((a,b) => a.chapter_id-b.chapter_id),place_locations:geographic});
  }
  const api = {create, mergeDocuments, EVENTS, PEOPLE, REALMS, LEVELS, placeWordReason};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GhostMapModel = api;
})(globalThis);
