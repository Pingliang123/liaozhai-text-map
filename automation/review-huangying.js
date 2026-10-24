'use strict';
// This is a one-chapter, source-checked correction, not an automatic corpus rule.
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model');
const chapterId=411;
const north='place-顺天',capital='custom-place-%E9%83%BD',nanking='place-金陵';
function review(model){
 const c=model.view(chapterId),d=model.editable(chapterId);
 if(c.chapter!=='黄英')throw Error('篇号与篇名不符');
 const units=c.source_units,source=units.map(u=>u.text).join('');
 const quote=(start,end=start)=>units.filter(u=>u.unit>=start&&u.unit<=end).map(u=>u.text).join('');
 const rows=[];
 const add=(start,end,actors,kind,from,to,event,interpretation='',access='私人',bindings={})=>{
  const q=quote(start,end);if(!q)throw Error('原文单位不存在：'+start);
  rows.push({unit:start,...(end!==start?{unit_end:end}:{}),actors,transition_kind:kind,
   from_space:from,to_space:to,space:from&&to?from+' → '+to:from||to||'篇内叙述',
   event,quote:q,location:bindings.from_place_id===north||bindings.to_place_id===north?'马宅以顺天区域作推定参考；原文未给出具体宅址':'以所引原文及前后文判定',
   identity:'马子才、吕氏、曾生及客仆为人；黄英、陶生为菊精。',
   interpretation,space_realm:'人间',space_access:access,temporal_order:String(rows.length+1),
   ...(kind==='plot'&&from&&to?{narrative_role:'转换'}:{}),...bindings});
 };
 const homeNote='顺天是马的籍贯；结合返家、南北宅及都中经营作区域推定，地图只用顺天参考点，不表示精确宅址。';
 add(26596,26596,'马子才','mention','','顺天','交代籍贯',homeNote,'公共');
 add(26599,26599,'马子才、金陵客','movement','马宅（顺天区域参考）','金陵','随客赴金陵购菊',homeNote,'公共',{from_place_id:north,to_place_id:nanking});
 add(26600,26601,'马子才','movement','金陵','归途中','购菊后返家，途中遇陶生与黄英','不补出途中相遇地点。','公共',{from_place_id:nanking});
 add(26609,26609,'陶生、黄英','mention','','河朔','陶称黄英希望移居河朔','拟居区域，不是已经抵达的站点；不画金陵至河朔的完成行程。','公共');
 add(26615,26616,'马子才、陶生、黄英','movement','归途中','马宅南圃','受邀共同返家，陶氏姊弟居南侧荒圃小室',homeNote,'私人',{to_place_id:north});
 add(26616,26616,'陶生、黄英','plot','马宅南圃','南圃小室','安排姊弟住处','小室位于荒圃；这不是另一城镇。');
 add(26617,26617,'陶生','movement','马宅南圃','马宅北院','日往北院为马治菊','周期性往来，不等于每日新建一条地理路线。','私人',{from_place_id:north,to_place_id:north});
 add(26620,26621,'黄英','movement','马宅南圃','马宅北院','往吕氏处共做针线','黄英与吕氏交往；不把吕所识别为地名。','私人',{from_place_id:north,to_place_id:north});
 add(26628,26630,'陶生','movement','马宅北院','马宅南圃','离开后开始自立，不再惯常就马寝食','饮食与生活关系开始分立。','私人',{from_place_id:north,to_place_id:north});
 add(26631,26632,'买花者','movement','宅外道路','马宅南圃','买花者车载肩负往来','门庭如市是经营活动；不是一座名为市井的城市。','混合',{from_place_id:north,to_place_id:north});
 add(26635,26637,'马子才、陶生','movement','南第门外','南第菊畦','马叩门，陶迎入，马见庭院已遍种菊花','进入由陶控制的经营庭院；不把前文马的思想活动画成路线。','混合',{from_place_id:north,to_place_id:north});
 add(26637,26637,'陶生','plot','马宅南圃','南第菊畦','荒庭成为密集种菊的生产场所','同一庭院的用途变化，不是人物远行。','混合');
 add(26640,26640,'陶生','movement','南第菊畦','南第屋内','入屋取酒馔，设席畦侧','进入屋内的主体为陶生；马没有被写为同时入屋。','私人',{from_place_id:north,to_place_id:north});
 add(26640,26640,'陶生','movement','南第屋内','南第菊畦','取出酒馔，在菊畦旁设席','同一宅院的室内外往来。','私人',{from_place_id:north,to_place_id:north});
 add(26653,26653,'陶生','movement','马宅南圃','外出途中（目的地未明）','载菊数车外出售花','原句没有交代这次出行的确切目的地。','混合',{from_place_id:north});
 add(26654,26654,'陶生','movement','南中（泛指南方，具体未明）','都中花肆','携南方异卉返回，于都中设肆售花','本句不足以把南中固定为西南某城；都中按篇内北方语境对应北京区域参考。','公共',{to_place_id:capital});
 add(26654,26654,'陶生','movement','都中花肆','马宅南圃','售毕返回种菊',homeNote,'混合',{from_place_id:capital,to_place_id:north});
 add(26656,26658,'陶生','plot','南第菊畦','南第廊舍','增舍、起夏屋，旧花畦改为廊舍','生产用地转作住宅；扩建由陶自主安排。');
 add(26659,26659,'陶生','plot','宅外田地','墙外菊田','墙外购田，筑墙种菊','种植移到墙外新田；不是误读为另一个命名地点。','混合');
 add(26660,26660,'陶生','movement','南第','外出途中（目的地未明）','秋季载花离去，春尽未归','不由后来的送信客反推陶已亲至东粤。','公共',{from_place_id:north});
 add(26665,26666,'黄英','plot','村外田地','村外膏田','接续种菊经营，置办村外田产，甲第扩大','田产与住宅为不同场景，不能把二十顷理解为房屋面积。','混合');
 add(26667,26667,'送信客','movement','东粤','马宅（顺天区域参考）','东粤来客送达陶生书信','东粤修饰客的来处；这条路属于送信客，不属于陶生。'+homeNote,'公共',{from_place_id:'place-广东',to_place_id:north});
 add(26672,26673,'马子才、黄英','mention','','南第','马拒绝入赘式居住安排，决定亲迎','这是未实行的居住提议，不画马搬入南第。');
 add(26674,26674,'黄英','movement','南第','马宅北院','黄英嫁入马家','婚姻迁居方向与日常返回南第管理仆役的方向相反。','私人',{from_place_id:north,to_place_id:north});
 add(26674,26676,'黄英','movement','马宅北院','南第','隔墙开门，日往南第课仆取物','是日常管理及财物流通；不把南北籍当作两个新地名。','私人',{from_place_id:north,to_place_id:north});
 add(26683,26684,'黄英、马子才','plot','南北两第','合居宅第','营建后两宅合为一体，不分疆界','建筑边界消失，但马的贫富观念冲突尚未结束。');
 add(26685,26685,'黄英、马子才','plot','','合居宅第','闭门停止业菊，维持富裕生活','停业不同于离开宅院；不是跨界。');
 add(26696,26697,'黄英','plot','园中','园中茅茨','在园中另筑茅屋供马另居','新茅屋仍在既有园宅之内，与开篇贫居不同。');
 add(26697,26698,'马子才、美婢','movement','合居宅第','园中茅茨','马入住园中茅屋，婢女往侍','家内分居，不是向另一城邑迁移。','私人',{from_place_id:north,to_place_id:north});
 add(26699,26704,'马子才','movement','园中茅茨','合居宅第','反复往访黄英，最终恢复合居','东食西宿是黄英的讥语，不据此补出真实东西方位。','私人',{from_place_id:north,to_place_id:north});
 add(26705,26705,'马子才','movement','合居宅第','金陵客居处','因事再次客居金陵','与开篇购菊为两次不同出行；此次原因只写因事。'+homeNote,'公共',{from_place_id:north,to_place_id:nanking});
 add(26706,26708,'马子才','movement','金陵客居处','金陵花肆','晨过花肆，与陶重逢并留宿','明确位于金陵的花肆；不同于此前都中花肆。','混合',{from_place_id:nanking,to_place_id:nanking});
 add(26714,26715,'马子才、陶生','movement','金陵花肆','北归舟中','售尽花卉，租船北返','原文给出北归方向，没有交代中途港口。','公共',{from_place_id:nanking});
 add(26715,26716,'马子才、陶生','movement','北归舟中','合居宅第','北归入门，黄英已为弟备好居处',homeNote,'私人',{to_place_id:north});
 add(26717,26717,'陶生','plot','亭园','修缮后的亭园','归后大修亭园，与马共棋酒','经营性的外出转为家内生活；不把亭园修缮画成人物移居。');
 add(26721,26722,'曾生','movement','宅外','宅内宴饮处','曾生来访，与陶较饮','私人访客聚饮，不标为公共空间。','私人',{to_place_id:north});
 add(26725,26726,'陶生','movement','宅内宴饮处','门外菊畦','归寝途中出门，倒在菊畦并显露菊形','意图归寝却未到寝处；不能把寝室作为已经到达的终点。','私人',{from_place_id:north,to_place_id:north});
 add(26728,26729,'黄英','movement','宅内','门外菊畦','得知陶醉化菊，急往处置','异类本体在人间家宅显露，并不表示进入仙境。','私人',{from_place_id:north,to_place_id:north});
 add(26730,26730,'黄英、马子才','movement','门外菊畦','菊畦外（具体未明）','覆衣后离开并禁止观看','不能推定具体退回哪间屋；观看限制是恢复过程的一部分。','私人',{from_place_id:north,to_place_id:north});
 add(26731,26732,'马子才','movement','菊畦外（具体未明）','门外菊畦','翌晨再往，见陶卧畦边，悟姊弟为菊精','首次恢复人形已明确；全篇仍发生在人间。','私人',{from_place_id:north,to_place_id:north});
 add(26734,26734,'曾生、两仆','movement','宅外','宅内宴饮处','花朝再次携酒造访','第二次宴饮与前次分开保存。','私人',{to_place_id:north});
 add(26737,26737,'曾生、诸仆','movement','宅内宴饮处','宅外（去向未明）','仆人负曾生离去','不补曾生住址。','私人',{from_place_id:north});
 add(26738,26743,'陶生、马子才、黄英','plot','','第二次化菊处（位置未明）','陶再次化菊，马拔起久观，根株枯死','第二次只写卧地，不能沿用第一次菊畦的精确位置；不是地府情节。');
 add(26744,26744,'黄英（携陶生菊梗）','movement','第二次化菊处（位置未明）','黄英闺中','取枯梗埋盆，携入闺中灌溉','移动对象为菊梗；陶生并非以人形自行入闺。','私人',{from_place_id:north,to_place_id:north});
 add(26747,26747,'黄英','plot','闺中盆内菊梗','盆中醉陶菊','花梗萌发开花，命名醉陶','原文没有写陶重新恢复人形；植物存续不可写成陶生复活。');
 d.narrative_events=rows;
 d.review_note='《黄英》逐段核对：人物行程、居所改建与植物搬移分别记录。马宅坐标仅为顺天区域推定参考；河朔为拟居，东粤为送信客来源，南中不强指西南。两次赴金陵与两次醉化菊分别保留。';
 d.realms_present=['人间'];
 const spatial=['茅庐','屋','院','荒圃','小室','北院','荒庭','菊畦','畦侧','房中','门庭','花肆','都中','夏屋','花畦','廊舍','墙外','田','墉','村外','膏田','甲第','南第','间壁','扉','楼舍','两第','园中','茅茨','肆中','舟','亭园','寝处','座间','门','畦边','盆中','闺中','南中'];
 d.space_words=[...new Set([...d.space_words.filter(w=>!['井','市','庐','肆'].includes(w)),...spatial])];
 for(const w of ['井','市','庐','肆'])d.lexical_reviews['spaces:'+w]={status:'rejected',word:w,kind:'spaces',note:w==='井'||w==='市'?'本篇市井、如市、东篱为价值比喻，不是独立井或市场场景。':'本篇采用茅庐、花肆等完整空间词。'};
 for(const w of spatial){if(!source.includes(w))throw Error('空间词不见原文：'+w);d.lexical_reviews['spaces:'+w]={status:'accepted',word:w,kind:'spaces',note:w==='南中'?'本篇泛指南方来卉，未能据此确定为西南历史区域；保留地域表述，不强定坐标。':'逐段核对的居所、经营、园圃或相对空间。'};}
 d.places=d.places.filter(p=>p.word!=='南中');
 d.lexical_reviews['places:南中']={status:'corrected',word:'南中',kind:'spaces',note:'本篇南方地域泛称，缺少确定西南南中坐标的证据。'};
 for(const w of ['金陵','顺天','河朔','东粤','都']){if(!d.places.some(p=>p.word===w))d.places.push({word:w,mentions:0});d.lexical_reviews['places:'+w]={status:'accepted',word:w,kind:'places',note:w==='河朔'?'仅为拟居区域，不作为已到达的路线端点。':w==='东粤'?'送信客的来源，不据此绘制陶生亲赴东粤。':w==='都'?'于都中设花肆；都指当时首都，沿用北京区域参考。':'原文地理名称；籍贯与实际行程分开标注。'};}
 const person=(word,canonical,aliases,types,role,evidence)=>({word,canonical,aliases,person_types:{[types]:1},review_status:'reviewed',role,evidence,ontology_evidence:evidence});
 d.people=[
  person('马子才','马子才',['马'],'人','主人公，顺天籍','马子才，顺天人。'),
  person('马','马子才',[],'人','单字姓氏回指马子才','马欣动，即刻治装，从客至金陵。'),
  person('黄英','黄英',['陶姊','英'],'妖','菊精，陶生之姊，后嫁马子才','马乃悟姊弟菊精也，益爱敬之。'),
  person('陶生','陶生',['陶','三郎'],'妖','菊精，黄英之弟','马乃悟姊弟菊精也，益爱敬之。'),
  person('陶','陶生',['陶生','三郎'],'妖','菊精，黄英之弟；醉陶为后来的花名','马乃悟姊弟菊精也，益爱敬之。'),
  person('马妻吕','吕氏',['吕'],'人','马子才前妻','马妻吕，亦爱陶姊，不时以升斗餽恤之。'),
  person('曾生','曾生',['曾'],'人','马友，陶的酒友','有友人曾生，量亦无对。'),
  person('金陵客','金陵客',[],'人','开篇介绍菊种并引马赴金陵的客人','一日，有金陵客寓其家，自言其中表亲有一二种，为北方所无。')
 ];
 d.lexical_reviews['people:胡']={status:'rejected',word:'胡',kind:'people',note:'胡可、贵姊胡以、胡醉至此中的疑问词，不是人物。'};
 d.lexical_reviews['people:陈仲子']={status:'rejected',word:'陈仲子',kind:'people',note:'黄英讥马的历史用典人物，不是本篇行动人物；原文用典仍保留。'};
 // Reuse the existing segmentation and alter only boundaries around reviewed
 // terms. Preserve every source character, including uncommon glyphs.
 const raw=source.replace(/\s/gu,''),tokens=d.segmentation_note.split(/[\s/|]+/u).filter(Boolean),cuts=new Set([0,raw.length]);let offset=0;
 if(tokens.join('')!==raw)throw Error('旧分词与原文不一致，须先核对底本');
 for(const token of tokens){offset+=token.length;cuts.add(offset);}
 const terms=[...d.places.map(p=>p.word).sort((a,b)=>b.length-a.length),...[...new Set([...d.space_words,...d.people.flatMap(p=>[p.word,...p.aliases]),'醉陶'])].sort((a,b)=>b.length-a.length)];
 const occupied=[];for(const word of terms){let at=-1;while((at=raw.indexOf(word,at+1))>=0){const end=at+word.length;if(occupied.some(([a,b])=>at<b&&end>a))continue;occupied.push([at,end]);}}
 for(const [a,b]of occupied){for(const cut of cuts)if(cut>a&&cut<b)cuts.delete(cut);cuts.add(a);cuts.add(b);}
 for(const cut of cuts)if(cut>0&&/[\uD800-\uDBFF]/.test(raw[cut-1])&&/[\uDC00-\uDFFF]/.test(raw[cut]||''))cuts.delete(cut);
 const ordered=[...cuts].sort((a,b)=>a-b);d.segmentation_note=ordered.slice(1).map((b,i)=>raw.slice(ordered[i],b)).join(' / ');
 model.save(chapterId,d);
 return {chapter_id:chapterId,title:c.chapter,source_sha256:crypto.createHash('sha256').update(source).digest('hex'),
  before:{steps:c.narrative_events.length,movements:c.narrative_events.filter(r=>r.transition_kind==='movement').length,people:c.people.map(p=>p.word),places:c.places.map(p=>p.word),spaces:c.space_words},
  after:{steps:model.view(chapterId).narrative_events.length,movements:model.view(chapterId).narrative_events.filter(r=>r.transition_kind==='movement').length,people:model.view(chapterId).people.map(p=>({word:p.word,canonical:p.canonical,types:Object.keys(p.person_types)})),places:model.view(chapterId).places.map(p=>p.word),spaces:model.view(chapterId).space_words},
  geographic_note:homeNote,checks:['原文不变，分词只调边界','河朔拟居不画为实到','东粤路径属于送信客','南中不强定西南','全篇人间，菊精不等于仙境','改建不计人物移动','第二次化菊不推定菊畦位置','醉陶开花不写为恢复人形'],steps:model.view(chapterId).narrative_events};
}
function run(){const pack=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(pack.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report=review(m),file='reports/huangying-review-20261024.json';if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));if(old.source_sha256===report.source_sha256)report.before=old.before;}fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({before:report.before.steps,after:report.after.steps,movements:report.after.movements}));}
if(require.main===module)run();module.exports={review,chapterId};
