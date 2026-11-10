'use strict';
const $=s=>document.querySelector(s), app=$('#app');
const KEY='daiwan-campus-v5', ACH_KEY='daiwan-achievements-v4', SEEN_KEY='daiwan-seen-v4', MINI_KEY='daiwan-mini-seen-v4', COLLECTION_KEY='daiwan-university-collection-v1', TERM_KEY='daiwan-term-history-v1', MINI_ROTATION_KEY='daiwan-mini-rotation-v1';
const ATTR=['數理','語文','社會','藝術','音樂'];
const TERMS=['高一上','高一下','高二上','高二下','高三上','高三下'];
const GSAT=['國文','英文','數學A','數學B','自然','社會'];
const SPLIT=['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會'];
const MODE={term:'學期挑戰',gsat:'學科能力測驗',split:'分科測驗'};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toFixed(1).replace(/\.0$/,'');
let state=null,welcome=true,busy=false,catalog=null,programs=[],archivedPrograms=[],miniBank=[],songs=[],events=[];
let storageOK=true,legacy=false,photoBusy=false,collectionOpen=location.hash==='#collection';
let collection={programs:{}};
let pendingSeed=randomSeed();
let achievements={},seen=[],miniSeen=[],termHistory=[],miniHistory=[],openSelect=null;
let filter={search:'',area:'全部',type:'全部',group:'全部',university:'全部',sort:'chance-desc'};
const ACHIEVEMENTS=[
 ['first','開學到畢業','第一次取得大學錄取','🎓'],['star','星光不負','經繁星推薦錄取','🌟'],['apply','作品會說話','經個人申請錄取','📒'],['split','夏日逆轉','經分科分發錄取','☀️'],
 ['medicine','白袍新章','進入醫學或牙醫類組','🩺'],['artist','創作的方向','進入藝術、音樂或舞蹈類組','🎨'],['national','公立新座位','進入公立大學','🏫'],['private','自己的選擇','進入私立大學','🌷'],
 ['retake','再出發也很勇敢','選擇重考結局','🌱'],['quizmaster','課堂全勤王','六學期問答全對','✏️'],['playmaster','下課才是主場','六個小遊戲皆達80分','🎮'],['explorer','平行青春','完成三種不同種子的旅程','🪐'],
 ['elite','翻過高牆','錄取台清交成政或其他高門檻科系','🏔️'],['ntu','椰林新章','錄取呆丸大學','🌴'],['nccu','指南山上的風','錄取正治大學','🧭'],['language','世界的另一種說法','錄取外國語文學院','🌍'],['business','商院新同學','錄取商學院','📈'],['media','故事的製造者','錄取傳播學院','🎥'],
 ['science','數理主場','數理達80','🧪'],['words','文字的重量','語文達80','📚'],['society','看懂世界','社會達80','🗺️'],['visual','讓色彩發聲','藝術達80','🖌️'],['melody','耳機裡的宇宙','音樂達80','🎼'],['maxed','登峰的一刻','任一能力達100','💯'],['balanced','五邊形同學','五項能力皆達60','⬟'],
 ['gsatfull','滿級分的一天','學測至少四科且全15級分','🏅'],['splitfull','夏日滿貫','分科至少三科且全60級分','🏆'],['rare','稀有的入學信','從五星高中完成旅程','💌'],['comeback','被扣分也能逆轉','問答或小遊戲扣點後仍錄取','🔁'],['conan','真相只有一個','柯南小遊戲滿分','🕵️'],['flags','世界色票','國旗配對滿分','🚩'],['colorist','色差偵探','找不同三題全對','👁️'],['publichs','公立青春','從公立高中完成旅程','🎒'],['privatehs','私校日記','從私立高中完成旅程','📔'],
 ['nthu','清花小徑','錄取清花大學','🌸'],['nycu','交會的下一站','錄取楊明蕉通大學','🚦'],['ncku','南方的城門','錄取城公大學','🏛️'],['ncu','中央新軌道','錄取盅央大學','🪐'],['nchu','興大的日常','錄取盅興大學','🌿'],['nsysu','西子灣的風','錄取盅山大學','🌊'],['ccu','鳳凰木下','錄取盅正大學','🌳'],['ntnu','師大的鐘聲','錄取獅範大學','🔔'],['tmu','城市裡的白袍','錄取苔北醫學大學','🏥'],['tnua','山上的藝術家','錄取苔北藝術大學','🎭'],
 ['all70','六十分後的進階','五項能力都達70','⭐'],['three80','三個拿手領域','至少三項能力達80','🔺'],['firstchoice','心中的第一站','第一志願錄取','🥇'],['top10','前排的名字','在校排名前10%','📋'],['english15','英文好球帶','學測英文15級分','🔤'],['math15','數學的節奏','學測數學A或B達15級分','🔢'],['term90','九十分的午后','任一學期綜合成績達90','🌤️'],['lastperfect','最後一張滿分紙','高三下問答兩題全對','📝'],['consistent','每次都抓住一題','六學期問答每次至少答對一題','📌'],['fivealloc','把可能性都點亮','曾用骰子分配全部五項能力','🎲'],['fivegames','放學後的萬事通','五種不同小遊戲過關','🧩'],['lyricwin','聽見聲音的主人','歌詞猜歌手小遊戲滿分','🎤'],['mahjongwin','牌桌上的冷靜','麻將牌型小遊戲滿分','🀄'],['memorywin','記得每個位置','翻牌記憶小遊戲滿分','🧠'],['dance','讓腳步說故事','錄取舞蹈類組','🩰'],['pharmacy','藥草與試管','錄取藥學或中藥相關學系','🌱']
];
const ACHIEVEMENT_CATEGORIES=[
 ['all','全部'],['unlocked','已解鎖'],['classic','經典'],['university','大學'],
 ['school','高中'],['ability','能力'],['exam','考試'],['game','小遊戲'],['milestone','旅程'],
];
let achievementCategory='all';
const challengeRules=new Map();

function registerAchievement(category,id,name,note,icon,condition){
 ACHIEVEMENTS.push([id,name,note,icon,category]);
 if(condition)challengeRules.set(id,condition);
}

function registerAchievementExpansion(){
 const existing=new Map(ACHIEVEMENTS.map(item=>[item[0],item]));
 for(const university of catalog.universities){
  if(!existing.has(university.id)){
   registerAchievement('university','campus-'+university.id,'入學信・'+university.name,
    '接受 '+university.name+' 的錄取','🏫');
  }else existing.get(university.id)[4]='university';
 }
 for(const school of catalog.highSchools||[]){
  registerAchievement('school','graduate-'+school.id,'畢業章・'+school.name,
   '從 '+school.name+' 完成一段旅程','🎒');
  registerAchievement('school','admit-from-'+school.id,'升學章・'+school.name,
   '就讀 '+school.name+' 並接受大學錄取','🎓',()=>state.school.id===school.id&&state.ending==='admitted');
 }
 const abilities=['🔢','📚','🗺️','🎨','🎼'];
 const stages=[[65,'紮根'],[75,'熟手'],[85,'亮眼'],[90,'專精'],[95,'出色'],[100,'滿點']];
 ATTR.forEach((name,i)=>{
  for(const [target,title] of stages){
   registerAchievement('ability',`ability-${i}-${target}`,name+'・'+title,
    `結局時${name}達 ${target} 點`,abilities[i],()=>state.attrs[i]>=target);
  }
  for(const [target,title] of [[15,'小步前進'],[30,'大幅成長']]){
   registerAchievement('ability',`growth-${i}-${target}`,name+'・'+title,
    `比入學時增加至少 ${target} 點`,abilities[i],()=>state.attrs[i]-state.initialAttrs[i]>=target);
  }
 });
 for(const [exam,title,subjects,targets] of [
  ['gsat','學測',GSAT,[11,14]],['division','分科',SPLIT,[48,60]],
 ]){
  subjects.forEach((subject,i)=>{
   for(const target of targets){
    registerAchievement('exam',`${exam}-${i}-${target}`,`${title}${subject}・${target}級分`,
     `${title}${subject}達 ${target} 級分`,'📝',()=>state[exam]?.[subject]>=target);
   }
  });
 }
 for(const game of miniBank){
  if(Object.hasOwn(PUZZLE_NAMES,game.type))continue;
  registerAchievement('game','game-'+game.id,'達人・'+game.name,
   game.name+'取得至少 80 分','🎮',()=>state.history.some(h=>h.gameId===game.id&&h.gameScore>=80&&!h.gameFailed));
 }
 const milestones=[
  ['quiz3','三張滿分考卷','至少三學期問答全對','✏️',()=>state.history.filter(h=>h.correct===2).length>=3],
  ['quiz5','五張滿分考卷','至少五學期問答全對','📑',()=>state.history.filter(h=>h.correct===2).length>=5],
  ['quiz10','答題手感','六學期累計至少答對十題','🧠',()=>state.history.reduce((sum,h)=>sum+(h.correct||0),0)>=10],
  ['clear6','放學大滿貫','六學期的小遊戲都過關','🧩',()=>state.history.filter(h=>!h.gameFailed&&h.gameScore>=60).length===6],
  ['perfect3','三場零失誤','至少三個小遊戲取得滿分','🎯',()=>state.history.filter(h=>h.gameScore===100).length>=3],
  ['perfect5','五場零失誤','至少五個小遊戲取得滿分','🏅',()=>state.history.filter(h=>h.gameScore===100).length>=5],
  ['rank25','前四分之一','在校排名達前25%','📋',()=>state.rank!=null&&state.rank<=25],
  ['rank5','前五的座位','在校排名達前5%','👑',()=>state.rank!=null&&state.rank<=5],
  ['term-rise','漸入佳境','末學期綜合成績比首學期高至少10分','📈',()=>state.history.length===6&&state.history.at(-1).total-state.history[0].total>=10],
  ['avg85','平時下足功夫','六學期的綜合成績平均至少85分','📚',()=>state.history.length===6&&state.history.reduce((sum,h)=>sum+h.total,0)>=510],
  ['portfolio80','作品集有料','學習歷程達80點','📁',()=>state.portfolio>=80],
  ['portfolio100','作品集裝滿了','學習歷程達100點','🗂️',()=>state.portfolio>=100],
  ...[[3,'初探校園'],[10,'十所大學的足跡'],[25,'走過四方校園']].map(([count,title])=>
   ['college-'+count,title,`校系圖鑑解鎖至少 ${count} 所大學`,'📚',
    ()=>new Set(Object.values(collection.programs).map(record=>record.university)).size>=count]),
 ];
 for(const [id,name,note,icon,condition] of milestones){
  registerAchievement('milestone','milestone-'+id,name,note,icon,condition);
 }
}

