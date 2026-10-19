(function(root){'use strict';
// Discrete visual classes make counts readable; analytical weights stay unchanged.
const bins=[{max:1,label:'1次',width:1.1,opacity:.38},{max:2,label:'2次',width:2.1,opacity:.46},{max:4,label:'3–4次',width:3.5,opacity:.56},{max:9,label:'5–9次',width:5.5,opacity:.68},{max:Infinity,label:'10次以上',width:8.5,opacity:.84}];
function style(weight,overview=false){const b=bins.find(b=>weight<=b.max)||bins[bins.length-1];return {width:b.width,opacity:overview?b.opacity:Math.max(.3,b.opacity)};}
function curve(a,b,ra,rb){
 if(a.id===b.id){const r=ra+4,h=r+65;return {d:`M${a.x+r} ${a.y} C${a.x+h} ${a.y-h} ${a.x-h} ${a.y-h} ${a.x-r} ${a.y}`,x:a.x,y:a.y-h*.75,angle:180};}
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(.001,Math.hypot(dx,dy)),bend=Math.min(22,len*.2),cx=(a.x+b.x)/2-dy/len*bend,cy=(a.y+b.y)/2+dx/len*bend,la=Math.max(.001,Math.hypot(cx-a.x,cy-a.y)),lb=Math.max(.001,Math.hypot(b.x-cx,b.y-cy)),r1=Math.min(ra+3,la*.8),r2=Math.min(rb+4,lb*.8),sx=a.x+(cx-a.x)/la*r1,sy=a.y+(cy-a.y)/la*r1,ex=b.x-(b.x-cx)/lb*r2,ey=b.y-(b.y-cy)/lb*r2;
 return {d:`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`,x:(sx+2*cx+ex)/4,y:(sy+2*cy+ey)/4,angle:Math.atan2(ey-sy,ex-sx)*180/Math.PI};
}
const api={bins,style,curve};if(typeof module!=='undefined')module.exports=api;else root.GhostEdgeStyle=api;
})(typeof window==='undefined'?globalThis:window);
