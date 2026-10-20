'use strict';
const fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model');
const Current=require('../assets/research-lab/current-data');
function build(){const p=JSON.parse(fs.readFileSync('data-package.json','utf8')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json','utf8')));
 const out={generated:new Date().toISOString(),revision_hash:crypto.createHash('sha256').update(fs.readFileSync('manual-revisions.json')).digest('hex'),source_hash:p.base.source_sha256,chapters:Current.snapshot(m)};fs.mkdirSync('assets/research-lab',{recursive:true});fs.writeFileSync('assets/research-lab/data.json',JSON.stringify(out));fs.writeFileSync('assets/research-lab/map-runtime.js','globalThis.GhostMapPlaceReview='+fs.readFileSync('automation/direction_place_review.json','utf8')+';\n'+fs.readFileSync('automation/ghost_map_model.js','utf8')+'\n'+fs.readFileSync('automation/ghost_map_package.js','utf8'));return out;
}if(require.main===module)console.log('Built '+build().chapters.length+' chapters');module.exports={build};
