'use strict';
const R=require('../assets/spatial-routes');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function supplement(chapter,events){
 const units=chapter.source_units||[],tokens=R.tokenUnits(chapter,R.lexicon(chapter));
 const spatial=new Set([...(chapter.space_words||[]).filter(w=>w.length>=2||/^[室屋庙寺院庭堂阁楼廊门殿狱洞穴]$/u.test(w)),...chapter.places.map(p=>p.word)]);
 const source=units.map(u=>u.text||'').join('');let offset=0;
 const positions=units.map(u=>{const start=offset;offset+=(u.text||'').length;return {start,end:offset};});
 const covered=[];
 for(const event of events){
  const quote=String(event.quote||'');if(!quote)continue;
  const unitIndex=units.findIndex(u=>u.unit===event.unit),near=unitIndex<0?0:positions[unitIndex].start;
  let start=source.indexOf(quote,near);if(start<0)start=source.indexOf(quote);
  if(start>=0)covered.push({start,end:start+quote.length});
 }
 const result=[];
 units.forEach((unit,i)=>{
  const text=unit.text||'',terms=[...new Set((tokens[i]||[]).filter(t=>spatial.has(t)))];
  const missing=terms.filter(word=>{
   let at=text.indexOf(word);while(at>=0){const start=positions[i].start+at;if(!covered.some(span=>span.start<=start&&span.end>=start+word.length))return true;at=text.indexOf(word,at+word.length);}return false;
  });
  if(!missing.length)return;
  const roles={from:'',to:'',stay:''};
  for(const [role,verbs] of [['from','自|从|出|离'],['to','至|抵|赴|往|入|到'],['stay','居|住|宿|寓|坐|卧|留|停']]){
   const hits=terms.filter(word=>new RegExp('(?:'+verbs+')(?:于|於|其|此|一|了)?'+escape(word),'u').test(text));
   if(hits.length===1)roles[role]=hits[0];
  }
  const people=(chapter.people||[]).map(p=>p.word).filter(w=>(tokens[i]||[]).includes(w));
  result.push({unit:unit.unit,unit_end:unit.unit,quote:text,actors:people.join('、'),from_space:roles.from,to_space:roles.to,space:terms.join('、'),transition_kind:roles.from||roles.to?'movement':roles.stay?'scene':'mention',step_id:'source-space-c'+chapter.chapter_id+'-u'+unit.unit,source_supplement:true,source_roles:roles,missing_terms:missing});
 });
 return result;
}
module.exports={supplement};
