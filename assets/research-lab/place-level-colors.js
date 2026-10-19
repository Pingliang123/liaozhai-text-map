(function(root){'use strict';
const palette={province:{label:'省级',color:'#284b83'},prefecture:{label:'府州级',color:'#7b54a2'},county:{label:'县级',color:'#258caa'},town:{label:'乡镇',color:'#b48227'},village:{label:'村落',color:'#997259'},natural:{label:'山川水域',color:'#37875b'},region:{label:'区域／跨界',color:'#c06a33'},unknown:{label:'层级未定',color:'#939b9d'},otherworld:{label:'异境',color:'#b54736'},space:{label:'空间词',color:'#62977f'}};
function style(node,records={}){const level=node.realm==='otherworld'?'otherworld':node.kind==='space'?'space':records[node.label]?.level||'unknown',entry=palette[level]||palette.unknown;return {level:palette[level]?level:'unknown',...entry};}
const api={palette,style};if(typeof module!=='undefined')module.exports=api;else root.GhostPlaceLevelColors=api;
})(typeof window==='undefined'?globalThis:window);
