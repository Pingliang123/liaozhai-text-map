const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),fn=html.match(/function movementMode\(\)\{[^\n]+\}/)[0];
let scope='auto';const context={state:{place:null},$:()=>({value:scope})};vm.createContext(context);vm.runInContext(fn,context);
assert.equal(context.movementMode(),'off');context.state.place='济南';assert.equal(context.movementMode(),'place');scope='book';assert.equal(context.movementMode(),'book');scope='chapter';assert.equal(context.movementMode(),'chapter');scope='off';assert.equal(context.movementMode(),'off');console.log('PASS clean overview, selected place and explicit book/chapter scope');
