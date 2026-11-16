const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html','utf8');
const fragment = html.slice(html.indexOf('  let placeFilterCache;'),html.indexOf('  function renderPlace()'));
let places = [{id:1}], scans = 0;
const fields = {};
const read = new Function('allPlaces','$','matchesLayer','filteredChapters', fragment+';return currentPlaces;')(
  () => places, id => ({value:fields[id]}), () => true, () => {scans++;return [1];});
assert.equal(read(),read());
assert.equal(scans,1);
for(const field of ['place-layer','map-search','event-filter','place-count-scope']){
  fields[field]='changed';read();
}
places = [{id:2}];assert.equal(read()[0].id,2);assert.equal(scans,6);
let frames=[], paints=0;
const code=html.slice(html.indexOf('  let paintPending'),html.indexOf("  map.addEventListener('wheel'"));
const schedule=new Function('requestAnimationFrame','paintMap',code+';return scheduleMapPaint;')(f=>frames.push(f),()=>paints++);
for(let i=0;i<100;i++)schedule();
assert.equal(frames.length,1);frames.shift()();schedule();frames.shift()();assert.equal(paints,2);
console.log('PASS map filter reuse, four filter changes, corpus invalidation and frame batching');
