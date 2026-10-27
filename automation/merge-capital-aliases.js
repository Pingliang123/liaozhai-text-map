'use strict';
const fs=require('node:fs');
const pack=JSON.parse(fs.readFileSync('data-package.json'));
// User-confirmed shared Beijing reference; original terms and annotations stay intact.
for(const name of ['都','京','京师','燕都'])pack.base.place_node_aliases[name]='顺天';
fs.writeFileSync('data-package.json',JSON.stringify(pack));
console.log('Merged four capital reference names into 顺天; original annotations retained');
