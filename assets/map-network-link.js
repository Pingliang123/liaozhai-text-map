(function(){'use strict';
const place=new URLSearchParams(location.search).get('place');
if(location.pathname.includes('/research-lab/'))return;
let count=0;const timer=setInterval(()=>{const select=document.getElementById('place-select');if(!select||select.options.length<2){if(++count>60)clearInterval(timer);return;}clearInterval(timer);if(place){const option=[...select.options].find(o=>o.textContent.trim()===place||o.textContent.trim().startsWith(place+' '));if(option){select.value=option.value;select.dispatchEvent(new Event('change'));}}const host=select.closest('.toolbar');if(host&&!document.getElementById('open-place-network')){const link=document.createElement('a');link.id='open-place-network';link.textContent='查看空间网络';const update=()=>{const word=select.selectedOptions[0]?.textContent.trim()||'';link.href='assets/research-lab/?tab=relations&place='+encodeURIComponent(word);};select.addEventListener('change',update);update();host.append(link);}},500);
})();