function additionalAchievementIds(program){
 const available=new Set(ACHIEVEMENTS.map(([id])=>id));
 const campus=program?(available.has(program.university)?program.university:'campus-'+program.university):null;
 const school='graduate-'+state.school.id;
 return {
  journey:[campus,school].filter(id=>available.has(id)),
  challenges:[...challengeRules].filter(([id,qualifies])=>!achievements[id]&&qualifies()).map(([id])=>id),
 };
}
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function saveStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function save(){storageOK=saveStore(KEY,state);$('#save-status').textContent=storageOK?'● 已存檔':'⚠ 本機儲存空間不足';}
function go(stage){state.stage=stage;save();render();window.scrollTo({top:0,behavior:'instant'});}
function rng(){let x=state.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.seed=x>>>0;return state.seed/4294967296;}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hashSeed(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function randomSeed(){
 return crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
}
function freshSample(list,count,key,distinct=key){
 const used=new Set([...(state.miniUsed||[]),...state.used]);
 const available=list.filter(item=>!used.has(key(item)));
 const previous=new Set(miniSeen);
 const candidates=[...shuffle(available.filter(item=>!previous.has(key(item)))),
  ...shuffle(available.filter(item=>previous.has(key(item))))];
 const chosen=[],values=new Set(),keysUsed=new Set();
 for(const item of candidates){
  const value=distinct(item);
  const itemKey=key(item);
  if(values.has(value)||keysUsed.has(itemKey))continue;
  values.add(value);
  keysUsed.add(itemKey);
  chosen.push(item);
  if(chosen.length===count)break;
 }
 if(chosen.length<count)throw new Error('這個小遊戲的未使用題目不足。');
 const keys=chosen.map(key);
 state.miniUsed=[...new Set([...(state.miniUsed||[]),...keys])];
 miniSeen=[...miniSeen.filter(key=>!keys.includes(key)),...keys].slice(-120);
 saveStore(MINI_KEY,miniSeen);
 return chosen;
}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function button(label,action,style='primary',extra=''){
 const arrow=mark=>`<span class="action-arrow" aria-hidden="true">${mark}</span>`;
 if(label.startsWith('← '))label=arrow('←')+' '+label.slice(2);
 else if(/ [→↑↓]$/.test(label))label=label.slice(0,-1)+arrow(label.at(-1));
 return `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`;
}
function heading(k,h,p=''){return `<div class="heading"><span class="eyebrow">${k}</span><h1>${h}</h1>${p?`<p>${p}</p>`:''}</div>`;}
function confirmAction(title,text,fn){$('#confirm-title').textContent=title;$('#confirm-text').textContent=text;$('#confirm-ok').onclick=()=>{$('#confirm-dialog').close();fn();};$('#confirm-dialog').showModal();}
async function api(path,data){if(document.documentElement.dataset.runtime==='browser')return DaiwanRuntime.request(path,data);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data),signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'連線失敗');return d;}finally{clearTimeout(timer);}}
function termName(){return TERMS[state.round];}
function attrBars(){return state.attrs.map((v,i)=>`<div class="attribute"><span>${ATTR[i]}</span><div class="meter"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('');}
function routeName(route){return{star:'繁星推薦',apply:'個人申請',distribution:'分科分發'}[route];}
function university(id){
 return catalog.universities.find(u=>u.id===id)??catalog.archive?.universities.find(u=>u.id===id);
}
function historicalProgram(id){
 return programs.find(p=>p.id===id)??archivedPrograms.find(p=>p.id===id);
}
function hydrateProgram(p){
 const u=university(p.university);
 return {...p,universityName:u.name,realName:u.realName,abbr:u.abbr,type:u.type,area:u.area,source:p.source||u.source};
}
function crest(u,cls='crest'){return `<img class="${cls}" src="${u.crest}" alt="${esc(u.name)}原創校徽" width="80" height="80">`;}
function traitScore(){return Math.round(state.attrs.reduce((n,v,i)=>n+v*.65+state.aptitude[i]*.35,0)/5);}
function customSelect(key,value,items,label=''){const options=items.map(x=>typeof x==='string'?{value:x,label:x}:x);const selected=options.find(x=>String(x.value)===String(value));return `<div class="custom-select ${openSelect===key?'is-open':''}" data-select-wrap="${key}"><button type="button" class="select-trigger" role="combobox" aria-label="${esc(label||key)}" aria-expanded="${openSelect===key}" aria-controls="list-${key}" data-action="toggle-select" data-key="${key}"><span>${esc(selected?.label||label||'請選擇')}</span><i>⌄</i></button>${openSelect===key?`<div class="select-menu" id="list-${key}" role="listbox" aria-label="${esc(label)}">${options.map(o=>`<button type="button" role="option" aria-selected="${String(o.value)===String(value)}" data-action="select-option" data-key="${key}" data-value="${esc(o.value)}"><span>${esc(o.label)}</span>${String(o.value)===String(value)?'✓':''}</button>`).join('')}</div>`:''}</div>`;}
function chooseSelect(key,value){openSelect=null;if(key.startsWith('match-')){const row=Number(key.slice(6)),a=state.paper.answers[state.paper.index],v=value===''?null:Number(value);if(v!==null){const old=a.indexOf(v);if(old!==-1&&old!==row)a[old]=null;}a[row]=v;save();}else filter[key]=value;render();app.querySelector(`[data-select-wrap="${key}"] .select-trigger`)?.focus({preventScroll:true});}
function sortSelect(){return customSelect('sort',filter.sort,[{value:'chance-desc',label:'錄取率：高 → 低'},{value:'chance-asc',label:'錄取率：低 → 高'},{value:'original',label:'原始順序'}],'錄取率排序');}
function sortedOptions(list,rate){const rated=list.map((value,index)=>({value,index,rate:rate(value)}));if(filter.sort!=='original')rated.sort((a,b)=>(filter.sort==='chance-asc'?a.rate-b.rate:b.rate-a.rate)||a.index-b.index);return rated.map(x=>x.value);}
function filters(){const groups=[...new Set(programs.map(p=>String(p.group)))].sort();return `<div class="filters"><label class="search-field"><span>⌕</span><input id="catalog-search" placeholder="搜尋大學、科系…" value="${esc(filter.search)}" aria-label="搜尋大學科系"></label>${customSelect('type',filter.type,['全部','公立','私立'],'學校性質')}${customSelect('area',filter.area,['全部','北部','中部','南部','東部','離島'],'地區')}${customSelect('group',filter.group,[{value:'全部',label:'全部類組'},...groups.map(g=>({value:g,label:catalog.groups[g]}))],'科系類組')}${customSelect('university',filter.university,[{value:'全部',label:'全部大學'},...catalog.universities.map(u=>({value:u.id,label:u.name}))],'選擇大學')}${sortSelect()}</div>`;}
function searchKey(value){
 return value.normalize('NFKC').trim().toLowerCase().replaceAll('台','臺');
}
function filtered(list){const query=searchKey(filter.search);return sortedOptions(list.filter(p=>(filter.university==='全部'||p.university===filter.university)&&(filter.type==='全部'||p.type===filter.type)&&(filter.area==='全部'||p.area===filter.area)&&(filter.group==='全部'||String(p.group)===filter.group)&&searchKey(p.name+p.universityName+p.realName+p.abbr).includes(query)),admissionEstimate);}
function resetRound(){state.dice=[];state.dieIndex=0;state.assignments=[];state.game=null;state.event=null;}
const MINI_FAMILY={
 lyrics:'music',singer:'music','lyric-artist':'music',kpop:'music',
 anime:'anime','conan-unit':'anime','conan-order':'anime',
 drama:'screen',series:'screen',emoji:'screen',potter:'screen',
 brand:'swatches',flags:'swatches',colors:'swatches',
};
const miniFamily=id=>MINI_FAMILY[id]||id;
const miniType=id=>{
 const type=miniBank.find(g=>g.id===id)?.type;
 return ['swatch','lyrics','singer','lyric-singer'].includes(type)?'match':type;
};
function drawMiniGame(){
 const played=state.history.map(h=>RETIRED_GAMES[h.gameId]||h.gameId).filter(Boolean);
 const pool=miniBank.filter(g=>!played.includes(g.id)&&(g.id!=='mahjong'||state.originSeed%6===3)
  &&(g.id!=='art'||state.originSeed%2===0));
 const unusedTypes=pool.filter(g=>!played.some(id=>miniType(id)===miniType(g.id)));
 const candidates=unusedTypes.length?unusedTypes:pool;
 const recent=miniHistory.slice(-12);
 const weights=candidates.map(g=>{
  const sameType=candidates.filter(other=>miniType(other.id)===miniType(g.id)).length;
  const appearances=recent.filter(id=>id===g.id||miniFamily(id)===miniFamily(g.id)).length;
  return 1/(sameType*(1+appearances));
 });
 let draw=rng()*weights.reduce((sum,weight)=>sum+weight,0);
 return candidates.find((_,i)=>(draw-=weights[i])<0)??candidates.at(-1);
}
async function startRun(name,seedText,gender,schoolType){const previous=state;const text=seedText.trim()||randomSeed();const originSeed=hashSeed(text);try{const d=await api('enroll',{seed:originSeed,gender,schoolType});state={version:5,name,gender,schoolType,stage:'enrolled',seedText:text,originSeed,seed:originSeed||1234567,school:d.school,attrs:d.attrs,initialAttrs:[...d.attrs],aptitude:d.aptitude,portfolio:0,round:0,history:[],used:[],miniUsed:[],rank:null};state.eventOrder=shuffle(events.map(e=>e.id));const base=66;state.peers=Array.from({length:99},()=>clamp(base+(rng()+rng()+rng()-1.5)*28,25,96));resetRound();pendingSeed=randomSeed();welcome=false;go('enrolled');}catch(e){state=previous;throw e;}}
async function startPaper(mode,subjects=[]){
 const used=[...state.used,...(state.miniUsed||[]).filter(key=>key.startsWith('song:'))];
 const data=await api('paper',{mode,subjects:subjects.join(','),attrs:state.attrs.join(','),
  round:state.round,seed:state.originSeed,previousRoute:state.lastAdmissionRoute||'',
  used:used.join(','),seen:seen.join(','),termHistory:termHistory.join(',')});
 state.paper={mode,subjects,questions:data.questions,index:0,
  timed:mode!=='term',elapsed:[],reviews:[],answers:data.questions.map(q=>q.type==='match'?Array(q.left.length).fill(null):q.type==='fill'?'':null)};
 const ids=data.questions.map(q=>q.id);
 for(const song of songs){
  if(song.questionIds?.some(id=>ids.includes(id)))ids.push('song:'+song.title);
 }
 state.used=[...new Set([...state.used,...ids])];
 const drawn=data.questions.map(q=>q.id);
 seen=[...seen.filter(id=>!drawn.includes(id)),...drawn].slice(-180);
 if(mode==='term'){
  termHistory=[...termHistory,...drawn].slice(-72);
  saveStore(TERM_KEY,termHistory);
 }
 saveStore(SEEN_KEY,seen);
 go('quiz');
}
function answerReady(q,a){return q.type==='match'?Array.isArray(a)&&a.every(v=>v!==null):q.type==='fill'?typeof a==='string'&&a.trim().length>0:a!==null;}
function timedChoice(p,q){
 return p.timed&&q.type==='choice';
}
function choiceLimit(q){return q.examSubject.startsWith('數學')?60000:30000;}
function paperReady(p,index){
 return timedChoice(p,p.questions[index])?p.elapsed?.[index]!=null:answerReady(p.questions[index],p.answers[index]);
}
async function revealAnswer(p){
 const i=p.index,q=p.questions[i],answer=p.answers[i];
 const form={mode:p.mode,subjects:p.subjects.join(','),round:state.round,id:q.id,label:q.examSubject,
  answer:Array.isArray(answer)?answer.join(','):answer??''};
 if(p.timed)form.timed='1';
 if(timedChoice(p,q))form.ms=p.elapsed[i];
 const result=await api('answer',form);
 (p.reviews||=[])[i]=result;
 save();render();
 $('.answer-result')?.scrollIntoView({block:'nearest'});
}
async function updatePaperClock(){
 const clock=$('#question-clock');
 if(!clock||!state?.paper||busy)return;
 const p=state.paper,q=p.questions[p.index],remaining=Math.max(0,p.clockStart+choiceLimit(q)-Date.now());
 clock.textContent=remaining?'剩 '+Math.ceil(remaining/1000)+' 秒':'時間到，本題 0 分';
 if(!remaining&&p.elapsed?.[p.index]==null){
  p.elapsed[p.index]=choiceLimit(q);
  p.answers[p.index]=null;
  save();
  busy=true;
  try{await revealAnswer(p);}catch(error){toast(error.message);render();}finally{busy=false;}
 }
}
setInterval(updatePaperClock,200);
function calculateSchoolScore(){
 const average=state.history.reduce((sum,h)=>sum+h.total,0)/state.history.length;
 const aptitude=state.aptitude.reduce((sum,v)=>sum+v,0)/state.aptitude.length;
 return Math.round((average*.85+aptitude*.15)*10)/10;
}
async function submitPaper(){
 const p=state.paper;
 if(!p.answers.every((_,i)=>paperReady(p,i)))return;
 const data={mode:p.mode,subjects:p.subjects.join(','),round:state.round,ids:p.questions.map(q=>q.id).join(',')};
 if(p.timed)data.timed='1';
 if(p.mode==='gsat'){
  data.aptitude=state.aptitude.join(',');
  data.attrs=state.attrs.join(',');
 }
 p.questions.forEach((q,i)=>{
  if(timedChoice(p,q))data['ms'+i]=p.elapsed[i];
  data['label'+i]=q.examSubject;
  data['a'+i]=Array.isArray(p.answers[i])?p.answers[i].join(','):p.answers[i];
 });
 const result=await api('grade',data);
 result.penalties=applyQuizPenalty(p,result);
 if(p.mode==='term'){
  const avg=state.attrs.slice(0,3).reduce((n,b)=>n+b,0)/3;
  const daily=Math.round(clamp(46+avg*.45+state.portfolio*.1)),quiz=Math.round(clamp(32+avg*.6));
  const total=Math.round(daily*.2+quiz*.2+result.exam*.6);
  state.lastRound={...result,daily,quiz,total,term:termName(),game:'',gameScore:0,event:''};
  state.history.push({...state.lastRound});
  if(state.round>=4){
   state.schoolScore=calculateSchoolScore();
   state.rank=1+state.peers.filter(v=>v>state.schoolScore).length;
  }
  showEvent(events.find(e=>e.id===state.eventOrder[state.round]));
 }else if(p.mode==='gsat'){
  state.gsat=result.scores;state.gsatRecord={paper:structuredClone(p),result};go('gsatResult');
 }else{
  state.division=result.scores;state.splitRecord={paper:structuredClone(p),result};go('splitResult');
 }
}
function showEvent(event){
 const delta=event.delta.map((change,i)=>{
  const before=state.attrs[i];
  state.attrs[i]=clamp(before+change);
  return state.attrs[i]-before;
 });
 state.event={...event,delta,done:true};
 const term=state.history.at(-1);
 term.event=event.title;
 term.eventStory=event.story;
 go('event');
}
function extraDie(){return state.school.id==='hs5'?1:0;}
function roll(){
 if(!state.event?.done)return;
 if(!state.dice.length){
  state.dice=Array.from({length:1+Math.floor(rng()*6)+extraDie()},()=>1+Math.floor(rng()*6));
  state.dieIndex=0;state.assignments=[];
 }
 go('dice');
}
function assign(i){if(!Number.isInteger(i)||i<0||i>4||state.attrs[i]>=100||state.dieIndex>=state.dice.length)return;const n=Math.min(state.dice[state.dieIndex],100-state.attrs[i]);state.attrs[i]+=n;state.assignments.push({attr:i,added:n});state.allocatedAttrs=[...new Set([...(state.allocatedAttrs||[]),i])];state.dieIndex++;save();render();}
function defaultPortrait(){return state.gender==='female'?'/assets/avatar-female.svg':'/assets/avatar-male.svg';}
function questionAttr(q){
 if(q.subject==='校園趣聞'){
  return ({'臺灣夜市':2,'臺灣旅行':2,'臺灣鐵道':0,'臺灣風物':2,'世界地標':2,'城市漫遊':1,
   '企業故事':2,'國家象徵':1,'美術館':3,'銀幕世界':3,'食物旅行':1,'生活發明':0})[q.theme]??2;
 }if(q.subject==='音樂')return 4;if(q.subject==='藝術')return 3;if(['國文','英文'].includes(q.subject))return 1;if(['數學','自然','物理','化學','生物','體育'].includes(q.subject))return 0;return 2;}
function applyQuizPenalty(p,result){const penalties=[0,0,0,0,0];if(p.mode!=='term')return penalties;p.questions.forEach((q,i)=>{if(result.review[i].fraction<1){const j=questionAttr(q),loss=Math.min(state.attrs[j],Math.ceil((1-result.review[i].fraction)*3));state.attrs[j]-=loss;penalties[j]+=loss;}});result.rewards=[0,0,0,0,0];if(p.mode==='term')p.questions.forEach((q,i)=>{if(result.review[i].fraction===1){const j=questionAttr(q),gain=Math.min(2,100-state.attrs[j]);state.attrs[j]+=gain;result.rewards[j]+=gain;}});return penalties;}
function rewardNotice(rewards){return rewards?.some(n=>n)?`<div class="reward-notice" role="status">答對獎勵：${rewards.map((n,i)=>n?ATTR[i]+' ＋'+n:'').filter(Boolean).join(' · ')}</div>`:'';}
function penaltyNotice(penalties){return penalties?.some(n=>n)?`<div class="penalty-notice" role="status">這次答錯／未全對：${penalties.map((n,i)=>n?ATTR[i]+' −'+n:'').filter(Boolean).join(' · ')}</div>`:'';}
function mistakeBadge(g){return `<div class="mistake-badge ${g.mistakes?'danger':''}" role="status" aria-label="失誤 ${g.mistakes} / 2"><span>${g.mistakes?'⚠':'♥'} 失誤</span><strong>${g.mistakes}<small> / 2</small></strong><b>${g.mistakes>=2?'挑戰結束':g.mistakes===1?'最後一次機會':'兩次失誤即結束'}</b></div>`;}
const SPOT_PALETTES=[
 [79,144,191],[173,111,158],[93,162,136],[174,139,91],[87,105,167],[177,87,97],
 [55,134,137],[144,147,77],[135,99,179],[190,119,77],[67,157,179],[112,167,96],
];
function setSpot(g){
 const base=g.palettes[g.index],delta=[24,17,11][g.index];
 g.odd=Math.floor(rng()*25);
 g.colors=[`rgb(${base.join(',')})`,`rgb(${base.map(v=>v+delta).join(',')})`];
}
function restoreMiniHistory(){
 state.used=state.used?.map(key=>key==='song:世界唯一的你'?'song:世界唯一的妳':key)||[];
 if(state.miniUsed){
  state.miniUsed=state.miniUsed.map(key=>key==='song:世界唯一的你'?'song:世界唯一的妳':key);
  return;
 }
 state.miniUsed=[];
 const songGames=new Set(['lyrics','singer','lyric-artist','lyric-fill']);
 const played=new Set([...state.history.map(h=>h.gameId),state.game?.id].filter(id=>songGames.has(id)));
 // Old saves stored the game names, while the browser's recent list retained the song IDs.
 for(const song of songs){
  if([...played].some(id=>miniSeen.includes(id+':'+song.id)))state.miniUsed.push('song:'+song.title);
 }
}
function songPairs(type){
 const used=new Set(state.used);
 const available=songs.filter(song=>!song.questionIds?.some(id=>used.has(id)));
 const answer=song=>type==='lyrics'?song.title:song.artist;
 return freshSample(available,4,song=>'song:'+song.title,answer).map(song=>[
  type==='singer'?'《'+song.title+'》'+(song.year?'・'+song.year+'年版本':''):'「'+song.excerpt+'」',
  answer(song)
 ]);
}
function savedBoardNeedsRefresh(game){
 if(!game||game.done)return false;
 if(['lyrics','singer','lyric-singer','quiz'].includes(game.type))return true;
 if(['lyrics','lyric-artist','singer'].includes(game.id)&&game.songRevision!==2)return true;
 if(game.id==='anime'){
  const titles=miniBank.find(g=>g.id==='anime').pairs;
  const canonical=game.pairs.map(([name])=>titles.find(([role])=>role===name)?.[1]);
  return canonical.some((title,i)=>!title||title!==game.pairs[i][1])||new Set(canonical).size!==canonical.length;
 }
 if(game.id==='flags'){
  const names=new Set(miniBank.find(g=>g.id==='flags').pairs.map(([name])=>name));
  return game.pairs.some(([name])=>!names.has(name));
 }
 return false;
}
const PUZZLE_NAMES={stack:'房子疊疊樂',relay:'記憶接力・限時版',recycle:'校園垃圾分類',luck:'校慶幸運袋'};
const RETIRED_GAMES={pattern:'stack',maze:'relay',football:'relay',sum:'recycle'};
const PUZZLE_SKILLS=['stack','relay','recycle'];
const RECYCLE_ITEMS=[
 ['📰','乾淨、乾燥的報紙',0],['📦','拆平的乾紙箱',0],['📄','沒有沾到油污的影印紙',0],['📃','乾燥的普通紙傳單',0],['✉️','沒有塑膠窗的紙信封',0],['📓','從筆記本拆下的乾淨紙頁',0],
 ['🍌','吃完香蕉剩下的皮',1],['🍎','吃完蘋果剩下的果核',1],['🥬','備料時摘下的生菜葉',1],['🍊','剝下來的橘子皮',1],['🍐','吃完梨子剩下的果皮',1],['🥭','削下來的芒果皮',1],
 ['🤧','擦過鼻涕的衛生紙',2],['🩹','從手指撕下的用過 OK 繃',2],['🪥','刷毛已磨損的舊牙刷',2],['😷','戴過的一次性口罩',2],['🧽','破掉的洗碗海綿',2],['🧹','打掃地板掃起的灰塵',2],
 ['🥫','倒空、沖洗過的鐵罐',3],['🍾','倒空的完整玻璃瓶',3],['🧴','倒空、洗過的塑膠瓶',3],['🥤','喝完、沖過的鋁製飲料罐',3],['🫙','洗乾淨的玻璃果醬罐',3],['💧','喝完水的空寶特瓶',3],
];
const BINS=['乾淨紙類','果皮與生菜葉','一般垃圾','空瓶與罐'];
const STACK_LEVELS=5;
const RELAY_SYMBOLS=[['★','星形'],['●','圓形'],['▲','三角形'],['■','方形'],['◆','菱形'],['♥','愛心']];
const RELAY_LENGTHS=[4,5,6];
const RELAY_PREVIEW=[3200,3000,2800];
const RELAY_LIMIT=[8000,8000,9000];
function newPuzzle(type){
 const g={type,mistakes:0,done:false,steps:0};
 if(type==='stack'){
  g.floors=[50];
  g.phase=Math.floor(rng()*100);
 }else if(type==='relay'){
  g.rounds=RELAY_LENGTHS.map(length=>{
   const candidates=Array.from({length:12},()=>{
    const sequence=[];
    while(sequence.length<length){
     const choices=RELAY_SYMBOLS.map((_,i)=>i).filter(i=>i!==sequence.at(-1));
     sequence.push(choices[Math.floor(rng()*choices.length)]);
    }
    return sequence;
   });
   return freshSample(candidates,1,sequence=>'relay:'+sequence.join(''))[0];
  });
  g.recalled=0;
  g.phase='ready';
 }else if(type==='recycle'){
  g.items=shuffle(BINS.flatMap((_,bin)=>freshSample(RECYCLE_ITEMS.filter(item=>item[2]===bin),1,item=>'recycle:'+item[1])));
 }else{
  g.prizes=shuffle([100,86,72,60]);
 }
 return g;
}
function stackPosition(g,now){
 const speed=0.054+g.steps*.013;
 const phase=(Math.max(0,now-g.started)*speed+g.phase)%200;
 return 12+Math.min(phase,200-phase)*.76;
}
function stackWidth(level){return Math.max(12,24-level*2.2);}
function stackTolerance(level){return 9-level*1.05;}
function puzzleAction(g,action,id){
 if(g.done)return;
 let complete=false,miss=false,target=4;
 if(g.type==='stack'){
  if(action==='puzzle-start'&&!g.started){g.started=Date.now();return;}
  if(action!=='puzzle-drop'||!g.started)return;
  const x=stackPosition(g,Date.now());
  if(Math.abs(x-g.floors.at(-1))<=stackTolerance(g.steps)){g.floors.push(x);g.steps++;}
  else miss=true;
  target=STACK_LEVELS;
  complete=g.steps===target;
 }else if(g.type==='relay'){
  const now=Date.now();
  target=g.rounds.length;
  if(action==='puzzle-start'&&g.phase==='ready'){
   g.phase='preview';g.deadline=now+RELAY_PREVIEW[g.steps];g.recalled=0;g.feedback='';
   return;
  }
  if(g.phase==='preview'&&now>=g.deadline){
   g.phase='recall';g.deadline=now+RELAY_LIMIT[g.steps];
   return;
  }
  if(g.phase==='recall'&&now>=g.deadline){
   g.phase='ready';delete g.deadline;g.feedback='時間到，記一次失誤。';miss=true;
  }else{
   if(g.phase!=='recall'||action!=='puzzle-tile'||!RELAY_SYMBOLS[id])return;
   const sequence=g.rounds[g.steps];
   if(id!==sequence[g.recalled]){
    g.feedback='順序不對，記一次失誤。';miss=true;
   }else{
    g.recalled++;
    g.feedback='';
    if(g.recalled<sequence.length)return;
    g.steps++;
    complete=g.steps===target;
    g.phase='ready';delete g.deadline;
   }
  }
 }else{
  if(action!=='puzzle-tile'||!Number.isInteger(id)||id<0)return;
  if(g.type==='luck'){
   if(id>=g.prizes.length)return;
   g.picked=id;g.score=g.prizes[id];g.done=true;return;
  }
  if(id>=BINS.length)return;
  miss=id!==g.items[g.steps][2];
  if(!miss)g.steps++;
  complete=g.steps===4;
 }
 if(miss)g.mistakes++;
 if(complete||g.mistakes>=2){
  g.done=true;g.failed=!complete;
  g.score=complete?100-g.mistakes*15:Math.max(0,Math.round(g.steps/target*60)-g.mistakes*10);
 }
}
function puzzleBoard(g){
 const progress=`<p class="puzzle-progress">已完成 ${g.steps} / 4</p>`;
 if(g.type==='stack'){
  const floor=(x,i,extra='')=>`<i class="stack-floor ${extra}" style="left:${x}%;width:${stackWidth(i)}%;bottom:${i*20+10}px"></i>`;
  return `<p class="game-instruction">對準下方樓層再按「放下」。共疊五層，越往上越窄、越快。</p>
   <p class="puzzle-progress">已完成 ${g.steps} / ${STACK_LEVELS} 層</p>
   <div class="stack-board" aria-label="房子堆疊區">
    <i class="stack-guide" aria-hidden="true" style="left:${g.floors.at(-1)}%"></i>
    ${g.floors.map((x,i)=>floor(x,i)).join('')}
    ${g.started?floor(stackPosition(g,Date.now()),g.floors.length,'stack-slider'):''}
   </div>${g.started?button('放下樓層','puzzle-drop'):button('開始堆疊','puzzle-start')}`;
 }
 if(g.type==='relay'){
  const sequence=g.rounds[g.steps];
  const preview=g.phase==='preview';
  const status=g.phase==='ready'?'按「開始」後，記住出現的符號順序。':preview?'記住順序，倒數結束就會蓋住。':'在時間內，照剛才的順序點符號。';
  return `<p class="game-instruction">${status}</p><p class="puzzle-progress">第 ${g.steps+1} / ${g.rounds.length} 輪 · ${sequence.length} 個符號</p>
   ${g.feedback?`<p class="relay-feedback" role="status">${g.feedback}</p>`:''}
   ${g.phase==='ready'?button(g.feedback?'重試本輪':'開始這輪','puzzle-start'):`
    <p class="relay-clock">剩 <strong id="relay-clock">${Math.max(0,Math.ceil((g.deadline-Date.now())/1000))}</strong> 秒</p>
    ${preview?`<div class="relay-sequence" aria-label="${sequence.map(i=>RELAY_SYMBOLS[i][1]).join('、')}">${sequence.map(i=>`<b>${RELAY_SYMBOLS[i][0]}</b>`).join('')}</div>`:`
     <p class="puzzle-progress">已輸入 ${g.recalled} / ${sequence.length}</p>
     <div class="puzzle-grid relay-grid">${RELAY_SYMBOLS.map(([symbol,name],i)=>button(symbol,'puzzle-tile','secondary',`data-id="${i}" aria-label="${name}"`)).join('')}</div>`}`}`;
 }
 if(g.type==='recycle'){
  const [icon,item]=g.items[g.steps];
  return `<p class="game-instruction">先讀物品名稱和狀態，再點校園對應的回收桶或垃圾桶。</p>${progress}
   <p class="puzzle-item"><span aria-hidden="true">${icon}</span> 手上的物品：${item}</p>
   <div class="puzzle-grid recycle-grid">${BINS.map((bin,i)=>button(bin,'puzzle-tile','secondary',`data-id="${i}"`)).join('')}</div>`;
 }
 return `<p class="game-instruction">挑一個幸運袋。每袋都有獎，能抽到多少就看運氣！</p>
  <div class="puzzle-grid luck-grid">${g.prizes.map((_,i)=>button('🎁 '+(i+1),'puzzle-tile','secondary',`data-id="${i}" aria-label="開第 ${i+1} 個幸運袋"`)).join('')}</div>`;
}
function activePuzzle(){
 return state.stage==='interview'?state.interview.games[state.interview.index]:state.game.puzzle;
}
function animateRelay(clock){
 const g=activePuzzle();
 const tick=()=>{
  if(!clock.isConnected)return;
  const left=g.deadline-Date.now();
  if(left<=0){
   if(state.stage==='interview'){puzzleAction(g,'puzzle-clock');save();render();}
   else miniAction('puzzle-clock');
   return;
  }
  const seconds=String(Math.ceil(left/1000));
  if(clock.textContent!==seconds)clock.textContent=seconds;
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function animateStack(slider){
 const g=activePuzzle();
 const tick=now=>{
  if(!slider.isConnected)return;
  slider.style.left=stackPosition(g,performance.timeOrigin+now)+'%';
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function startGame(source){
 if(state.dieIndex<state.dice.length)return;
 if(!state.game){
  source??=miniBank.find(g=>g.id===state.replacementGame)||drawMiniGame();
  const g={id:source.id,name:source.name,type:source.type,attr:source.attr,image:source.image,
   done:false,mistakes:0,selected:null,matched:[],index:0,hits:0,feedback:''};
  const promptKey=item=>'mini:'+String(item).normalize('NFKC').replace(/\s+/g,'');
  if(source.type==='match'){
   g.pairs=freshSample(source.pairs,4,p=>promptKey(p[0]),p=>p[1].normalize('NFKC'));
   g.right=shuffle(g.pairs.map(p=>p[1]));
  }else if(source.type==='swatch'){
   g.pairs=freshSample(source.pairs,4,p=>promptKey(p[1].join(','))).map(([name,colors])=>[name,name,colors]);
   g.right=shuffle(g.pairs.map(p=>p[1]));
  }else if(['lyrics','singer','lyric-singer'].includes(source.type)){
   g.type='match';
   g.pairs=songPairs(source.type);
   g.right=shuffle(g.pairs.map(pair=>pair[1]));
  }else if(source.type==='memory'){
   const symbols=freshSample(source.symbols,4,promptKey);
   g.cards=shuffle(symbols.flatMap(s=>[s,s]));
   g.faceUp=[];g.found=[];g.preview=true;
  }else if(source.type==='order'){
   let items=source.items;
   if(source.id==='conan-order'){
    const years=items.map(item=>item[1]);
    const windows=years.map(year=>items.filter(item=>item[1]>=year&&item[1]<=year+6))
     .filter(window=>new Set(window.map(item=>item[1])).size>=4);
    const used=new Set(state.miniUsed||[]);
    const playable=windows.filter(window=>window.filter(item=>!used.has(promptKey(item[0]))).length>=4);
    if(playable.length)items=playable[Math.floor(rng()*playable.length)];
   }
   g.items=freshSample(items,4,x=>promptKey(x[0]),x=>x[1]).sort((a,b)=>a[1]-b[1]);
   g.tiles=shuffle(g.items);
   g.ordered=[];
  }else if(source.type==='spot'){
   g.palettes=freshSample(SPOT_PALETTES,3,promptKey);
   setSpot(g);
  }else if(Object.hasOwn(PUZZLE_NAMES,source.type)){
   g.puzzle=newPuzzle(source.type);
  }
  state.game=g;
  delete state.replacementGame;
  if(['lyrics','lyric-artist','singer'].includes(g.id))g.songRevision=2;
  miniHistory=[...miniHistory,g.id].slice(-36);
  saveStore(MINI_ROTATION_KEY,miniHistory);
 }
 go('game');
}
function finishGame(score,failed=false){
 const g=state.game;if(g.done)return;g.done=true;g.failed=failed||score<60;g.score=Math.round(clamp(score));
 const before=state.attrs[g.attr];g.bonus=g.failed?-Math.min(4,before):Math.min(g.mistakes?2:g.score>=80?5:2,100-before);state.attrs[g.attr]=clamp(before+g.bonus);
 g.portfolioBonus=g.failed?0:Math.min(10+Math.round(g.score/10)-g.mistakes*5,100-state.portfolio);state.portfolio+=g.portfolioBonus;
 const h=state.history.at(-1);h.game=g.name;h.gameId=g.id;h.gameScore=g.score;h.gameFailed=g.failed;h.gameDelta=g.bonus;h.dice=state.assignments.map(d=>ATTR[d.attr]+'＋'+d.added).join('、');save();render();
}
function miniAction(a,id){
 const g=state.game;if(!g||g.done)return;
 const miss=()=>{g.mistakes++;toast(g.mistakes===1?'失誤一次，剩最後一次機會！':'兩次失誤，這次挑戰結束。');};
 const endOrRender=(complete,score)=>{if(g.mistakes>=2)finishGame(score,true);else if(complete)finishGame(score);else{save();render();}};
 if(a.startsWith('puzzle-')&&g.puzzle){
  const before=g.puzzle.mistakes;
  puzzleAction(g.puzzle,a,id);
  if(g.puzzle.mistakes>before)miss();
  endOrRender(g.puzzle.done,g.puzzle.score);
 }else if(a==='pair-left'){if(id>=0&&id<g.pairs.length&&!g.matched.includes(id)){g.selected=id;save();render();}}
 else if(a==='pair-right'){if(g.selected===null){toast('先選左邊，再點右邊。');return;}if(g.pairs[g.selected][1]===g.right[id]){g.matched.push(g.selected);g.selected=null;}else miss();endOrRender(g.matched.length===g.pairs.length,g.matched.length/g.pairs.length*100-g.mistakes*15);}

 else if(a==='memory-card'){if(g.preview||g.found.includes(id)||g.faceUp.includes(id)||g.faceUp.length===2)return;g.faceUp.push(id);if(g.faceUp.length===2){const [x,y]=g.faceUp;if(g.cards[x]===g.cards[y]){g.found.push(x,y);g.faceUp=[];}else miss();}endOrRender(g.found.length===g.cards.length,g.found.length/g.cards.length*100-g.mistakes*15);}
 else if(a==='memory-ready'){if(g.preview){g.preview=false;save();render();}}
 else if(a==='memory-again'){g.faceUp=[];save();render();}
 else if(a==='order-tile'){const item=g.tiles[id];if(!item||g.ordered.includes(item[0]))return;const next=g.items.filter(x=>!g.ordered.includes(x[0])).sort((x,y)=>x[1]-y[1])[0];if(item[0]===next[0])g.ordered.push(item[0]);else miss();endOrRender(g.ordered.length===g.items.length,g.ordered.length/g.items.length*100-g.mistakes*15);}
 else if(a==='spot-tile'){if(id===g.odd){g.hits++;g.index++;if(g.index<3){g.palettes||=shuffle(SPOT_PALETTES).slice(0,3);setSpot(g);}}else miss();endOrRender(g.index===3,g.hits/3*100-g.mistakes*15);}
}
function required(p){return state.route==='distribution'?p.split:p.subjects;}
function starRankLimit(p){
 if(['ntu','nthu','nycu','ncku','nccu'].includes(p.university))return 20;
 if(['ncu','nchu','nsysu','ccu'].includes(p.university))return 30;
 return p.maxRank;
}
function eligibility(p){const scores=state.route==='distribution'?state.division:state.gsat;return required(p).every(s=>Object.hasOwn(scores,s))&&(state.route!=='star'||state.rank<=starRankLimit(p));}
function programScore(p){const split=state.route==='distribution',names=required(p),scores=split?state.division:state.gsat;return names.reduce((n,s,i)=>n+(scores[s]||0)*(i?1:2),0)/(names.length+1)/(split?60:15)*100;}
function aptitudeScore(p){return p.weights.reduce((n,w,i)=>n+w*(state.attrs[i]*.65+state.aptitude[i]*.35),0);}
function isArtsUniversity(id){
 return ['ntua','tnua','tnnua'].includes(id);
}
function screeningFloor(p){
 return p.applyFloor??(isArtsUniversity(p.university)?55:Math.min(p.examFloor,94));
}
function admissionEstimate(p){
 if(!eligibility(p))return 0;
 const exam=programScore(p),talent=aptitudeScore(p),art=isArtsUniversity(p.university);
 const apply=state.route==='apply';
 const examFloor=apply?screeningFloor(p):art?Math.min(p.examFloor,55):p.examFloor;
 const talentFloor=art?Math.max(p.talentFloor,58):apply?0:p.talentFloor;
 if(state.route!=='star'&&(exam<examFloor||talent<talentFloor))return 0;
 let score;
 const interview=apply&&interviewComplete()?interviewScore(p):80;
 if(apply)score=exam*.4+talent*.3+interview*.3;
 else if(state.route==='star')score=exam*.25+(state.schoolScore??100-state.rank)*.75;
 else score=art?exam*.25+talent*.75:exam*.7+talent*.3;
 const topSupport=apply&&p.selectivity==='top'
  ?clamp((exam-85)/8,0,1)*clamp((talent-48)/12,0,1)*clamp((interview-74)/10,0,1):0;
 const cap=({medical:18,pharmacy:25,top:35,midTech:46,midOther:57,public:70,privateTech:83}[p.selectivity]??98)+10*topSupport;
 const threshold=p.threshold-9*topSupport;
 return Math.round(clamp(100/(1+Math.exp((threshold-score)/5)),.5,cap)*10)/10;
}
function resetFilters(){filter={search:'',area:'全部',type:'全部',group:'全部',university:'全部',sort:'chance-desc'};openSelect=null;}
function applicationClosed(){return state.applyCompleted||state.lastAdmissionRoute==='apply';}
function setRoute(route){
 if(route==='apply'&&applicationClosed())return;
 state.route=route;state.preferences=[];state.starSchool=null;state.starGroup=null;resetFilters();go('universities');}
function prepareSplit(){if(state.stage!=='admissionResult'||!['star','apply'].includes(state.lastAdmissionRoute)){toast('先完成繁星或個申放榜，再決定是否考分科。');return;}const start=()=>{state.admission=null;state.splitSubjects=['數學乙','歷史','地理','公民與社會'];go('splitSelect');};if(state.stage==='admissionResult'&&state.admission.accepted)confirmAction('放棄這次錄取？','原錄取不保留，將以分科成績重新選填。',start);else start();}
function admissionForm(program,preferences){
 const data={route:state.route,program:program.id,preferences:preferences.join(','),
  attrs:state.attrs.join(','),aptitude:state.aptitude.join(','),portfolio:state.portfolio,
  rank:state.rank,seed:state.originSeed};
 if(state.route==='star'&&state.schoolScore!=null)data.schoolScore=state.schoolScore;
 for(const [key,value] of Object.entries(state.route==='distribution'?state.division:state.gsat)){
  data['s.'+key]=value;
 }
 return data;
}
function perfectGsat(){
 const scores=Object.values(state.gsat||{});
 return scores.length>0&&scores.every(score=>score===15);
}
function safetyProgram(excluded){
 if(!perfectGsat())return null;
 const allowed=['public','privateTech','private'];
 const group=programs.find(p=>p.id===state.preferences[0])?.group;
 return programs.filter(p=>allowed.includes(p.selectivity)&&!excluded.includes(p.id)&&eligibility(p)
  &&(!isArtsUniversity(p.university)||aptitudeScore(p)>=58))
  .sort((a,b)=>Number(b.group===group)-Number(a.group===group)||aptitudeScore(b)-aptitudeScore(a))[0];
}
function startInterview(){
 if(state.interview?.games?.length===3)return;
 state.interview={index:0,games:shuffle(PUZZLE_SKILLS).map(newPuzzle)};
}
function interviewComplete(){
 const interview=state.interview;
 return interview?.games?interview.games.every(g=>g.done):interview?.answers?.length===3;
}
function interviewScore(program){
 const interview=state.interview;
 if(!interview.games)return legacyInterviewScore(program);
 const weightsByGroup={
  1:[3,4,3],2:[2,3,5],3:[2,3,5],4:[5,3,2],5:[5,3,2],6:[5,3,2],7:[3,5,2],8:[3,4,3],
 };
 const weights=[...weightsByGroup[program.group]||weightsByGroup[1]];
 weights[(hashSeed(program.university)>>>24)%weights.length]++;
 const performance=interview.games.reduce((sum,g)=>sum+g.score*weights[PUZZLE_SKILLS.indexOf(RETIRED_GAMES[g.type]||g.type)],0);
 return Math.round(74+24*performance/11/100);
}
function legacyInterviewScore(program){
 // Keep the score for old interviews whose three answers were already submitted.
 const preferences={
  1:[82,94,76,86],2:[95,74,85,89],3:[94,90,75,84],4:[77,82,96,88],
  5:[76,85,96,83],6:[76,85,96,88],7:[81,87,79,95],8:[93,96,74,87],
 };
 const department=preferences[program.group]||preferences[1];
 const campusStyles=[[96,76,88,84],[83,96,75,88],[82,86,96,76],[88,82,78,96]];
 const campus=campusStyles[(hashSeed(program.university)>>>28)%campusStyles.length];
 const {questions,answers}=state.interview;
 return Math.round(answers.reduce((sum,answer,i)=>{
  const style=questions[i].options[answer].style;
  return sum+department[style]*.7+campus[style]*.3;
 },0)/3);
}
function finishAdmission(results,admitted){
 state.lastAdmissionRoute=state.route;
 state.admission={accepted:!!admitted,...admitted,results};
 if(state.route==='star')state.starUsed=true;
 if(state.route==='apply')state.applyCompleted=true;
 go('admissionResult');
}
async function finishInterview(){
 const application=state.application;
 if(!application||!interviewComplete())return;
 const results=[];
 let admitted=null;
 for(const row of application.screening){
  if(!row.accepted){results.push(row);continue;}
  const program=programs.find(p=>p.id===row.id);
  const interview=interviewScore(program);
  const response=await api('admission',{...admissionForm(program,application.preferences),phase:'final',interview});
  results.push({...response,id:program.id,interview});
  if(response.accepted&&!admitted)admitted={...response,program:program.id,preference:application.preferences.indexOf(program.id)+1,interview};
 }
 if(!admitted&&application.safety){
  const program=programs.find(p=>p.id===application.safety);
  const interview=interviewScore(program);
  const response=await api('admission',{...admissionForm(program,[program.id]),phase:'final',interview,safety:'1'});
  results.push({...response,id:program.id,interview});
  if(response.accepted)admitted={...response,program:program.id,safety:true,interview};
 }
 finishAdmission(results,admitted);
}
async function submitUniversities(){
 if(!state.preferences.length||(state.route==='apply'&&applicationClosed()))return;
 const max=state.route==='distribution'?10:3;
 const preferences=[...state.preferences],choices=preferences.map(id=>programs.find(p=>p.id===id));
 if(choices.length>max)throw new Error('志願數超過上限。');
 if(choices.some(p=>!p||!eligibility(p)))throw new Error('校系資格不符。');
 if(state.route==='star'&&(new Set(choices.map(p=>p.university)).size!==1||new Set(choices.map(p=>p.group)).size!==1))throw new Error('繁星限一校、一類組。');
 if(state.route==='apply'){
  const screening=[];
  for(const p of choices){
   const result=await api('admission',{...admissionForm(p,preferences),phase:'screen'});
   screening.push({...result,id:p.id});
  }
  const passed=screening.filter(row=>row.accepted).map(row=>row.id);
  const safety=safetyProgram(preferences);
  state.application={preferences,screening,safety:safety?.id};
  if(!passed.length&&!safety){finishAdmission(screening,null);return;}
  startInterview();
  go('applyScreen');
  return;
 }
 const results=[];
 let admitted=null;
 for(const [i,p] of choices.entries()){
  const response=await api('admission',admissionForm(p,preferences));
  results.push({...response,id:p.id});
  if(response.accepted){admitted={...response,program:p.id,preference:i+1};break;}
 }
 finishAdmission(results,admitted);
}
function admittedProgram(){return state.ending==='admitted'?historicalProgram(state.admission?.program):null;}
function finishEnding(kind){state.ending=kind;if(kind==='admitted')recordCollection();state.studentId||='DW'+String(state.originSeed%100000000).padStart(8,'0');unlockAchievements();go('ending');}
function unlockAchievements(){if(state.endLogged&&state.achievementVersion===6)return;const p=admittedProgram(),ids=[];if(p){ids.push('first');if(state.admission.preference===1)ids.push('firstchoice');ids.push(state.route==='distribution'?'split':state.route,p.type==='公立'?'national':'private');if(p.group===8)ids.push('medicine');if([4,5,6].includes(p.group))ids.push('artist');}else ids.push('retake');if(p){if(['medical','pharmacy','top','midTech','midOther'].includes(p.selectivity))ids.push('elite');if(['ntu','nccu'].includes(p.university))ids.push(p.university);if(p.college==='外國語文學院')ids.push('language');if(p.college==='商學院')ids.push('business');if(p.college==='傳播學院')ids.push('media');if(state.history.some(h=>h.gameFailed||h.penalties?.some(n=>n)))ids.push('comeback');}['science','words','society','visual','melody'].forEach((id,i)=>{if(state.attrs[i]>=80)ids.push(id);});if(state.attrs.some(n=>n===100))ids.push('maxed');if(state.attrs.every(n=>n>=60))ids.push('balanced');if(state.school.tier===5)ids.push('rare');ids.push(state.school.type==='公立'?'publichs':'privatehs');if(state.gsat&&Object.values(state.gsat).length>=4&&Object.values(state.gsat).every(n=>n===15))ids.push('gsatfull');if(state.division&&Object.values(state.division).length>=3&&Object.values(state.division).every(n=>n===60))ids.push('splitfull');for(const [game,id] of [['conan-unit','conan'],['conan-order','conan'],['flags','flags'],['colors','colorist']])if(state.history.some(h=>h.gameId===game&&h.gameScore===100))ids.push(id);if(state.history.length===6&&state.history.every(h=>h.correct===2))ids.push('quizmaster');if(state.history.length===6&&state.history.every(h=>h.gameScore>=80))ids.push('playmaster');if(p){if(['nthu','nycu','ncku','ncu','nchu','nsysu','ccu','ntnu','tmu','tnua'].includes(p.university))ids.push(p.university);if(p.group===6)ids.push('dance');if(p.selectivity==='pharmacy')ids.push('pharmacy');}if(state.attrs.every(n=>n>=70))ids.push('all70');if(state.attrs.filter(n=>n>=80).length>=3)ids.push('three80');if(state.rank<=10)ids.push('top10');if(state.gsat?.英文===15)ids.push('english15');if(state.gsat?.數學A===15||state.gsat?.數學B===15)ids.push('math15');if(state.history.some(h=>h.total>=90))ids.push('term90');if(state.history.find(h=>h.term==='高三下')?.correct===2)ids.push('lastperfect');if(state.history.length===6&&state.history.every(h=>h.correct>=1))ids.push('consistent');if((state.allocatedAttrs||[]).length===5)ids.push('fivealloc');if(new Set(state.history.filter(h=>!h.gameFailed&&h.gameScore>=60).map(h=>h.gameId)).size>=5)ids.push('fivegames');for(const [game,id] of [['lyric-artist','lyricwin'],['lyric-fill','lyricwin'],['mahjong','mahjongwin'],['memory','memorywin']])if(state.history.some(h=>h.gameId===game&&h.gameScore===100))ids.push(id);achievements._seeds=[...new Set([...(achievements._seeds||[]),state.originSeed])];if(achievements._seeds.length>=3)ids.push('explorer');const extra=additionalAchievementIds(p);
 const earned=[...ids.slice(0,p&&state.admission.preference===1?2:1),...extra.journey,...ids,...extra.challenges];
 state.newAchievements=[];
 for(const id of new Set(earned)){if(state.newAchievements.length===5)break;if(!achievements[id]){achievements[id]={date:new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei'}).format(new Date())};state.newAchievements.push(id);}}state.endLogged=true;state.achievementVersion=6;saveStore(ACH_KEY,achievements);}
function recordCollection(){
 if(state?.ending!=='admitted'||!state.admission?.accepted)return;
 const p=historicalProgram(state.admission.program);if(!p||collection.programs[p.id])return;
 collection.programs[p.id]={date:new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei'}).format(new Date()),university:p.university,route:state.route};
 if(!saveStore(COLLECTION_KEY,collection))toast('收藏儲存失敗，請檢查瀏覽器儲存空間。');
}
function openCollection(){if(busy)return;collectionOpen=true;openSelect=null;if(location.hash!=='#collection')history.pushState(null,'','#collection');render();window.scrollTo({top:0,behavior:'instant'});}
function closeCollection(){collectionOpen=false;openSelect=null;history.replaceState(null,'',location.pathname+location.search);render();window.scrollTo({top:0,behavior:'instant'});}
function collectionView(){
 const unlocked=programs.filter(p=>collection.programs[p.id]);
 const schools=new Set(unlocked.map(p=>p.university));
 return `<section class="collection-page">
  ${state?schoolProgress():''}
  ${heading('我的升學收藏','校系圖鑑','點開大學，查看各科系的收藏進度。')}
  <div class="collection-summary">
   <article><span>解鎖大學</span><strong>${schools.size}<small> / ${catalog.universities.length}</small></strong></article>
   <article><span>解鎖科系</span><strong>${unlocked.length}<small> / ${programs.length}</small></strong></article>
   <div>${button('← 回到遊戲','close-collection','secondary')}</div>
  </div>
  <div class="collection-schools">${catalog.universities.map(u=>collectionSchool(u)).join('')}</div>
  ${archivedCollection()}
  <p class="tiny-note">接受錄取後解鎖，收藏會保留在此瀏覽器。</p>
 </section>`;
}
function archivedCollection(){
 const earned=archivedPrograms.filter(p=>collection.programs[p.id]);
 if(!earned.length)return '';
 const ids=new Set(earned.map(p=>p.university));
 return `<h2>歷屆收藏</h2><div class="collection-schools">${[...ids].map(id=>collectionSchool(university(id),earned)).join('')}</div>`;
}
function collectionSchool(u,pool=programs){
 const departments=pool.filter(p=>p.university===u.id);
 const count=departments.filter(p=>collection.programs[p.id]).length;
 return `<details name="collection-university" class="collection-school ${count?'has-unlocks':''}" data-university="${u.id}">
  <summary>${crest(u)}<div><h2>${esc(u.name)}</h2><span>${count} / ${departments.length} 系已解鎖</span></div></summary>
  <ul>${departments.map(p=>{
   const record=collection.programs[p.id];
   const note=record?esc(routeName(record.route)||'錄取')+' · '+esc(record.date):catalog.groups[p.group];
   return `<li class="${record?'unlocked':'locked'}" data-program="${p.id}">
    <span class="collection-mark">${record?'✓':'🔒'}</span>
    <div><b>${esc(p.name)}</b><small>${note}</small></div>
    <span>${record?'已解鎖':'未解鎖'}</span>
   </li>`;
  }).join('')}</ul>
 </details>`;
}
function renderAchievements(){
 const count=ACHIEVEMENTS.filter(([id])=>achievements[id]).length;
 const visible=ACHIEVEMENTS.filter(([id,,,,category='classic'])=>
  achievementCategory==='all'||(achievementCategory==='unlocked'?achievements[id]:category===achievementCategory));
 const filters=ACHIEVEMENT_CATEGORIES.map(([id,name])=>
  `<button type="button" class="secondary" data-achievement-category="${id}" aria-pressed="${achievementCategory===id}">${name}</button>`).join('');
 const archive=(catalog.archive?.universities||[]).filter(u=>achievements['campus-'+u.id]);
 const historical=achievementCategory==='unlocked'&&archive.length?`<h3>歷屆成就</h3><div class="achievement-grid">
  ${archive.map(u=>`<article class="achievement unlocked"><span>🏫</span><b>入學信・${esc(u.name)}</b><small>舊版錄取紀錄</small></article>`).join('')}
 </div>`:'';
 const cards=visible.map(([id,name,note,icon])=>`<article class="achievement ${achievements[id]?'unlocked':'locked'}">
  <span>${achievements[id]?icon:'🔒'}</span><b>${achievements[id]?esc(name):'尚未發現'}</b>
  <small>${achievements[id]?esc(note):'試試不同的選擇與結局。'}</small></article>`).join('');
 $('#achievement-content').innerHTML=`<span class="eyebrow">平行青春的收藏</span>
  <h2>隱藏成就 <small>${count} / ${ACHIEVEMENTS.length}</small></h2>
  <div class="achievement-filters" role="group" aria-label="成就分類">${filters}</div>
  ${cards?`<div class="achievement-grid">${cards}</div>`:'<p>這個分類目前還沒有成就。</p>'}${historical}`;
}
function showAchievements(){
 renderAchievements();
 $('#achievement-dialog').showModal();
}
$('#achievement-content').addEventListener('click',e=>{
 const selected=e.target.closest('[data-achievement-category]');
 if(!selected)return;
 achievementCategory=selected.dataset.achievementCategory;
 renderAchievements();
 $('#achievement-content [aria-pressed="true"]').focus({preventScroll:true});
});
function evaluation(){const p=admittedProgram(),delta=state.attrs.map((v,i)=>v-state.initialAttrs[i]),best=delta.indexOf(Math.max(...delta));return `${state.name}，從${state.school.name}出發，六個學期裡，你的${ATTR[best]}累積成長${delta[best]}點。${p?'你透過'+routeName(state.route)+'錄取'+p.universityName+p.name+'。這張學生證，收下了每一次嘗試。':'這次選擇重新準備。帶著已累積的經驗，下一次可以走出另一條路。'}`;}
function downloadStory(){
 const program=admittedProgram();
 const scoreRows=Object.entries(state.gsat||{}).map(([subject,score])=>[subject,score,15]);
 const splitRows=Object.entries(state.division||{}).map(([subject,score])=>[subject,score,60]);
 const scoreList=rows=>`<ul class="scores">${rows.map(([subject,score,max])=>
  `<li><span>${esc(subject)}</span><strong>${esc(score)} <small>/ ${max}</small></strong></li>`).join('')}</ul>`;
 const abilityRows=ATTR.map((name,i)=>{
  const value=clamp(Number(state.attrs[i])),initial=state.initialAttrs[i],delta=value-initial;
  return `<li><span>${name}</span><progress max="100" value="${value}">${value}</progress>
   <strong>${value}</strong><small>${initial} → ${value}（${delta>0?'＋':''}${delta}）</small></li>`;
 }).join('');
 const terms=state.history.map(h=>{
  const details=[['突發事件',h.event],['事件經過',h.eventStory||h.eventChoice],['分配點數',h.dice],
   ['課間挑戰',h.game?`${h.game} · ${h.gameScore} 分`:'']];
  return `<li><article><header><h3>${esc(h.term)}</h3><strong>${esc(h.total)} <small>分</small></strong></header>
   <dl>${details.filter(([,value])=>value).map(([label,value])=>`<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>
  </article></li>`;
 }).join('');
 const awards=(state.newAchievements||[]).slice(0,5).map(id=>ACHIEVEMENTS.find(item=>item[0]===id)??(id.startsWith('campus-')&&university(id.slice(7))?[id,'入學信・'+university(id.slice(7)).name,'','🏫']:null)).filter(Boolean);
 const result=program?`${program.universityName}｜${program.name}`:'重考生';
 const html=`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(state.name)}的升學旅程</title>
<style>
 :root{color-scheme:light;font-family:system-ui,"PingFang TC",sans-serif;color:#19314b;background:#edf2fb}
 *{box-sizing:border-box}body{margin:0;padding:28px 16px}
 main{max-width:850px;margin:auto;background:#fff;border:1px solid #cbd9ef;border-radius:20px;overflow:hidden}
 .cover{padding:36px clamp(22px,7vw,60px);background:#163861;color:#fff;border-bottom:7px solid #f1bf60}
 .cover p{margin:.6em 0}.kicker{color:#f4d493;letter-spacing:.15em;font-weight:700;font-size:.82rem}
 h1{font-size:clamp(1.8rem,6vw,3.3rem);line-height:1.2;margin:.28em 0;overflow-wrap:anywhere}
 h2{font-size:1.3rem;margin:0 0 14px;color:#17477c}h3{margin:0;font-size:1rem}
 .content{padding:24px clamp(18px,6vw,50px)}
 section{margin:0 0 24px}p{line-height:1.65;overflow-wrap:anywhere}
 .meta,.scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px}
 ul,ol{list-style:none;padding:0;margin:0}
 .meta div,.scores li,.timeline article{background:#f5f8fd;border:1px solid #d6e2f3;border-radius:10px;padding:10px 12px}
 .meta small,.scores span{display:block;color:#435c7b}.meta strong{overflow-wrap:anywhere}
 .scores strong{font-size:1.15rem}.scores small,.timeline small{font-size:.76rem;color:#435c7b}
 .abilities li{display:grid;grid-template-columns:2.8em minmax(0,1fr) 2.2em 8em;align-items:center;gap:8px;padding:6px 0}
 .abilities progress{width:100%;accent-color:#326ab6}.abilities small{color:#435c7b;text-align:right}
 .timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:10px}
 .timeline article{height:100%;break-inside:avoid}.timeline header{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #d6e2f3;padding-bottom:7px}
 dl{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:.85rem;margin:8px 0 0}dt{color:#435c7b}dd{margin:0;overflow-wrap:anywhere}
 .reflection{border-left:4px solid #d39535;padding-left:14px}
 footer{padding:14px 18px;background:#f5f8fd;color:#435c7b;font-size:.82rem;text-align:center}
 @media(max-width:360px){.abilities li{grid-template-columns:2.7em minmax(0,1fr) 2em}.abilities small{grid-column:2/4}}
 @media print{body{padding:0;background:#fff}main{border:0}.cover{print-color-adjust:exact;-webkit-print-color-adjust:exact}h2{break-after:avoid}.meta,.scores,.abilities{break-inside:avoid}}
</style></head><body><main>
<header class="cover"><p class="kicker">呆丸升學模擬 · 畢業紀念冊</p>
<h1>${esc(state.name)}的升學旅程</h1><p>${esc(state.school.name)} → ${esc(result)}</p></header>
<div class="content">
<section class="meta" aria-label="旅程資料">
 <div><small>旅程種子</small><strong>${esc(state.seedText)}</strong></div>
 <div><small>在校排名</small><strong>${state.rank!=null?`前 ${esc(state.rank)}%`:'—'}</strong></div>
 <div><small>學習歷程</small><strong>${esc(state.portfolio)} / 100</strong></div>
 ${program?`<div><small>錄取管道</small><strong>${esc(routeName(state.route))}</strong></div>
 <div><small>學號</small><strong>${esc(state.studentId)}</strong></div>`:''}
</section>
<section><h2>五項能力成長</h2><ul class="abilities">${abilityRows}</ul></section>
${scoreRows.length?`<section><h2>學測成績</h2>${scoreList(scoreRows)}</section>`:''}
${splitRows.length?`<section><h2>分科成績</h2>${scoreList(splitRows)}</section>`:''}
<section><h2>學期足跡</h2><ol class="timeline">${terms}</ol></section>
${awards.length?`<section><h2>本局解鎖</h2><p>${awards.map(([,name,,icon])=>esc(icon+' '+name)).join('　')}</p></section>`:''}
<section class="reflection"><h2>畢業評語</h2><p>${esc(evaluation())}</p></section>
</div><footer>呆丸升學模擬 · 作者 LeleHuang · 遊戲紀念</footer></main></body></html>`;
 download(new Blob([html],{type:'text/html;charset=utf-8'}),'呆丸升學旅程.html');
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function imageLoad(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('圖片讀取失敗'));i.src=src;});}
async function downloadCard(){await document.fonts.ready;const p=admittedProgram(),u=university(p.university),[portrait,badge]=await Promise.all([imageLoad(state.photo||defaultPortrait()),imageLoad(u.crest)]);const canvas=document.createElement('canvas');canvas.width=1520;canvas.height=960;const c=canvas.getContext('2d');c.fillStyle='#fff9ed';c.fillRect(0,0,1520,960);c.fillStyle=u.color;c.fillRect(0,0,1520,240);c.drawImage(badge,60,35,170,170);c.fillStyle='#ffffff';c.font='bold 62px sans-serif';c.fillText(p.universityName,260,115,1150);c.fillStyle=u.accent;c.font='23px sans-serif';c.fillText('學生證 / STUDENT ID',265,172);c.save();c.beginPath();c.roundRect(85,310,320,405,18);c.clip();const scale=Math.max(320/portrait.width,405/portrait.height);c.drawImage(portrait,85+(320-portrait.width*scale)/2,310+(405-portrait.height*scale)/2,portrait.width*scale,portrait.height*scale);c.restore();c.fillStyle='#8c9a9a';c.font='22px sans-serif';c.fillText('學生姓名 / NAME',475,340);c.fillStyle='#243f51';c.font='bold 62px sans-serif';c.fillText(state.name,475,425,940);c.fillStyle='#8c9a9a';c.font='22px sans-serif';c.fillText('錄取學系 / DEPARTMENT',475,495);c.fillStyle='#243f51';c.font='bold 45px sans-serif';c.fillText(p.name,475,565,940);c.fillStyle='#8c9a9a';c.font='22px sans-serif';c.fillText('學號 / STUDENT NO.',475,645);c.fillStyle=u.color;c.font='38px monospace';c.fillText(state.studentId,475,705);c.strokeStyle='#d5dfdb';c.beginPath();c.moveTo(85,810);c.lineTo(1435,810);c.stroke();c.font='25px sans-serif';c.fillStyle=u.color;c.fillText('準大學生 · '+routeName(state.route),85,865);c.font='20px sans-serif';c.fillStyle='#98a29f';c.textAlign='right';c.fillText('LeleHuang / 呆丸升學模擬・遊戲紀念卡',1435,865);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('圖片生成失敗');download(blob,'呆丸升學學生證.png');}
async function uploadPhoto(file){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('請選擇10MB以內的JPG、PNG或WebP照片。');const url=URL.createObjectURL(file);try{const im=await imageLoad(url),c=document.createElement('canvas');c.width=320;c.height=400;const x=c.getContext('2d');x.fillStyle='#e3eced';x.fillRect(0,0,320,400);const scale=Math.max(320/im.width,400/im.height);x.drawImage(im,(320-im.width*scale)/2,(400-im.height*scale)/2,im.width*scale,im.height*scale);state.photo=c.toDataURL('image/jpeg',.85);save();render();}finally{URL.revokeObjectURL(url);}}
function schoolProgress(){
 const term=termName();
 return `<div class="school-progress" aria-label="就讀高中與年級"><strong>${esc(state.school.name)}</strong><span>${term.slice(0,2)}${term.endsWith('上')?'上學期':'下學期'}</span></div>`;
}
function shell(body,step=1){return `<div class="workspace stage-${state.stage}"><aside class="sidebar"><div class="student-file"><span class="eyebrow">玩家資料</span><h3>${esc(state.name)}</h3><small>${state.school.name}</small><span class="seed-badge">種子 ${esc(state.seedText)}</span></div><nav class="steps" aria-label="遊程進度">${['高中入學','六個學期','學測成績','大學志願','畢業紀念'].map((s,i)=>`<div class="${step===i?'active':step>i?'done':''}"><b>${step>i?'✓':i+1}</b><span>${s}</span></div>`).join('')}</nav><div class="attribute-board"><span class="eyebrow">我的五項能力</span>${attrBars()}</div><div class="semester-dots">${TERMS.map((t,i)=>`<span class="${state.round===i?'current':state.round>i?'complete':''}" title="${t}">${i+1}</span>`).join('')}</div></aside><section class="main-content">${schoolProgress()}${body}</section></div>`;}
function welcomeView(){return `<div class="campus-landing"><section class="campus-hero"><img src="/assets/campus-summer-v4.png" alt="陽光下的臺灣校園與學生" fetchpriority="high"><div class="hero-shade"></div><div class="hero-copy"><span class="hero-tag">校園生活 × 升學冒險</span><h1>你的青春，<br><em>下一站。</em></h1><p>一張入學通知，六個學期，<br>和一段只有你知道的故事。</p><span class="author-credit">作者 <b>LeleHuang</b></span></div><div class="hero-sticker">高中三年<br><b>六個學期</b></div></section><section class="entry-paper"><div class="paper-top"><span>新生報到</span><span>No. 001</span></div><h2>建立角色</h2><form id="start-form"><label for="player-name">姓名／暱稱</label><input id="player-name" required maxlength="16" autocomplete="nickname" placeholder="想被怎麼稱呼？" value="${state?esc(state.name):''}"><fieldset class="enroll-options"><legend>角色性別</legend><label><input type="radio" name="gender" value="male" required checked><span>👦 男生</span></label><label><input type="radio" name="gender" value="female"><span>👧 女生</span></label></fieldset><fieldset class="enroll-options"><legend>高中偏好</legend><label><input type="radio" name="schoolType" value="公立" required checked><span>🏫 公立</span></label><label><input type="radio" name="schoolType" value="私立"><span>🏡 私立</span></label></fieldset><label for="seed-input">旅程種子 <small>選填</small></label><input id="seed-input" maxlength="40" value="${esc(pendingSeed)}" placeholder="留白時重新隨機"><small class="seed-help">已為你隨機填入，可自行修改。</small><button type="submit" class="primary wide">開始新遊戲 <span class="action-arrow" aria-hidden="true">→</span></button></form>${state?`<div class="resume"><span>繼續 ${esc(state.name)} 的存檔</span>${schoolProgress()}${button('繼續遊戲 →','resume','secondary wide')}</div>`:''}${legacy&&!state?'<p class="tiny-note">新版旅程獨立存檔，舊紀錄仍保留。</p>':''}<div class="entry-icons"><span>🎒 六個學期</span><span>🎮 課間小遊戲</span><span>🎓 我的學生證</span></div></section></div><section class="landing-cards"><article><img src="/assets/scenes/rooftop.svg" alt="校園屋頂"><div><h3>意外，也是青春的一部分</h3><p>每個選擇，留下不同的自己。</p></div></article><article><img src="/assets/scenes/stage.svg" alt="社團舞臺"><div><h3>下課，換你的主場</h3><p>追劇、歌單、動漫與一點小挑戰。</p></div></article><article><img src="/assets/scenes/library.svg" alt="圖書館"><div><h3>把理想放進下一站</h3><p>你的名字，值得一張新的學生證。</p></div></article></section><div class="university-strip">${catalog.universities.slice(0,10).map(u=>`<div>${crest(u)}<span>${u.name}</span></div>`).join('')}</div>`;}
function enrolledView(){return shell(`${heading('新生入學通知','你分到這所高中')}<article class="enrollment-card"><div class="enrollment-cover"><img src="/assets/campus-summer-v4.png" alt="新學期校園"><span>${state.school.type} · ${state.school.area} · ${"★".repeat(state.school.tier)}</span></div><div class="enrollment-body"><span class="eyebrow">WELCOME, ${esc(state.name)}</span><h2>${state.school.name}</h2><p>${state.school.feature}</p>${extraDie()?'<p class="school-perk">🎲 隱藏技能解鎖：每學期多擲 1 顆骰子</p>':''}<div class="initial-stats">${state.attrs.map((v,i)=>`<div><span>${ATTR[i]}</span><b>${v}</b></div>`).join('')}</div>${button('開始第一學期 →','enter-school')}</div></article>`,0);}
function semesterStrip(step){return `<div class="round-label"><span>${state.round+1} / 6 學期</span></div><div class="play-steps">${['學期問答','突發事件','分配點數','課間小遊戲'].map((x,i)=>`<span class="${i===step?'active':i<step?'done':''}"><b>${i<step?'✓':i+1}</b>${x}</span>`).join('')}</div>`;}
function roundView(){return shell(`${heading(termName()+' / 新學期','開始新學期')}${semesterStrip(0)}<div class="semester-intro"><img src="/assets/scenes/${['rooftop','baseball','library','stage','lab','rain'][state.round]}.svg" alt="學期校園場景"><div><h2>先完成兩題學期問答</h2>${button('開始問答（2 題） →','start-term')}</div></div>`,1);}
function paperView(){
 const p=state.paper,i=p.index,q=p.questions[i],a=p.answers[i],n=p.questions.length,review=p.reviews?.[i];
 const timed=timedChoice(p,q),locked=!!review||timed&&p.elapsed?.[i]!=null;
 if(timed&&!locked&&!p.clockStart){p.clockStart=Date.now();save();}
 const countdown=timed&&!locked?`<p class="exam-clock"><strong id="question-clock">剩 ${Math.max(0,Math.ceil((p.clockStart+choiceLimit(q)-Date.now())/1000))} 秒</strong><small>按「確認答案」才停止計時</small></p>`:'';
 let body;
 if(review){
  const status=timed&&a===null?'時間到':review.correct?'✓ 答對':review.fraction>0?'◐ 部分答對':'✗ 答錯';
  const given=a==null?'未作答':Array.isArray(a)?q.left.map((label,j)=>label+' → '+q.options[a[j]]).join('；'):q.type==='choice'?q.options[a]:a;
  body=`<section class="answer-result ${review.correct?'good':'bad'}" role="status"><strong>${status}</strong>
   ${!review.correct?`<p>你的答案　${esc(given)}</p>`:''}
   <p>正確答案　${esc(solution(q,review.answer))}</p>
   <small>${esc(review.explanation)}${review.points!=null?' · 本題 '+review.points+' / 5 分':''}</small></section>`;
 }else if(q.type==='choice'){
  body=`<div class="answers">${q.options.map((s,j)=>`<button class="answer ${a===j?'selected':''}" data-action="answer" data-id="${j}" aria-pressed="${a===j}" ${locked?'disabled':''}><b>${'ABCD'[j]}</b><span>${esc(s)}</span><i>${a===j?'✓':'○'}</i></button>`).join('')}</div>`;
 }else if(q.type==='fill'){
  body=`<div class="fill-task"><label for="short-answer">你的答案</label><input id="short-answer" maxlength="80" autocomplete="off" spellcheck="false" value="${esc(a||'')}" placeholder="填入一個詞、人名或數字…"></div>`;
 }else{
  body=`<p class="answer-help">逐列選答案，每個選項只能用一次。</p><div class="matching-paper">${q.left.map((s,j)=>`<div class="match-row"><span><b>${j+1}</b>${esc(s)}</span>${customSelect('match-'+j,a[j]===null?'':String(a[j]),[{value:'',label:'選擇搭檔'},...q.options.map((r,k)=>({value:String(k),label:r}))],'配對：'+s)}</div>`).join('')}</div>`;
 }
 const next=review?(i===n-1?(p.mode==='term'?'查看學期事件 →':'查看成績 →'):'下一題 →'):'確認答案 →';
 return shell(`${heading(MODE[p.mode]+' · 第 '+(i+1)+' / '+n+' 題',p.mode==='term'?'學期問答':'考試作答')}
  <article class="exam-paper"><div class="tags"><span>${q.examSubject}</span><span>${q.theme}</span><span>${{choice:'選擇',match:'配對',fill:'填答'}[q.type]}</span></div>
  <h2>${esc(q.text)}</h2>${countdown}${body}</article>
  <div class="question-nav"><span>${review?'本題已公布解答':'選好後確認答案'}</span>${button(next,'next','primary',(locked||answerReady(q,a))?'':'disabled')}</div>`,p.mode==='term'?1:2);
}
function solution(q,key){if(q.type==='choice')return q.options[Number(key)];if(q.type==='fill')return key.split('/')[0];return key.split(',').map((v,i)=>q.left[i]+' → '+q.options[Number(v)]).join('；');}
function reviewView(paper,result){return `<details class="panel review"><summary>看看答案與解析</summary>${paper.questions.map((q,i)=>`<div class="review-item"><span class="${result.review[i].correct?'good':'bad'}">${result.review[i].correct?'✓ 正確':result.review[i].fraction>0?'◐ 部分答對':'✗ 答錯'} · ${q.examSubject}</span><h3>${esc(q.text)}</h3><p>${esc(solution(q,result.review[i].answer))}</p>${result.review[i].points!=null?`<small>限時作答得分：${result.review[i].points} / 5</small>`:''}<small>${esc(result.review[i].explanation)}</small></div>`).join('')}</details>`;}
function eventView(){
 const e=state.event;
 const changes=e.delta.map((v,i)=>v?`<span class="${v>0?'good':'bad'}">${ATTR[i]} ${v>0?'＋':'−'}${Math.abs(v)}</span>`:'').join('');
 return shell(`${heading(termName(),'學期突發事件')}${semesterStrip(1)}
  <section class="event-card"><img src="${e.image}" alt="校園事件插畫"><div class="event-content">
   <h2>${esc(e.title)}</h2><p>${esc(e.story)}</p><div class="event-changes">${changes||'<span>能力持平</span>'}</div>
   ${button('擲骰並分配點數 →','event-continue')}
  </div></section><div class="semester-score"><span>學期問答 <b>${state.lastRound.correct} / 2</b></span><span>學期成績 <b>${state.lastRound.total}</b></span></div>${rewardNotice(state.lastRound.rewards)}${penaltyNotice(state.lastRound.penalties)}`,1);
}
function die(v){const dots={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};return `<div class="die" role="img" aria-label="${v}點">${Array.from({length:9},(_,i)=>`<i class="${dots[v].includes(i+1)?'pip':''}"></i>`).join('')}<b class="chip-value" aria-hidden="true">${v}</b></div>`;}
function diceView(){const done=state.dieIndex>=state.dice.length,v=state.dice[state.dieIndex];return shell(`${heading('分配能力點數',done?'點數已分配完畢':`第 ${state.dieIndex+1} 顆：${v}點加在哪裡？`)}${semesterStrip(2)}<div class="dice-tray" data-seven="${state.dice.length===7}">${state.dice.map((n,i)=>`<div class="die-slot ${i<state.dieIndex?'spent':i===state.dieIndex?'active':''}">${die(n)}<small>${i<state.dieIndex?ATTR[state.assignments[i].attr]+'＋'+state.assignments[i].added:i===state.dieIndex?'現在分配':extraDie()&&i===state.dice.length-1?'額外骰':'第'+(i+1)+'顆'}</small></div>`).join('')}</div>${done?`<div class="button-row end">${button('開始課間小遊戲 →','start-game')}</div>`:`<div class="allocate-grid">${ATTR.map((a,i)=>`<button class="allocate-card" data-action="assign" data-id="${i}" ${state.attrs[i]===100?'disabled':''}><span>${['🧪','📖','🌏','🎨','🎵'][i]} ${a}</span><div><b>${state.attrs[i]}</b><strong>＋${Math.min(v,100-state.attrs[i])}</strong></div><div class="meter"><i style="width:${state.attrs[i]}%"></i></div><small class="${state.attrs[i]+v>100?'allocation-limit':''}">${state.attrs[i]===100?'已滿級':state.attrs[i]+v>100?'加至100':'點一下加點'}</small></button>`).join('')}</div>${state.attrs.every(n=>n===100)?button('全滿級，繼續 →','full-dice','secondary'):''}`}`,1);}
function gameView(){const g=state.game;let content='';if(g.done)content=`<div class="game-result"><span>課間小遊戲結果</span><strong>${g.score}<small> / 100</small></strong><h2>${g.failed?'挑戰失敗':g.type==='luck'?'第 '+(g.puzzle.picked+1)+' 袋開獎！':'過關了！'}</h2><p>${ATTR[g.attr]} ${g.bonus>=0?'＋':'−'}${Math.abs(g.bonus)}${g.mistakes&&!g.failed?'（失誤後獎勵降低）':''} · 學習歷程 ＋${g.portfolioBonus}</p>${button(state.round===4?'前往學測 →':state.round===5?'選擇升學管道 →':'下一學期 →','next-round')}</div>`;else if(['match','swatch'].includes(g.type))content=`<p class="game-instruction">${({lyrics:'把歌詞配到歌名。',singer:'把歌名配到演唱者。','lyric-artist':'把歌詞配到演唱者。',emoji:'把表情符號配到片名。'})[g.id]||'先選左邊，再找到右邊的搭檔。'}</p><div class="game-status"><span>${g.matched.length} / ${g.pairs.length} 完成</span></div><div class="pair-board"><div>${g.pairs.map((p,i)=>`<button class="pair-card ${g.selected===i?'selected':''} ${g.matched.includes(i)?'matched':''}" data-action="pair-left" data-id="${i}" ${g.matched.includes(i)?'disabled':''}>${g.type==='swatch'?`<span class="brand-palette" role="img" aria-label="第${i+1}組${g.id==='flags'?'國旗':'品牌'}色塊">${p[2].map(c=>`<i style="background:${c}"></i>`).join('')}</span>`:`<b>${i+1}</b><span>${esc(p[0])}</span>`}${g.matched.includes(i)?'✓':''}</button>`).join('')}</div><span class="pair-arrows">↔</span><div>${g.right.map((s,i)=>{const hit=g.pairs.some((p,j)=>p[1]===s&&g.matched.includes(j));return `<button class="pair-card ${hit?'matched':''}" data-action="pair-right" data-id="${i}" ${hit?'disabled':''}>${esc(s)}${hit?' ✓':''}</button>`;}).join('')}</div></div>`;else if(g.type==='memory')content=`<p class="game-instruction">${g.preview?'先看牌的位置，再開始翻牌。':'一次翻兩張，找出相同的圖案。'}</p><div class="game-status"><span>${g.found.length/2} / ${g.cards.length/2} 組</span></div><div class="memory-grid">${g.cards.map((s,i)=>`<button class="memory-card ${g.preview||g.faceUp.includes(i)||g.found.includes(i)?'flipped':''} ${g.found.includes(i)?'found':''}" data-action="memory-card" data-id="${i}" aria-label="第${i+1}張牌${g.preview||g.faceUp.includes(i)||g.found.includes(i)?' '+s:''}" ${g.found.includes(i)||g.faceUp.includes(i)?'disabled':''}>${g.preview||g.faceUp.includes(i)||g.found.includes(i)?s:'✦'}</button>`).join('')}</div>${g.preview?button('記好了，開始翻牌 →','memory-ready','primary'):''}${g.faceUp.length===2?button('再翻兩張 →','memory-again','secondary'):''}`;else if(g.type==='order')content=`<p class="game-instruction">從最早到最晚，把事件排好。</p><div class="game-status"><span>${g.ordered.length} / ${g.items.length}</span></div><div class="timeline-tiles">${g.tiles.map((x,i)=>button((g.ordered.includes(x[0])?'✓ ':'')+esc(x[0]),'order-tile','secondary',`data-id="${i}" ${g.ordered.includes(x[0])?'disabled':''}`)).join('')}</div>`;else if(g.puzzle)content=puzzleBoard(g.puzzle);else if(g.type==='spot')content=`<p class="game-instruction">連過三題，找出和其他格不一樣的顏色。</p><div class="spot-grid">${Array.from({length:25},(_,i)=>`<button data-action="spot-tile" data-id="${i}" style="background:${g.colors[i===g.odd?1:0]}" aria-label="第${i+1}個色塊"></button>`).join('')}</div><p class="spot-progress">第 ${g.index+1} / 3 題 · 越後面越接近</p>`;return shell(`${heading('下課時間',esc(g.name))}${semesterStrip(3)}<section class="game-panel">${g.type==='luck'?'':mistakeBadge(g)}${content}</section>${g.done?'':`<div class="button-row end">${button('跳過本次（能力 −4）','skip-game','text-button')}</div>`}`,1);}
function examSelectView(split=false){const names=split?SPLIT:GSAT,selected=split?state.splitSubjects:state.gsatSubjects;return shell(`${heading(split?'分科測驗':'學科能力測驗','選擇考科','勾選要考的科目，再按「開始考試」。')}<div class="exam-count"><b>${selected.length*3}</b><span>題考卷 <small>每考科3題</small></span></div><section class="exam-paper"><div class="subject-checks">${names.map(s=>`<label class="${selected.includes(s)?'selected':''}"><input name="exam-subject" type="checkbox" value="${s}" ${selected.includes(s)?'checked':''}><b>${s}</b><small>最高 ${split?60:15} 級分</small></label>`).join('')}</div><details class="rules"><summary>科系採計參考</summary><div class="requirement-list">${Array.from(new Map(programs.map(p=>[p.subjects.join(',')+'|'+p.split.join(','),p])).values()).map(p=>`<div><span>${split?p.split.join('、'):p.subjects.join('、')}</span><small>例如 ${p.universityName} ${p.name}</small></div>`).join('')}</div></details></section><div class="button-row end exam-start">${button('開始考試 →',split?'start-split':'start-gsat','primary',selected.length?'':'disabled')}</div>`,2);}
function scoreTiles(scores,max=15){return `<div class="subject-grid major-scores">${Object.entries(scores).map(([s,v])=>`<div><span>${s}</span><b>${v}</b><small>／${max}級分</small></div>`).join('')}</div>`;}
function reportStats(){
 const score=state.schoolScore??(state.history.length?calculateSchoolScore():0);
 const rank=state.rank??100;
 return `<section class="report-summary"><div class="report-highlight"><span>${state.round<5?'暫定在校排名':'在校排名'}</span><strong>前 ${rank}<small>%</small></strong><div class="rank-line"><i style="width:${100-rank}%"></i></div></div>
  <div><span>在校成績</span><b>${fmt(score)}</b><small>學期成績 85% · 起始資質 15%</small></div>
  <div><span>目前資質</span><b>${traitScore()}</b><small>能力與起始資質綜合</small></div>
  <div><span>學習歷程</span><b>${state.portfolio}</b><small>／100</small></div></section>`;
}
function aptitudeAdjustments(scores,rawScores){
 if(!rawScores)return '';
 const changed=Object.keys(scores).filter(subject=>scores[subject]!==rawScores[subject]);
 return `<details class="rules"><summary>級分與資質調整</summary>
  <p>各科依相關資質和能力最多微調 1 級分。加分最高到 14 級分。</p>
  ${changed.length?`<ul>${changed.map(subject=>`<li>${esc(subject)} ${rawScores[subject]} → ${scores[subject]} 級分</li>`).join('')}</ul>`:'<p>本次各科級分維持原始成績。</p>'}
 </details>`;
}
function examResultView(split=false){const scores=split?state.division:state.gsat,record=split?state.splitRecord:state.gsatRecord;return shell(`${heading(MODE[split?'split':'gsat']+' / 成績單','你的考試成績')}${scoreTiles(scores,split?60:15)}${aptitudeAdjustments(scores,record.result.rawScores)}${reportStats()}${penaltyNotice(record.result.penalties)}<div class="button-row end">${button(split?'選填分發志願 →':'繼續最後一學期 →',split?'open-distribution':'continue-senior')}</div>${reviewView(record.paper,record.result)}`,2);}
function routesView(){return shell(`${heading('我的升學檔案','查看成績並選擇管道')}${reportStats()}<div class="section-title"><h2>學測成績</h2><span>${Object.keys(state.gsat).length} 科</span></div>${scoreTiles(state.gsat)}<div class="section-title"><h2>選擇升學管道</h2></div><div class="route-grid">${[['star','繁星推薦','在校成績 75%・學測 25%。一校一類組，最多三系。','🌟'],['apply','個人申請','依照興趣與專長，最多三個科系。','📒']].map(([r,t,desc,icon],i)=>`<article class="route-card"><span class="route-icon">${icon}</span><h2>${t}</h2><p>${desc}</p>${button('選擇此管道 →',r==='distribution'?'prepare-split':'choose-route',i===1?'primary':'secondary',`data-route="${r}" ${(r==='star'&&(state.rank>50||state.starUsed)||r==='apply'&&applicationClosed())?'disabled':''}`)}</article>`).join('')}</div>`,3);}
function preferences(max){
 const ids=state.preferences;
 return `<aside class="preferences" id="preferences-panel" aria-label="我的志願清單">
  <div class="preference-heading"><h3>我的志願序</h3><b>${ids.length} / ${max}</b></div>
  ${button('送出志願 →','submit-universities','primary wide',ids.length?'':'disabled')}
  ${ids.length>1?'<p class="preference-hint" id="preference-hint">按住 ≡ 拖曳排序</p>':''}
  <ol id="preference-order">${ids.map((id,i)=>{
   const p=programs.find(x=>x.id===id);
   return `<li data-preference-id="${id}"><b data-rank>${i+1}</b>
    <div><strong>${p.universityName}</strong><small>${p.name}</small></div>
    <div class="preference-controls">
     ${ids.length>1?`<button type="button" class="preference-handle" aria-label="調整${esc(p.name)}的志願順序" aria-describedby="preference-hint" aria-keyshortcuts="ArrowUp ArrowDown Home End" title="拖曳排序，或用上下方向鍵">≡</button>`:''}
     <button data-action="remove" data-id="${id}">移除</button>
    </div></li>`;
  }).join('')}</ol>
  ${ids.length?'':'<div class="empty-note">＋<br>請從校系列表加入志願。</div>'}
  <small class="tiny-note">機會也會受到科系資質影響。</small>
 </aside>`;
}
function starSchoolResults(){const list=sortedOptions(catalog.universities.filter(u=>searchKey(u.name+u.realName+u.abbr).includes(searchKey(filter.search))),u=>Math.max(...programs.filter(p=>p.university===u.id).map(admissionEstimate)));return `${list.map(u=>`<button class="university-choice" data-action="star-school" data-id="${u.id}">${crest(u)}<h3>${u.name}</h3><span>${u.type}</span><small class="school-chance">最高預估 ${fmt(Math.max(...programs.filter(p=>p.university===u.id).map(admissionEstimate)))}%</small></button>`).join('')}`;}
function starSchoolView(){return `${heading('繁星推薦 / 先選大學','選擇一所大學','台清交成政限校排前 20%，中字輩限前 30%。')}<div class="star-process"><span class="current">1 選大學</span><span>2 選類組</span><span>3 排三系</span></div><label class="search-field school-search"><span>⌕</span><input id="catalog-search" placeholder="搜尋大學…" value="${esc(filter.search)}" aria-label="搜尋大學"></label><div class="sort-toolbar">${sortSelect()}</div><div class="university-grid" id="catalog-results">${starSchoolResults()}</div>`;}
const ADMISSION_TIERS={
 medical:'醫牙挑戰',pharmacy:'藥學挑戰',top:'台清交成政',midTech:'中字輩電資',
 midOther:'中字輩其他',public:'其他國立',privateTech:'私立電資',private:'私立其他',
};
function admissionReferenceView(reference){
 if(!reference)return '';
 const channel=reference.channel==='tech'?'四技二專聯登':'大學分發';
 const scope=reference.scope==='program'?'同系組':'同校';
 return `<a href="${esc(reference.source)}" target="_blank" rel="noopener noreferrer">${reference.year} 學年度${channel}參考（${scope}）↗</a>`;
}
function programResults(list){const max=state.route==='distribution'?10:3;return `${list.map(p=>{const u=university(p.university),chance=admissionEstimate(p),ok=eligibility(p),added=state.preferences.includes(p.id);return `<article class="school-card"><div class="program-school">${crest(u)}<div><span class="dept-group">${catalog.groups[p.group]}${p.college?' · '+p.college:''}</span><h3>${p.universityName}</h3><b class="dept-name">${p.name}</b><p>採計 ${required(p).join('、')}</p><small class="admission-gate">${state.route==='star'?'繁星校排須達前 '+starRankLimit(p)+'%':`${ADMISSION_TIERS[p.selectivity]} · 考試折算≥${state.route==='apply'?screeningFloor(p):isArtsUniversity(u.id)?Math.min(p.examFloor,55):p.examFloor}${state.route==='apply'?' · 個申一階': ' / 資質≥'+(isArtsUniversity(u.id)?Math.max(p.talentFloor,58):p.talentFloor)}${isArtsUniversity(u.id)?' · 採藝術／音樂資質':''}`}</small></div></div><div class="program-fit"><span>預估錄取率</span><b class="${chance>=65?'good':chance<25?'bad':'medium'}">${fmt(chance)}<small>%</small></b><small>資質 ${fmt(aptitudeScore(p))}</small>${button(added?'已加入 ✓':'＋ 加入','add','secondary',`data-id="${p.id}" ${!ok||added||state.preferences.length>=max?'disabled':''}`)}</div>${!ok?'<span class="eligibility-note">缺少採計科目或排名未達門檻</span>':''}<details class="source-detail"><summary>校系資料</summary><span>${p.realName} · ${p.name}</span><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">官方設系來源 ↗</a>${admissionReferenceView(p.admissionReference)}${p.applyReference?`<a href="${esc(p.applyReference.source)}" target="_blank" rel="noopener noreferrer">115 個申一階參考：${esc(p.applyReference.note)} ↗</a>`:''}</details></article>`;}).join('')||'<div class="panel empty-note">沒有符合條件的科系，試著調整篩選。</div>'}`;}
function universitiesView(){
 const star=state.route==='star',distribution=state.route==='distribution',max=distribution?10:3;
 const routeReturn=distribution?'':`<div class="route-return">${button('← 返回升學管道','back-routes','secondary')}</div>`;
 if(star&&!state.starSchool)return shell(routeReturn+starSchoolView(),3);
 let candidates=programs,starHeader='';if(star){const u=university(state.starSchool),groups=[...new Set(programs.filter(p=>p.university===u.id).map(p=>p.group))].sort();starHeader=`<div class="star-school-heading">${crest(u)}<div><h2>${u.name}</h2><span>${u.type}</span></div>${button('更換大學','change-star-school','text-button')}</div><div class="group-chips">${groups.map(g=>`<button class="${state.starGroup===g?'selected':''}" data-action="star-group" data-id="${g}">${catalog.groups[g]}</button>`).join('')}</div>`;if(!state.starGroup)return shell(`${routeReturn}${heading('繁星推薦 / 選擇類組','選擇一個類組')}${starHeader}`,3);candidates=programs.filter(p=>p.university===u.id&&p.group===state.starGroup);}const list=filtered(candidates);return shell(`${routeReturn}${heading(routeName(state.route)+' / 志願選填',star?'加入科系並排列志願':'加入科系並排列志願')}${starHeader}${star?`<div class="sort-toolbar">${sortSelect()}</div>`:filters()}<div class="catalog-layout">${preferences(max)}<div class="school-list" id="catalog-results">${programResults(list)}</div></div>${state.preferences.length?button('志願 '+state.preferences.length+' / '+max+' · 查看與提交 ↑','review-preferences','mobile-preferences-link'):''}<details class="rules"><summary>錄取率怎麼算？</summary><p>繁星以在校成績占 75%、學測占 25%，另設校排門檻。個申採學測、科系資質與面試，分發採考試與科系資質。後兩者的門檻依難度分層，並參考115學年度公開分發成績。一般大學和四技分數各自換算。個申錄取率為面試前估計，第一階段僅看學測。這是遊戲模型，非真實招生落點。每個種子與校系的抽選固定，重新整理不會重抽。</p></details>${distribution?`<div class="button-row">${button('選擇重考','retake','text-button')}</div>`:''}`,3);}
function applyScreenView(){
 const application=state.application;
 const safety=programs.find(p=>p.id===application.safety);
 return shell(`${heading('個人申請 / 第一階段','學測篩選結果')}
  <section class="panel">${application.screening.map(row=>{
   const p=programs.find(p=>p.id===row.id);
   return `<div class="review-item"><h3>${p.universityName} · ${p.name}</h3>
    <p class="${row.accepted?'good':'bad'}">${row.reason} · 你的學測折算 ${row.score} · 門檻 ${row.floor} · ${p.applyReference?'115 一階資料折算':'遊戲估算'}</p></div>`;
  }).join('')}
  ${safety?`<p>滿級分備用校系：${safety.universityName} · ${safety.name}。完成面試後，僅在原志願都未錄取時提供。</p>`:''}</section>
  <div class="button-row end">${button(interviewComplete()?'查看錄取結果 →':'開始面試小遊戲 →','enter-interview')}</div>`,3);
}
function interviewView(){
 const {games,index,replaced}=state.interview;
 if(!games||games.every(g=>g.done)&&games.some(g=>RETIRED_GAMES[g.type]))return shell(`${heading('個人申請','面試已完成')}
  <div class="button-row end">${button('查看錄取結果 →','enter-interview')}</div>`,3);
 const g=games[index],last=index===games.length-1;
 return shell(`${heading('個申二階 · 第 '+(index+1)+' / '+games.length+' 關',PUZZLE_NAMES[g.type]||(g.type==='football'?'足球攻防':PUZZLE_NAMES[RETIRED_GAMES[g.type]]))}
  <article class="exam-paper interview-paper"><div class="interview-banner">
   <p>${replaced&&index===0?'新版面試改為三個小遊戲，請從第一關開始。':'三關都玩完，就能看錄取結果。'}</p>
   <img src="/assets/scenes/interview.svg" alt="" width="176" height="108">
  </div>
  ${mistakeBadge(g)}
  ${g.done?`<div class="puzzle-result" role="status"><strong>${g.failed?'本關結束':'過關了！'}</strong><span>本關表現 ${g.score} / 100</span></div>`
   +button(last?'查看錄取結果 →':'下一關 →','interview-next'):puzzleBoard(g)}
  </article>`,3);
}
function admissionView(){const a=state.admission,p=a.accepted?historicalProgram(a.program):null,u=p?university(p.university):null;return shell(`${heading('放榜日',p?'錄取了！':'本次沒有錄取')}${p?`<article class="letter admission-color" style="--school-color:${u.color}">${crest(u,'letter-crest')}<span class="accept-label">ADMITTED</span><h2>${p.universityName}</h2><h3>${p.name}</h3><p>${esc(state.name)} 同學，恭喜！</p><small>${a.safety?'滿級分備用校系':'第 '+a.preference+' 志願'} · ${routeName(state.route)}</small>${button('接受錄取 →','accept')}</article>`:''}<details class="panel review" ${p?'':'open'}><summary>本次志願結果</summary>${a.results.map(r=>{const p=historicalProgram(r.id);return `<div class="review-item"><h3>${p.universityName} · ${p.name}</h3><p>${r.reason}${r.floor!=null?' · 學測折算 '+r.score+' / '+r.floor:' · 預估機會 '+fmt(r.chance)+'%'}${r.interview!=null?' · 面試 '+r.interview+' 分':''}</p></div>`;}).join('')}</details><div class="button-row">${state.route==='star'&&!a.accepted?button('改走個人申請 →','failed-star-apply','secondary'):''}${state.route==='distribution'&&!a.accepted?button('調整志願','revise','secondary'):''}${state.route!=='distribution'?button(p?'放棄錄取，改考分科':'參加分科測驗 →','prepare-split','secondary'):''}${button('選擇重考','retake','text-button')}</div>`,3);}
function studentCard(){const p=admittedProgram(),u=university(p.university);return `<div class="student-card" id="student-card" style="--school-color:${u.color};--school-accent:${u.accent}"><div class="card-school">${crest(u,'card-crest')}<div><h2>${p.universityName}</h2><small>學生證 / STUDENT ID</small></div><span class="card-chip">▤</span></div><div class="card-content"><img class="card-portrait" id="card-portrait" src="${state.photo||defaultPortrait()}" alt="${esc(state.name)}的學生證頭貼"><div class="card-info"><span>學生姓名 / NAME</span><h3>${esc(state.name)}</h3><span>錄取學系 / DEPARTMENT</span><strong>${p.name}</strong><span>學號 / STUDENT NO.</span><b class="student-number">${state.studentId}</b></div></div><div class="card-bottom"><span>準大學生 · ${routeName(state.route)}</span><span>LeleHuang / 遊戲紀念卡</span></div></div>`;}
function endingView(){const p=admittedProgram(),title=p?'準大學生':'重考生結局';return shell(`${heading('遊戲結局',title)}${p?studentCard():`<div class="retake-illustration"><img src="/assets/scenes/rooftop.svg" alt="等待下一次出發的校園"><h2>重考生 · 再準備一次</h2></div>`}${p?`<div class="photo-actions">${button('上傳自己的照片','upload-photo','secondary')}${state.photo?button('恢復預設頭貼','reset-photo','text-button'):''}<small>照片只存於此瀏覽器</small></div>`:''}${state.newAchievements?.length?`<section class="unlocked-banner"><span>✦ 解鎖新成就</span><div>${state.newAchievements.slice(0,5).map(id=>{const a=ACHIEVEMENTS.find(x=>x[0]===id);
 const retired=id.startsWith('campus-')?university(id.slice(7)):null;
 return a?`<b>${a[3]} ${esc(a[1])}</b>`:retired?`<b>🏫 入學信・${esc(retired.name)}</b>`:'';}).join('')}</div></section>`:''}<article class="panel evaluation"><span class="eyebrow">寫給你的畢業評語</span><p>${esc(evaluation())}</p></article><section class="panel"><h3>這趟旅程的成長</h3>${attrBars()}</section><div class="button-row end">${p?button('下載學生證 PNG ↓','download-card'):''}${button('查看校系圖鑑','open-collection','secondary')}${button('下載旅程紀念冊','download-story','secondary')}${button('開始新遊戲','restart','text-button')}</div>`,4);}
function render(){if(!catalog)return;openSelect=openSelect||null;$('#restart-button').hidden=!state||collectionOpen;$('#achievement-button').textContent='成就 '+ACHIEVEMENTS.filter(([id])=>achievements[id]).length+'/'+ACHIEVEMENTS.length;if(collectionOpen){app.innerHTML=collectionView();return;}if(welcome||!state)app.innerHTML=welcomeView();else{const views={enrolled:enrolledView,round:roundView,quiz:paperView,event:eventView,dice:diceView,game:gameView,gsatSelect:()=>examSelectView(),splitSelect:()=>examSelectView(true),gsatResult:()=>examResultView(),splitResult:()=>examResultView(true),routes:routesView,universities:universitiesView,applyScreen:applyScreenView,interview:interviewView,admissionResult:admissionView,ending:endingView};if(!views[state.stage]){welcome=true;app.innerHTML=welcomeView();return;}app.innerHTML=views[state.stage]();const slider=app.querySelector('.stack-slider');if(slider)animateStack(slider);const clock=$('#relay-clock');if(clock)animateRelay(clock);}}
async function action(a,b){
 if(a==='open-collection'){openCollection();return;}
 if(a==='close-collection'){closeCollection();return;}
 if(a==='review-preferences'){$('#preferences-panel')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});app.querySelector('[data-action="submit-universities"]')?.focus({preventScroll:true});return;}
 if(a==='resume'){welcome=false;openSelect=null;render();return;}
 if(a==='restart'){confirmAction('開始另一段青春？','目前旅程將由新故事取代，已解鎖的成就會保留。',()=>{state=null;welcome=true;pendingSeed=randomSeed();saveStore(KEY,null);openSelect=null;render();});return;}
 if(a==='toggle-select'){openSelect=openSelect===b.dataset.key?null:b.dataset.key;render();return;}
 if(a==='select-option'){chooseSelect(b.dataset.key,b.dataset.value);return;}
 if(a==='answer'){
  const p=state.paper,q=p.questions[p.index];
  if(timedChoice(p,q)&&(p.elapsed[p.index]!=null||Date.now()-p.clockStart>=choiceLimit(q))){
   updatePaperClock();
   return;
  }
  p.answers[p.index]=Number(b.dataset.id);
  save();render();
 }
 else if(a==='next'){
  const p=state.paper,i=p.index,q=p.questions[i];
  if(timedChoice(p,q)&&p.elapsed[i]==null){
   const limit=choiceLimit(q),elapsed=Math.max(0,Date.now()-p.clockStart);
   if(elapsed<limit&&!answerReady(q,p.answers[i]))return;
   p.elapsed[i]=Math.min(elapsed,limit);
   if(elapsed>=limit)p.answers[i]=null;
   save();
  }
  if(!paperReady(p,i))return;
  openSelect=null;
  if(!p.reviews?.[i]){await revealAnswer(p);return;}
  if(i===p.questions.length-1)await submitPaper();
  else{p.index++;delete p.clockStart;go('quiz');}
 }
 else if(a==='enter-school')go('round');
 else if(a==='start-term')await startPaper('term');
 else if(a==='event-continue')roll();
 else if(a==='assign')assign(Number(b.dataset.id));
 else if(a==='full-dice'){if(state.attrs.every(n=>n===100)){while(state.dieIndex<state.dice.length){state.assignments.push({attr:0,added:0});state.dieIndex++;}save();render();}}
 else if(a==='start-game')startGame();
 else if(a==='skip-game'){finishGame(0,true);window.scrollTo({top:0,behavior:'instant'});}
 else if(a.startsWith('puzzle-')&&state.stage==='interview'){
  puzzleAction(state.interview.games[state.interview.index],a,Number(b.dataset.id));save();render();
 }
 else if(a.startsWith('puzzle-')||['pair-left','pair-right','memory-card','memory-ready','memory-again','order-tile','spot-tile'].includes(a)){
  const {index,done}=state.game;
  miniAction(a,Number(b.dataset.id));
  if(matchMedia('(max-width:760px)').matches&&(state.game.index!==index||state.game.done!==done)){
   window.scrollTo({top:0,behavior:'instant'});
  }
 }
 else if(a==='next-round'){if(!state.game?.done)return;if(state.round===4){state.gsatSubjects=['國文','英文','數學B','社會'];go('gsatSelect');}else if(state.round===5)go('routes');else{state.round++;resetRound();go('round');}}
 else if(a==='start-gsat')await startPaper('gsat',state.gsatSubjects);
 else if(a==='start-split')await startPaper('split',state.splitSubjects);
 else if(a==='continue-senior'){state.round=5;resetRound();go('round');}
 else if(a==='open-distribution')setRoute('distribution');
 else if(a==='choose-route')setRoute(b.dataset.route);
 else if(a==='back-routes')go('routes');
 else if(a==='prepare-split')prepareSplit();
 else if(a==='star-school'){state.starSchool=b.dataset.id;state.starGroup=null;state.preferences=[];const sort=filter.sort;resetFilters();filter.sort=sort;save();render();}
 else if(a==='star-group'){if(state.starGroup!==Number(b.dataset.id))state.preferences=[];state.starGroup=Number(b.dataset.id);save();render();}
 else if(a==='change-star-school'){state.starSchool=null;state.starGroup=null;state.preferences=[];resetFilters();save();render();}
 else if(a==='add'){const p=programs.find(x=>x.id===b.dataset.id),max=state.route==='distribution'?10:3;if(p&&eligibility(p)&&state.preferences.length<max&&!state.preferences.includes(p.id)){if(state.route==='star'&&(p.university!==state.starSchool||p.group!==state.starGroup))return;state.preferences.push(p.id);save();render();}}
 else if(a==='remove'){state.preferences=state.preferences.filter(id=>id!==b.dataset.id);save();render();}
 else if(a==='submit-universities')await submitUniversities();
 else if(a==='enter-interview'){
  if(interviewComplete())await finishInterview();
  else go('interview');
 }
 else if(a==='interview-next'){
  const interview=state.interview;
  if(!interview.games[interview.index].done)return;
  if(interviewComplete())await finishInterview();
  else{interview.index++;go('interview');}
 }
 else if(a==='failed-star-apply')setRoute('apply');
 else if(a==='revise'&&state.route==='distribution')setRoute('distribution');
 else if(a==='accept')finishEnding('admitted');
 else if(a==='retake')confirmAction('選擇重新準備？','這輪會以重考生結局結束，旅程與解鎖成就仍會留下。',()=>finishEnding('retake'));
 else if(a==='upload-photo')$('#photo-input').click();
 else if(a==='reset-photo'){delete state.photo;save();render();}
 else if(a==='download-card')await downloadCard();
 else if(a==='download-story')downloadStory();
}
app.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled||busy)return;const a=b.dataset.action,asyncAction=['next','start-term','start-gsat','start-split','submit-universities','enter-interview','interview-next','download-card'].includes(a);try{if(asyncAction){busy=true;b.disabled=true;}await action(a,b);}catch(error){toast(error.name==='AbortError'?'連線逾時，請再試一次。':error.message);render();}finally{busy=false;if(b.isConnected&&asyncAction)b.disabled=false;}});
app.addEventListener('submit',async e=>{if(e.target.id!=='start-form')return;e.preventDefault();if(busy)return;const name=$('#player-name').value.trim(),seed=$('#seed-input').value;if(!name)return;const run=async()=>{busy=true;const b=$('#start-form button');b.disabled=true;try{await startRun(name,seed,new FormData($('#start-form')).get('gender'),new FormData($('#start-form')).get('schoolType'));}catch(error){toast(error.message);render();}finally{busy=false;if(b.isConnected)b.disabled=false;}};if(state)confirmAction('開始新的旅程？','目前的旅程會被新故事取代，已解鎖成就保留。',run);else await run();});
let preferenceDrag=null;
function renumberPreferences(list){
 [...list.children].forEach((row,i)=>row.querySelector('[data-rank]').textContent=i+1);
}
function savePreferenceOrder(list){
 const next=[...list.children].map(row=>row.dataset.preferenceId);
 if(next.join(',')===state.preferences.join(','))return false;
 state.preferences=next;
 save();
 return true;
}
function moveDraggedRow(){
 const {list,row,y}=preferenceDrag;
 const next=[...list.children].find(item=>{
  if(item===row)return false;
  const box=item.getBoundingClientRect();
  return y<box.top+box.height/2;
 });
 if(row.nextElementSibling===(next??null))return;
 list.insertBefore(row,next??null);
 renumberPreferences(list);
}
function scrollPreferenceDrag(){
 const drag=preferenceDrag;
 if(!drag)return;
 if(!drag.list.isConnected){preferenceDrag=null;return;}
 const edge=64;
 const speed=drag.y<edge?-10:drag.y>innerHeight-edge?10:0;
 if(speed){
  window.scrollBy({top:speed,behavior:'instant'});
  moveDraggedRow();
 }
 drag.frame=requestAnimationFrame(scrollPreferenceDrag);
}
app.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('.preference-handle');
 if(preferenceDrag&&!preferenceDrag.list.isConnected)preferenceDrag=null;
 if(!handle||!e.isPrimary||e.button!==0||busy||preferenceDrag)return;
 const row=handle.closest('li'),list=row.parentElement;
 handle.focus({preventScroll:true});
 list.setPointerCapture(e.pointerId);
 e.preventDefault();
 preferenceDrag={list,row,handle,pointer:e.pointerId,startY:e.clientY,y:e.clientY,active:false};
});
app.addEventListener('pointermove',e=>{
 const drag=preferenceDrag;
 if(!drag||drag.pointer!==e.pointerId)return;
 drag.y=e.clientY;
 if(!drag.active){
  if(Math.abs(drag.y-drag.startY)<6)return;
  drag.active=true;
  drag.row.classList.add('preference-dragging');
  drag.frame=requestAnimationFrame(scrollPreferenceDrag);
 }
 moveDraggedRow();
});
function finishPreferenceDrag(e){
 const drag=preferenceDrag;
 if(!drag||drag.pointer!==e.pointerId)return;
 preferenceDrag=null;
 cancelAnimationFrame(drag.frame);
 if(!drag.active||!drag.list.isConnected)return;
 if(e.type!=='pointerup'){render();return;}
 drag.row.classList.remove('preference-dragging');
 if(savePreferenceOrder(drag.list))toast('志願順序已更新');
 drag.handle.focus({preventScroll:true});
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(name,finishPreferenceDrag);
app.addEventListener('keydown',e=>{
 const handle=e.target.closest('.preference-handle');
 if(!handle||busy||preferenceDrag||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
 e.preventDefault();
 const row=handle.closest('li'),list=row.parentElement;
 const next={ArrowUp:row.previousElementSibling,ArrowDown:row.nextElementSibling?.nextElementSibling,
  Home:list.firstElementChild,End:null}[e.key];
 if(e.key==='ArrowUp'&&!next||e.key==='ArrowDown'&&!row.nextElementSibling||next===row)return;
 list.insertBefore(row,next??null);
 renumberPreferences(list);
 savePreferenceOrder(list);
 handle.focus({preventScroll:true});
 row.scrollIntoView({block:'nearest'});
 toast('已移到第 '+row.querySelector('[data-rank]').textContent+' 志願');
});
let composingSearch=null;
function updateCatalogSearch(value){
 if(filter.search===value)return;
 filter.search=value;
 const results=$('#catalog-results');
 if(!results)return;
 results.innerHTML=state.route==='star'?starSchoolResults():programResults(filtered(programs));
}
app.addEventListener('compositionstart',e=>{
 if(e.target.id==='catalog-search')composingSearch=e.target;
});
app.addEventListener('compositionend',e=>{
 if(e.target.id!=='catalog-search')return;
 composingSearch=null;
 updateCatalogSearch(e.target.value);
});
app.addEventListener('input',e=>{if(e.target.id==='seed-input'){pendingSeed=e.target.value;}else if(e.target.id==='short-answer'){state.paper.answers[state.paper.index]=e.target.value;save();const b=app.querySelector('[data-action="next"]');b.disabled=!answerReady(state.paper.questions[state.paper.index],e.target.value);}else if(e.target.id==='catalog-search'&&!e.isComposing&&e.target!==composingSearch){updateCatalogSearch(e.target.value);}});
app.addEventListener('change',e=>{if(e.target.name==='exam-subject'){const key=state.stage==='splitSelect'?'splitSubjects':'gsatSubjects';state[key]=Array.from(app.querySelectorAll('[name="exam-subject"]:checked'),x=>x.value);save();render();}});
document.addEventListener('click',e=>{if(openSelect&&!e.target.closest('[data-select-wrap]')){
 openSelect=null;
 if(e.target.id==='catalog-search'){
  const dropdown=app.querySelector('.custom-select.is-open');
  dropdown?.classList.remove('is-open');
  dropdown?.querySelector('.select-trigger')?.setAttribute('aria-expanded','false');
  dropdown?.querySelector('.select-menu')?.remove();
 }else render();
}});
document.addEventListener('keydown',e=>{if(e.isComposing||composingSearch)return;const trigger=e.target.closest('.select-trigger'),option=e.target.closest('[role="option"]');if(trigger&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();openSelect=trigger.closest('[data-select-wrap]').dataset.selectWrap;render();const items=[...app.querySelectorAll('.select-menu [role="option"]')];(e.key==='ArrowUp'?items.at(-1):items[0])?.focus();}else if(option&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=[...option.closest('.select-menu').querySelectorAll('[role="option"]')],i=items.indexOf(option);items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}else if(openSelect&&['Escape','Tab'].includes(e.key)){if(e.key==='Escape')e.preventDefault();const key=openSelect;openSelect=null;render();app.querySelector(`[data-select-wrap="${key}"] .select-trigger`)?.focus({preventScroll:true});}});
$('#collection-button').onclick=openCollection;
window.addEventListener('hashchange',()=>{collectionOpen=location.hash==='#collection';openSelect=null;render();});
$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();$('#restart-button').onclick=()=>{if(!busy)action('restart');};$('#confirm-cancel').onclick=()=>$('#confirm-dialog').close();$('#achievement-button').onclick=showAchievements;$('#close-achievements').onclick=()=>$('#achievement-dialog').close();
$('#photo-input').addEventListener('change',async e=>{if(!state||state.ending!=='admitted'||photoBusy)return;photoBusy=true;busy=true;try{await uploadPhoto(e.target.files[0]);toast('照片已更新，只保存在此瀏覽器。');}catch(error){toast(error.message);}finally{photoBusy=false;busy=false;e.target.value='';}});
const THEME_KEY='daiwan-theme-v1';
const THEMES={
 campus:{color:'#285345',label:'CLASSROOM EDITION / 同學，上課了。'},
 retro:{color:'#8f3d2a',label:'RETRO CAMPUS / 放學後見。'},
 hongkong:{color:'#173e46',label:'放學茶記 / 今日照常營業。'},
};
function applyTheme(id){
 const selected=Object.hasOwn(THEMES,id)?id:'campus';
 const theme=THEMES[selected];
 document.documentElement.dataset.theme=selected;
 document.querySelector('meta[name="theme-color"]').content=theme.color;
 $('.brand small').textContent=theme.label;
 document.querySelectorAll('[data-theme-choice]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.themeChoice===document.documentElement.dataset.theme));
 });
}
applyTheme(readStore(THEME_KEY,'campus'));
$('#theme-button').onclick=()=>$('#theme-dialog').showModal();
$('#close-themes').onclick=()=>$('#theme-dialog').close();
$('#theme-dialog').addEventListener('click',e=>{
 const choice=e.target.closest('[data-theme-choice]');
 if(!choice)return;
 const id=choice.dataset.themeChoice;
 applyTheme(id);
 saveStore(THEME_KEY,id);
});
function reconcileAdmissionCatalog(){
 const active=new Set(programs.map(p=>p.id));
 state.preferences=(state.preferences||[]).filter(id=>active.has(id));
 if(['applyScreen','interview'].includes(state.stage)){
  const application=state.application;
  const affected=!application||application.preferences.some(id=>!active.has(id))||(application.safety&&!active.has(application.safety));
  if(affected){
   state.application=null;
   state.stage='universities';
  }
 }else if(state.stage==='universities'&&state.route==='apply'&&applicationClosed()&&state.admission){
  state.stage='admissionResult';
 }
 if(state.starSchool&&!catalog.universities.some(u=>u.id===state.starSchool)){
  state.starSchool=null;
  state.starGroup=null;
 }
}
async function boot(){try{const responses=await Promise.all(['/catalog.json','/minigames.json','/songs.json','/events.json'].map(url=>fetch(url,{cache:'no-cache'})));if(responses.some(r=>!r.ok))throw new Error('校園資料讀取失敗');[catalog,miniBank,songs,events]=await Promise.all(responses.map(r=>r.json()));registerAchievementExpansion();programs=catalog.programs.map(hydrateProgram);archivedPrograms=(catalog.archive?.programs||[]).map(hydrateProgram);collection=readStore(COLLECTION_KEY,{programs:{}});if(!collection||!collection.programs||typeof collection.programs!=='object'||Array.isArray(collection.programs))collection={programs:{}};achievements=readStore(ACH_KEY,{});seen=readStore(SEEN_KEY,[]);miniSeen=readStore(MINI_KEY,[]);termHistory=readStore(TERM_KEY,[]);miniHistory=readStore(MINI_ROTATION_KEY,[]);try{legacy=['daiwan-next-chapter-v1','daiwan-next-chapter-v2','daiwan-classroom-v3','daiwan-campus-v4'].some(k=>!!localStorage.getItem(k));const s=readStore(KEY,null);if(s?.version===5&&typeof s.name==='string'&&s.attrs?.length===5&&s.aptitude?.length===5&&s.round>=0&&s.round<=5)state=s;}catch{storageOK=false;}recordCollection();if(state){reconcileAdmissionCatalog();
 if(state.stage==='event'&&!state.event?.story)showEvent(events.find(e=>e.id===state.event.id));
 if(state.rank!=null&&state.history.length>=5&&state.schoolScore==null){
  state.schoolScore=calculateSchoolScore();
  if(!state.admission&&state.peers?.length)state.rank=1+state.peers.filter(v=>v>state.schoolScore).length;
  if(state.stage==='universities'&&state.route==='star')state.preferences=state.preferences.filter(id=>eligibility(historicalProgram(id)));
 }
 if(['applyScreen','interview'].includes(state.stage)&&!state.interview?.games&&!interviewComplete()){
  const replaced=!!state.interview?.answers?.length;
  startInterview();
  state.interview.replaced=replaced;
 }
 for(const q of state.paper?.questions||[]){
  if(q.id==='v5q178')q.text=q.text.replace('遺忘成遺跡','遺落成遺跡');
  if(q.id==='v5q183')q.text=q.text.replace('多麼的清晰','多麼的清新');
  if(q.id==='v5q176')q.text=q.text.replace('你的聲音','妳的聲音');
  if(q.id==='v5q195')q.text=q.text.replace('讓我將你心兒摘下','讓我將妳心兒摘下');
 }
 restoreMiniHistory();delete state.gameOrder;delete state.miniVariety;
 if(state.stage==='game'&&!state.game?.done&&RETIRED_GAMES[state.game?.type]){state.replacementGame=RETIRED_GAMES[state.game.type];state.game=null;state.stage='dice';}
 if(['applyScreen','interview'].includes(state.stage)&&!interviewComplete()&&state.interview?.games?.some(g=>RETIRED_GAMES[g.type])){
  state.interview.games=state.interview.games.map(g=>!g.done&&RETIRED_GAMES[g.type]?newPuzzle(RETIRED_GAMES[g.type]):g);
 }if(state.game?.type==='lyric-fill'&&!state.game.done){state.game=null;if(state.stage==='game')state.stage='dice';}saveStore(KEY,state);}if(state?.ending&&state.achievementVersion!==6){unlockAchievements();save();}if(state?.stage==='game'&&savedBoardNeedsRefresh(state.game)){const source=miniBank.find(g=>g.id===state.game.id);state.game=null;startGame(source);}else render();}catch(e){app.innerHTML=`<div class="boot-error"><h1>校園資料還沒準備好。</h1><p>${esc(e.message)}，請重新整理後再試。</p><button class="primary" onclick="location.reload()">重新整理</button></div>`;}}
boot();
