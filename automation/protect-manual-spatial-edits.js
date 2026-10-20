'use strict';
const fs=require('fs'),T=require('../assets/research-lab/place-taxonomy');
// Explicitly approved relative scene vocabulary; capital terms retain the user's
// earlier decision that 都 names the contemporary capital.
const review=JSON.parse(fs.readFileSync('automation/direction_place_review.json'));
for(const word of T.groups.relative.words)if(!['都','都中','都城'].includes(word))review.spaces[word]=word;
fs.writeFileSync('automation/direction_place_review.json',JSON.stringify(review,null,2)+'\n');
const source=fs.readFileSync('automation/ghost_map_model.js','utf8');
fs.writeFileSync('auth-backend/model.cjs',source);
let html=fs.readFileSync('index.html','utf8');
const marker='(function (root) {',start=html.indexOf(marker),end=html.indexOf('})(globalThis);',start);
if(start<0||end<0)throw Error('找不到内嵌模型');
const final=html.indexOf(';',end)+1;
html=html.slice(0,start)+source.trim()+html.slice(final);
// Refresh the embedded policy alongside the model.
const policyStart=html.indexOf('globalThis.GhostMapPlaceReview=');
if(policyStart>=0){const policyEnd=html.indexOf(';',policyStart);html=html.slice(0,policyStart)+'globalThis.GhostMapPlaceReview='+JSON.stringify(review)+html.slice(policyEnd);}
fs.writeFileSync('index.html',html);
fs.writeFileSync('auth-backend/direction_place_review.json',JSON.stringify(review,null,2)+'\n');
console.log('Updated model copies and relative-space policy');
