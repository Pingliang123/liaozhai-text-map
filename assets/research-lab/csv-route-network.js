(function(root){
 'use strict';
 function combine(graph,chapter,rows,paths){
  const source=chapter.units.map(unit=>unit.text).join('').replace(/\s/gu,'');
  const accepted=rows.filter(row=>Number(row.篇号)===chapter.id+1&&row.原文&&source.includes(row.原文.replace(/\s/gu,'')));
  const nodes=new Map(graph.nodes.map(node=>[node.id,{...node}]));
  const edges=graph.edges.slice(),itinerary=[];
  function endpoint(word,world,kind){
   if(!word||word.includes('、')||!source.includes(word))return null;
   const canonical=chapter.place_aliases?.[word]||word;
   const found=[...nodes.values()].find(node=>node.label===canonical);
   if(found)return found.id;
   const id=(kind==='place'?'place:':'space:')+canonical;
   nodes.set(id,{id,label:canonical,kind,degree:0,realm:['地界','天界'].includes(world)?'otherworld':'human'});
   return id;
  }
  for(const row of accepted){
   const evidence={chapter:chapter.title,chapterId:chapter.id,sequence:Number(row.步骤),actors:row.人物.split(/[、，,]/u).filter(Boolean),text:row.原文,basis:row.双端证据};
   for(const role of ['出发','到达','停留']){
    const world=row[role+'世界分类'],place=endpoint(row[role+'空间所在地点'],world,'place');
    for(const word of row[role+'空间'].split('、').filter(Boolean)){
     const space=endpoint(word,world,chapter.places.includes(word)?'place':'space');
     if(space&&place&&space!==place)edges.push({source:place,target:space,relation:'location',directed:false,weight:1,evidence:[{...evidence,basis:role+'空间所在地。'+evidence.basis}]});
    }
   }
   const from=endpoint(row.出发空间,row.出发世界分类,'space'),to=endpoint(row.到达空间,row.到达世界分类,'space');
   if(paths&&from&&to&&row.步骤类型==='人物移动'){
    itinerary.push({order:Number(row.步骤),source_index:Number(row.步骤)-1,from:nodes.get(from).label,to:nodes.get(to).label,actors:evidence.actors,quote:row.原文,kind:'movement'});
    edges.push({source:from,target:to,directed:true,relation:'movement',weight:1,evidence:[evidence]});
   }
  }
  for(const node of nodes.values())node.degree=0;
  for(const edge of edges){if(nodes.has(edge.source))nodes.get(edge.source).degree++;if(nodes.has(edge.target))nodes.get(edge.target).degree++;}
  return {...graph,nodes:[...nodes.values()],edges,itinerary:paths?itinerary:graph.itinerary,csvRows:accepted};
 }
 const api={combine};if(typeof module!=='undefined')module.exports=api;else root.GhostCsvRouteNetwork=api;
})(globalThis);
