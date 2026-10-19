(function(root){'use strict';
// Discrete visual classes make counts readable; analytical weights stay unchanged.
const bins=[{max:1,label:'1次',width:.65,opacity:.06},{max:2,label:'2次',width:1.6,opacity:.14},{max:4,label:'3–4次',width:3,opacity:.25},{max:9,label:'5–9次',width:5,opacity:.45},{max:Infinity,label:'10次以上',width:8,opacity:.7}];
function style(weight,overview=false){const b=bins.find(b=>weight<=b.max)||bins[bins.length-1];return {width:b.width,opacity:overview?b.opacity:Math.max(.3,b.opacity)};}
const api={bins,style};if(typeof module!=='undefined')module.exports=api;else root.GhostEdgeStyle=api;
})(typeof window==='undefined'?globalThis:window);
