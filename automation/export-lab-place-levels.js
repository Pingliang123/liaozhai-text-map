const fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model');
const source=JSON.parse(fs.readFileSync('data-package.json')),revision=fs.readFileSync('manual-revisions.json'),model=M.create(source.base);model.importDocument(JSON.parse(revision));
const places=require('../assets/research-lab/place-records').build(model,source.base);
fs.writeFileSync('assets/research-lab/place-levels.json',JSON.stringify({revision_hash:crypto.createHash('sha256').update(revision).digest('hex'),places}));console.log('Exported map levels:',Object.keys(places).length);
