import pathlib,json,math,html,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];d=json.load(open(ROOT/'reports/latest-high-place-space-pairs.json',encoding='utf8'));rows=d['rows'];nodes={};adj={}
for r in rows:
 for i,id in enumerate(r['ids']):nodes[id]={'id':id,'title':r['titles'][i],'events':r['events'][i]};adj.setdefault(id,set()).add(r['ids'][1-i])
groups=[];seen=set()
for id in nodes:
 if id in seen:continue
 stack=[id];seen.add(id);component=[]
 while stack:
  v=stack.pop();component.append(v)
  for u in adj[v]:
   if u not in seen:seen.add(u);stack.append(u)
 groups.append(sorted(component))
groups.sort(key=lambda g:(-len(g),g));cards=[]
for k,g in enumerate(groups):
 n=len(g);cx=290;cy=210;radius=145 if n>2 else 100
 pos={id:(cx+radius*math.cos(2*math.pi*i/n),cy+radius*math.sin(2*math.pi*i/n))for i,id in enumerate(g)}
 parts=['<svg viewBox="0 0 600 450" role="img" aria-label="高相似篇目群">']
 for index,r in enumerate(rows):
  a,b=r['ids']
  if a not in pos or b not in pos:continue
  x,y=pos[a];u,v=pos[b];color='#397d9a'if r['shared_types']else'#be8e53';width=1.5+8*(r['similarity']-.5)
  parts.append(f'<g class="edge" data-edge="{index}" tabindex="0"><line x1="{x}" y1="{y}" x2="{u}" y2="{v}" stroke="{color}" stroke-width="{width}"/><line x1="{x}" y1="{y}" x2="{u}" y2="{v}" stroke="transparent" stroke-width="18"/><title>{html.escape("／".join(r["titles"]))}：{r["similarity"]:.3f}</title></g>')
 for id in g:
  x,y=pos[id];c=nodes[id];parts.append(f'<g class="node" data-node="{id}" tabindex="0"><circle cx="{x}" cy="{y}" r="9" fill="#fff" stroke="#38515b" stroke-width="2"/><text x="{x}" y="{y-18}" text-anchor="middle">{html.escape(c["title"])}</text><text x="{x}" y="{y+28}" text-anchor="middle" class="tags">{html.escape("、".join(c["events"]))}</text></g>')
 parts.append('</svg>');cards.append(f'<section><h2>篇目群{k+1} · {n}篇</h2>'+''.join(parts)+'</section>')
latest=json.load(open(ROOT/'.network-runtime/latest-live-package.json',encoding='utf8'));old=json.load(open(ROOT/'data-package.json',encoding='utf8'));unchanged=latest['revisions']==old['revisions'] and latest['base']==old['base']
out={'source_sha256':d['source_sha256'],'exported_at':latest.get('exported_at'),'same_canonical_content_as_local':unchanged,'nodes':list(nodes.values()),'groups':groups,'edges':rows};(ROOT/'reports/latest-similarity-groups.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
payload=json.dumps(out,ensure_ascii=False).replace('<','\\u003c')
page='''<!doctype html><meta charset="utf-8"><title>高相似篇目群</title><style>body{font:16px/1.6 system-ui;background:#faf9f5;color:#25333d;margin:24px}#groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}section{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px}h2{font-size:18px;margin:0}svg{width:100%}text{font-size:15px;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}.tags{font-size:12px;fill:#687078}.edge,.node{cursor:pointer}.edge:focus line:first-child,.edge:hover line:first-child{stroke:#cf4b31;stroke-width:6}#detail{background:white;border:1px solid #ddd;padding:18px;position:sticky;bottom:0;max-height:260px;overflow:auto}button{padding:7px;margin:4px}small{color:#657078}</style><h1>地点＋空间词：高相似篇目群</h1><p>重新下载当前公开网站资料；原始词频余弦相似度。保持原门槛：相似度≥0.5、两篇各≥5种词及10词次、共有≥2词。</p><p>蓝线：共享至少一类；褐线：没有共享类型。线越粗，相似度越高；节点位置与线长仅为排版，无地理或叙事距离含义。点击篇名看其关联，点击线看共有词与各篇次数。</p><p>SUMMARY</p><div id="groups">CARDS</div><div id="detail">点击篇名或连线查看详情。类型是现有发布标签，未重新人工核定；词频相似不等于情节相同。</div><script>const D=PAYLOAD;const detail=document.getElementById('detail');function edge(i){const r=D.edges[i];detail.replaceChildren();const title=document.createElement('h3');title.textContent=r.titles.join('／')+'：'+r.similarity.toFixed(3);detail.append(title);const p=document.createElement('p');p.textContent='类型：'+r.events.map(e=>e.join('、')).join('／')+'。共有词（两篇次数）：'+r.shared_words.map(w=>w.word+'（'+w.counts.join('/')+'）').join('、');detail.append(p);const note=document.createElement('p');note.textContent='点积贡献最高词：'+r.largest_dot_product_word+'（'+(100*r.largest_dot_product_share).toFixed(1)+'%）；高分可能由一个重复词主导。';detail.append(note)}function node(id){detail.replaceChildren();const c=D.nodes.find(c=>c.id===id),h=document.createElement('h3');h.textContent=c.title+'｜'+c.events.join('、');detail.append(h);D.edges.forEach((r,i)=>{if(!r.ids.includes(id))return;const b=document.createElement('button');b.textContent=r.titles.join('／')+' '+r.similarity.toFixed(3);b.onclick=()=>edge(i);detail.append(b)})}for(const el of document.querySelectorAll('[data-edge]')){el.onclick=()=>edge(Number(el.dataset.edge));el.onkeydown=e=>{if(e.key==='Enter')el.onclick()}}for(const el of document.querySelectorAll('[data-node]')){el.onclick=()=>node(Number(el.dataset.node));el.onkeydown=e=>{if(e.key==='Enter')el.onclick()}}</script>'''.replace('SUMMARY',f'{len(nodes)}篇，{len(rows)}条关系，分为{len(groups)}个连通群；不展示未达到门槛的关系。').replace('CARDS',''.join(cards)).replace('PAYLOAD',payload)
(ROOT/'reports/最新高相似篇目群_互動圖.html').write_text(page,encoding='utf8');print(len(nodes),len(rows),len(groups),unchanged)
