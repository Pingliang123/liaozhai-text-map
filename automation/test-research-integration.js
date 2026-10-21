const assert=require('node:assert/strict'),fs=require('fs');
const map=fs.readFileSync('index.html','utf8');
const lab=fs.readFileSync('assets/research-lab/index.html','utf8');

assert(map.includes('id="nav-research" class="lab-entry" href="assets/research-lab/?tab=relations"'),'主站空间研究入口应指向统一实验室');
assert(!map.includes('id="nav-lab-top"'),'主导航不应再同时显示重复的实验室入口');
assert(map.includes('id="research-unified-bridge"'),'主站应保留统一研究说明与兼容入口');
assert(map.includes('id="legacy-research-nav"')&&map.includes("let currentResearch = 'research-unified'"),'旧研究页应降为兼容区域');
assert(!map.includes("['nav-research', 'research-hub']"),'主站空间研究入口不能被旧的本页事件拦截');
assert(lab.includes('class="lab-nav"')&&lab.includes('空间研究 · 统一入口'),'实验室应提供返回地图、文本修订和报表的统一导航');
for(const href of ['../../index.html#map-section','../../index.html#workspace','../../index.html#reports-screen'])assert(lab.includes('href="'+href+'"'),'实验室缺少统一主站入口：'+href);
assert(lab.includes('class="notice"'),'实验室应明确同一资料源');
console.log('PASS unified spatial research entry, legacy compatibility and shared navigation');
