(function(root){'use strict';
// Selector captions contain symbols/counts; only the canonical name is a key.
function placeName(option){
 if(!option?.value)return '';
 return option.dataset?.placeName||option.textContent.trim().replace(/^[○●◎◇◆△▲□■☆★\s]+/,'').split('〔')[0].replace(/\s*[·（(]\s*\d+.*$/,'').trim();
}
function matchesPlace(option,word){if(placeName(option)===word)return true;try{return JSON.parse(option.dataset?.placeAliases||'[]').includes(word);}catch(_){return false;}}
const api={placeName,matchesPlace};if(typeof module!=='undefined'){module.exports=api;return;}
if(root.location.pathname.includes('/research-lab/'))return;
const place=new URLSearchParams(root.location.search).get('place');
let count=0;const timer=setInterval(()=>{
 const select=document.getElementById('place-select');
 if(!select||select.options.length<2){if(++count>60)clearInterval(timer);return;}
 clearInterval(timer);
 if(place){const option=[...select.options].find(o=>matchesPlace(o,place));if(option){select.value=option.value;select.dispatchEvent(new Event('change'));}}
 const host=select.closest('.toolbar');if(!host||document.getElementById('open-place-network'))return;
 const link=document.createElement('a');link.id='open-place-network';link.textContent='查看空间网络';
 const update=()=>{const url=new URL('assets/research-lab/',root.location.href);url.searchParams.set('tab','relations');const word=placeName(select.selectedOptions[0]);if(word)url.searchParams.set('place',word);link.href=url.href;};
 select.addEventListener('change',update);root.addEventListener('ghostmap:place-selected',update);update();host.append(link);
},500);
})(globalThis);
