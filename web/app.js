'use strict';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const KEY = 'daiwan-next-chapter-v1';
const ATTR = ['人文社會', '數理科學', '語言能力', '體育', '藝術', '音樂', '人緣', '自信', '運氣'];
const SUBJECTS = ['國文', '英文', '數學A', '數學B', '自然', '社會'];
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fmt = (n) => Number(n).toFixed(1).replace(/\.0$/, '');
let state = null;
let busy = false;
let welcome = true;
let filter = {search: '', type: '全部', area: '全部'};
let storageAvailable = true;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    const stages = ['quiz', 'essay', 'cap', 'highschools', 'schoolResult', 'round', 'roundResult', 'gsatSelect', 'gsatResult', 'routes', 'universities', 'admissionResult', 'divisionSelect', 'divisionResult', 'ending'];
    if (parsed.version === 1 && stages.includes(parsed.stage) && typeof parsed.name === 'string' && Array.isArray(parsed.questions) && parsed.questions.length === 18) state = parsed;
  }
} catch { storageAvailable = false; }

const HIGH_SCHOOLS = [
  ['建華高中','公立','北部','普通高中',33.5,'學術研究',1],
  ['北景女中','公立','北部','普通高中',32.5,'人文探索',0],
  ['師苑附中','公立','北部','普通高中',31,'多元社團',4],
  ['中城一中','公立','中部','普通高中',30,'科學探究',1],
  ['南府一中','公立','南部','普通高中',29,'自主學習',1],
  ['港灣高中','公立','南部','普通高中',26,'海洋與環境',0],
  ['花嶼高中','公立','東部','普通高中',22,'山海探索',3],
  ['青田高中','公立','中部','普通高中',18,'社區行動',0],
  ['晨光高中','私立','北部','普通高中',24,'雙語表達',2],
  ['明禾高中','私立','中部','普通高中',20,'專題實作',1],
  ['育林高中','私立','南部','普通高中',13,'探索與支持',6],
  ['松川高工・資訊科','公立','北部','技術高中',25,'程式與電路',1],
  ['中原高工・機械科','公立','中部','技術高中',22,'工程實作',1],
  ['港都高商・商業科','公立','南部','技術高中',20,'商業與溝通',0],
  ['海風家商・設計科','公立','東部','技術高中',16,'設計與創作',4],
  ['星禾藝校・表演科','私立','北部','藝術高中',15,'舞台與音樂',5],
  ['向陽高職・餐旅科','私立','南部','技術高中',9,'餐旅與服務',6],
  ['田野高中','公立','中部','普通高中',5,'適性探索',3]
].map((s, i) => ({id: 'h'+i, name:s[0], type:s[1], area:s[2], track:s[3], threshold:s[4], feature:s[5], boost:s[6]}));

const DEPTS = [
  {name:'資訊工程學系', field:1, subjects:['英文','數學A','自然'], split:['數學甲','物理','化學']},
  {name:'機械工程學系', field:1, subjects:['數學A','自然'], split:['數學甲','物理']},
  {name:'外國語文學系', field:2, subjects:['國文','英文'], split:['歷史','地理']},
  {name:'法律學系', field:0, subjects:['國文','英文','社會'], split:['歷史','公民與社會']},
  {name:'企業管理學系', field:0, subjects:['英文','數學B','社會'], split:['數學乙','公民與社會']},
  {name:'視覺設計學系', field:4, subjects:['國文','英文'], split:['歷史','地理']},
  {name:'音樂學系', field:5, subjects:['國文','英文'], split:['歷史','地理']},
  {name:'運動科學學系', field:3, subjects:['國文','自然'], split:['生物','化學']}
];
const UNIVERSITIES = [
  ['臺華大學','公立','北部',84],['清嵐大學','公立','北部',82],['陽明交岳大學','公立','北部',81],
  ['成岳大學','公立','南部',79],['政和大學','公立','北部',78],['中原山大學','公立','中部',74],
  ['中海大學','公立','南部',71],['東嶼大學','公立','東部',62],
  ['師苑大學','公立','北部',75],['北川大學','公立','北部',70],
  ['輔禾大學','私立','北部',64],['東麓大學','私立','中部',60],
  ['淡川大學','私立','北部',56],['逢原大學','私立','中部',54],
  ['南星大學','私立','南部',44],['海田大學','私立','東部',32]
];
// 每校五個示範系組：刻意採虛構組合，不代表真實校系設置。
const PROGRAMS = UNIVERSITIES.flatMap((u, i) => Array.from({length:5}, (_, j) => {
  const d = DEPTS[(i + j) % DEPTS.length];
  return {...d, id:`u${i}-${j}`, university:u[0], type:u[1], area:u[2], threshold:clamp(u[3] + (d.field === 1 ? 2 : -2)), maxRank:u[3] >= 78 ? 20 : u[3] >= 65 ? 30 : 50};
}));
const SPLITS = ['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會'];
const EVENTS = [
  {title:'社團舞台，少了一個人', text:'校慶快到了，朋友想邀請你一起演出。段考也在下週，你會怎麼安排？', choices:[['加入演出，練習站上舞台', {5:3,7:2},12,0,5],['協助海報與幕後工作',{4:3,6:2},5,0,4],['保留讀書時間，幫忙找替補',{2:1},-5,0,1]]},
  {title:'科展的最後一塊拼圖',text:'同學正在找人分析實驗數據。你願意加入這場腦力接力嗎？',choices:[['負責分析與驗證',{1:3,7:1},8,0,6],['負責簡報與說明',{2:2,6:2},5,0,5],['先完成課內作業',{0:1,1:1},-4,0,1]]},
  {title:'群組裡的那句話',text:'同學在群組裡被開了過頭的玩笑。氣氛有點尷尬，你決定……',choices:[['私下關心，陪他尋求協助',{6:3,7:1},-2,0,3],['溫和提醒大家停止轉傳',{6:2,0:2},3,0,3],['先退出爭論，向導師反映',{0:1,7:1},-3,0,1]]},
  {title:'一個沒有行程的下午',text:'難得的空檔，校門口的風很舒服。今天你想留一點時間給自己。',choices:[['去球場運動',{3:3,7:1},-12,10,1],['聽歌、散步，整理心情',{5:2},-16,14,0],['畫下最近的校園生活',{4:3},-10,8,3]]},
  {title:'看起來太完美的消息',text:'有人轉傳「考前必看，百分之百命中」的付費筆記。你打算怎麼做？',choices:[['查證來源並提醒朋友',{0:2,6:2},-3,0,2],['整理自己的筆記',{1:2,2:1},4,0,4],['請教老師如何抓重點',{7:2,2:1},-6,0,2]]},
  {title:'和交換生一起吃午餐',text:'學校來了一位交換生，你們坐在同一桌。對方正好對臺灣生活很好奇。',choices:[['試著用英文介紹附近小吃',{2:3,7:2},3,0,3],['邀大家一起聊各地文化',{0:2,6:3},0,0,3],['用圖畫和照片分享故事',{4:2,2:1},-2,0,2]]},
  {title:'第一次模擬面試',text:'老師安排了一次練習面試。輪到你時，心跳突然快了起來。',choices:[['坦誠說明自己的學習經驗',{7:3,2:1},4,0,5],['用作品展示自己的專長',{4:2,7:2},3,0,6],['請同學陪自己再練一次',{6:2,7:2},-4,0,3]]},
  {title:'報告沒存到！',text:'電腦突然當機，報告只剩昨天的版本。距離繳交還有一天。',choices:[['列出重點，重新分工完成',{1:2,6:2},8,-3,5],['向老師說明並討論補救方案',{7:2,0:1},-4,0,2],['從備份重建，建立版本習慣',{1:3},2,0,4]]},
  {title:'社區的小小邀請',text:'附近圖書館需要週末志工。你可以選一項自己擅長的工作。',choices:[['陪孩子閱讀',{0:3,6:2},0,-3,5],['設計活動海報',{4:3,7:1},2,-3,5],['協助音樂故事時間',{5:3,2:1},0,-3,5]]},
  {title:'成績單上的紅字',text:'這次表現不如預期，但你還有時間調整。你想先從哪裡開始？',choices:[['整理錯題，找到卡住的觀念',{1:3,7:1},3,0,3],['與朋友組成讀書小組',{6:3,2:1},-4,0,3],['先睡飽，再訂小目標',{7:2},-15,15,1]]},
  {title:'校際競賽報名中',text:'不同領域的競賽同時開放報名。這次你想挑戰哪個方向？',choices:[['科學與邏輯挑戰',{1:4},10,-4,6],['演說與議題辯論',{0:2,2:2},8,-4,6],['運動團體賽',{3:3,6:2},5,-6,5]]},
  {title:'路邊的小幸運',text:'你在圖書館找到一本一直想讀的書，裡面剛好有這次專題需要的資料。',choices:[['做成筆記分享給同學',{0:2,6:2,8:1},-4,0,4],['延伸做一份自主學習作品',{1:2,4:1,8:1},5,0,6],['享受閱讀的時間',{2:2,8:1},-10,8,1]]},
  {title:'城市裡的展覽',text:'學校提供一場免費展覽的參觀機會。這趟小旅行，你想怎麼記錄？',choices:[['畫成速寫與視覺筆記',{4:4},-6,0,5],['寫成觀察報告',{0:3,2:1},-3,0,5],['錄成聲音與音樂日記',{5:3,2:1},-8,0,5]]},
  {title:'一起做一個小工具',text:'同學想做一個幫班上記錄作業的小工具，來找你一起試試。',choices:[['負責邏輯與功能',{1:4},6,-3,7],['負責畫面與易用性',{4:3,2:1},4,-2,6],['訪問同學需要什麼',{6:3,0:1},0,0,5]]},
  {title:'操場邊的加油聲',text:'班際比賽在即，你可以選擇用自己的方式參與。',choices:[['上場練習與比賽',{3:4,7:1},3,-8,4],['編排加油表演',{5:2,4:2,6:1},1,-4,4],['幫忙記錄與照顧隊友',{6:3,0:1},-3,0,3]]},
  {title:'給未來的自己',text:'老師請大家寫一封給三年後自己的信。你最想留住什麼？',choices:[['記下想研究的問題',{1:2,7:2},-5,0,4],['記下重要的人與回憶',{0:2,6:2},-10,4,3],['寫下還沒完成的創作',{4:2,5:2},-6,0,4]]},
  {title:'同學需要一位小老師',text:'朋友被一道題目困住了。試著教別人，也可能讓自己重新理解。',choices:[['畫圖解釋解題過程',{1:2,4:1,6:1},3,0,4],['用生活例子說明',{0:2,2:1,6:1},1,0,4],['找可靠資料一起討論',{2:2,6:2},0,0,3]]},
  {title:'一場關於未來的對話',text:'導師問你：「除了分數，你希望別人怎麼記得你？」你想了想。',choices:[['一個願意解決問題的人',{1:2,7:3},-7,4,4],['一個願意照顧夥伴的人',{6:3,0:2},-7,4,4],['一個持續創作的人',{4:2,5:2,7:1},-7,4,4]]}
];

function random() {
  let x = state.seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; }
  catch { storageAvailable = false; }
  $('#save-status').textContent = storageAvailable ? '● 進度已自動儲存' : '⚠ 瀏覽器無法存檔，請勿關閉';
}
function go(stage) { state.stage = stage; save(); render(); window.scrollTo({top:0, behavior:'smooth'}); }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
async function api(path, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/' + path, data ? {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(data), signal:controller.signal} : {signal:controller.signal});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '請求失敗');
    return result;
  } finally { clearTimeout(timer); }
}
function btn(label, action, style = 'primary', extra = '') { return `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`; }
function title(kicker, heading, text) { return `<div class="page-heading"><span class="eyebrow">${kicker}</span><h1>${heading}</h1><p>${text}</p></div>`; }
function shell(content, active = 0) {
  const steps = ['會考出發','高中職志願','三年養成','大學升學','旅程回顧'];
  return `<div class="workspace"><aside class="sidebar"><div class="student-label">STUDENT FILE</div><h3>${escapeHTML(state.name)}</h3><p class="muted">${state.school ? escapeHTML(state.school.name) : '下一站，等你決定。'}</p><nav class="steps" aria-label="遊戲進度">${steps.map((s,i) => `<div class="step ${i===active?'active':i<active?'done':''}"><span>${i<active?'✓':String(i+1).padStart(2,'0')}</span>${s}</div>`).join('')}</nav>${state.attrs ? `<div class="aside-note"><span class="eyebrow">YOUR GROWTH</span>${attributeBars()}<div class="status-pair"><span>精力 <b>${Math.round(state.energy)}</b></span><span>壓力 <b>${Math.round(state.stress)}</b></span></div></div>` : '<div class="aside-note"><span class="little-star">✳</span><p>不用一開始就知道答案，<br>先走出自己的第一步。</p></div>'}</aside><section class="main-content">${content}</section></div>`;
}
function attributeBars() { return state.attrs.map((n,i) => `<div class="attribute"><span>${ATTR[i]}</span><div class="meter"><i style="width:${clamp(n)}%"></i></div><b>${Math.round(n)}</b></div>`).join(''); }
function campusArt() { return `<svg class="campus" viewBox="0 0 600 460" role="img" aria-label="有樹木、跑道與校舍的校園插畫"><defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#d9dfd4" stroke-width=".7"/></pattern></defs><rect width="600" height="460" fill="#eaf0e5"/><rect width="600" height="460" fill="url(#grid)"/><circle cx="470" cy="90" r="48" fill="#f3d19a"/><path d="M0 350Q150 260 310 330T600 320V460H0Z" fill="#cad7bf"/><path d="M80 460C85 370 220 345 600 382" fill="none" stroke="#d99579" stroke-width="56"/><path d="M80 460C85 370 220 345 600 382" fill="none" stroke="#f5e4cc" stroke-width="2"/><path d="M90 460C100 384 270 362 600 395" fill="none" stroke="#f5e4cc" stroke-width="2"/><path d="M145 315L145 185L355 185L355 315Z" fill="#f8f0dd"/><path d="M355 185L428 150V284L355 315" fill="#e0d1af"/><path d="M145 185L220 150H428L355 185Z" fill="#477260"/><rect x="227" y="99" width="65" height="87" rx="2" fill="#f8f0dd"/><path d="M220 101L260 67L299 101Z" fill="#365a49"/><circle cx="259" cy="125" r="17" fill="#fffaf0" stroke="#355547" stroke-width="2"/><path d="M259 114V125L268 131" fill="none" stroke="#355547" stroke-width="2"/><g fill="#7c9d90"><path d="M166 208h28v27h-28zM214 208h28v27h-28zM263 208h28v27h-28zM311 208h25v27h-25zM166 252h28v27h-28zM214 252h28v27h-28zM311 252h25v27h-25z"/></g><path d="M263 315v-63h28v63" fill="#477260"/><path d="M374 207l16-8v25l-16 8zM402 194l15-8v25l-15 8zM374 250l16-8v25l-16 8zM402 237l15-8v25l-15 8z" fill="#729183"/><path d="M110 345V238M470 322V227M520 330V251" stroke="#6b7753" stroke-width="8"/><ellipse cx="107" cy="225" rx="45" ry="65" fill="#6b8a61"/><ellipse cx="470" cy="213" rx="37" ry="57" fill="#456c50"/><ellipse cx="524" cy="249" rx="30" ry="44" fill="#8c9f70"/><path d="M443 75l8-4 8 4M385 63l8-4 8 4" stroke="#59745a" fill="none" stroke-width="2"/><g transform="translate(200 336)"><circle cy="-12" r="7" fill="#394f45"/><path d="M0-4v21M0 4l-10 8M0 5l10 4M0 17l-7 15M0 17l8 15" stroke="#394f45" stroke-width="5"/><path d="M-6 0h12v15H-6" fill="#d4866a"/></g><g transform="translate(232 340)"><circle cy="-12" r="7" fill="#394f45"/><path d="M0-4v21M0 4l-10 8M0 5l10 4M0 17l-7 15M0 17l8 15" stroke="#394f45" stroke-width="5"/><path d="M-6 0h12v15H-6" fill="#e4c777"/></g><rect x="36" y="35" width="105" height="32" rx="16" fill="#fffaf0"/><text x="88" y="56" text-anchor="middle" font-size="12" fill="#355547" font-family="sans-serif">青春，進行中。</text></svg>`; }

function renderWelcome() {
  return `<div class="landing"><section class="hero-copy"><span class="eyebrow"><i class="dot"></i> 一場關於選擇的校園冒險</span><h1>下一站，<br>你想成為<span>怎樣的大人？</span></h1><p class="hero-description">從會考的第一題，到大學的第一張錄取通知。<br>讀書、交朋友、追一點夢，寫下你的升學故事。</p><div class="intro-chips"><span>✦ 生活 × 學科問答</span><span>↗ 高中職自由選擇</span><span>♧ 多種升學結局</span></div><form id="start-form"><label for="player-name">先讓我們認識你</label><div class="name-row"><input id="player-name" name="name" maxlength="16" required placeholder="你的名字或暱稱" autocomplete="nickname" value="${state ? escapeHTML(state.name) : ''}"><button class="primary" type="submit">出發，迎接會考 <span>↗</span></button></div><p class="input-note">18 道選擇題＋1 個寫作小任務，不限時間。</p></form>${state ? `<div class="resume-card"><div><b>${escapeHTML(state.name)}，你的故事還在這裡。</b><small>上次進度：${stageLabel(state.stage)}</small></div>${btn('繼續旅程 →','resume','secondary')}</div>` : ''}</section><section class="hero-visual">${campusArt()}<div class="visual-caption"><span>CHAPTER 01 / 新的起點</span><b>人生沒有標準答案。</b></div><div class="stamp">你的故事<br><strong>由你決定</strong><span>EST. TODAY</span></div></section></div><section class="landing-bottom"><div><span class="number">01</span><h3>先試試你的直覺</h3><p>學科、常識、邏輯與生活情境，<br>讓每一種能力都有被看見的機會。</p></div><div><span class="number">02</span><h3>選一條自己的路</h3><p>填選高中職、培養專長，<br>在三年的日常中慢慢找到方向。</p></div><div><span class="number">03</span><h3>把選擇變成故事</h3><p>挑戰繁星、申請或分科，<br>帶著回憶走向下一個起點。</p></div></section>`;
}
function stageLabel(s) { return ({quiz:'會考問答',essay:'寫作任務',cap:'會考成績',highschools:'高中職志願',schoolResult:'高中職放榜',round:'校園生活',roundResult:'回合結算',gsatSelect:'學測選科',gsatResult:'學測成績',routes:'升學選擇',universities:'大學志願',admissionResult:'大學放榜',divisionSelect:'分科選科',divisionResult:'分科成績',ending:'旅程回顧'})[s] || '新的起點'; }
function renderQuiz() {
  const q = state.questions[state.qIndex];
  return shell(`${title('CHAPTER 01 / 會考出發','先從一道題，認識自己的可能。','不只有課本知識。生活觀察、常識與判斷，也都是你的能力。')}<div class="question-progress"><span>QUESTION <b>${String(state.qIndex+1).padStart(2,'0')}</b> / ${state.questions.length}</span><span>已回答 ${state.answers.filter(a=>a!==null).length} 題</span></div><div class="progress-track"><i style="width:${(state.qIndex+1)/18*100}%"></i></div><article class="question-card"><div class="tags"><span>${q.subject}</span><span>${q.kind}</span></div><h2>${escapeHTML(q.text)}</h2><div class="answers">${q.options.map((a,i)=>`<button class="answer ${state.answers[state.qIndex]===i?'selected':''}" data-action="answer" data-value="${i}" aria-pressed="${state.answers[state.qIndex]===i}"><span class="answer-letter">${'ABCD'[i]}</span><span>${escapeHTML(a)}</span><span class="answer-check">${state.answers[state.qIndex]===i?'✓':'○'}</span></button>`).join('')}</div></article><div class="question-nav">${btn('← 上一題','previous-question','text-button',state.qIndex===0?'disabled':'')}<span class="muted">慢慢想，這裡沒有倒數計時。</span>${btn(state.qIndex===17?'前往寫作 →':'下一題 →','next-question','primary',state.answers[state.qIndex]===null?'disabled':'')}</div>`);
}
function renderEssay() {
  return shell(`${title('WRITING / 最後一個小任務','寫給未來的自己。','如果升上高中職，你最想完成的一件事是什麼？為什麼？請舉一個例子。')}<article class="panel"><div class="tags"><span>寫作任務</span><span>40～300 字</span></div><label class="sr-only" for="essay">你的短文</label><textarea id="essay" rows="9" placeholder="我希望在高中職的三年裡……">${escapeHTML(state.essay||'')}</textarea><div class="writing-meta"><span>不需要完美，說說你的想法就好。</span><span id="essay-count">${[...(state.essay||'')].length} / 300 字</span></div><details class="rules"><summary>遊戲如何計算作文級分？</summary><p>這是簡化的結構練習：基本 1 級分；達 60 字、100 字、使用中文標點、包含因果或轉折詞、包含例證詞，各加 1，最高 6。例證詞如「例如、曾經」；因果詞如「因為、所以」。程式不判斷文章語意與真實品質。</p></details></article><div class="button-row end">${btn('← 回到題目','back-quiz','secondary')}${btn('交卷，看看我的成績 ↗','submit-exam')}</div>`);
}
function renderCAP() {
  const c = state.cap;
  return shell(`${title('RESULT / 你的第一張成績單','每一種表現，都有下一步。','這是旅程的起點。帶著你的成績，看看哪些高中職適合你。')}<div class="score-hero"><div><span>遊戲版會考積分</span><strong>${fmt(c.total)}<small> / 36</small></strong><p>選擇題答對 ${c.correct} / 18 題 · 常識答對 ${c.general} / 3 題</p></div><div class="score-message">${c.total>=28?'準備好，向理想學校挑戰。':c.total>=18?'每個選擇，都能長成新的可能。':'起點不決定終點，你還有很多可能。'}</div></div><div class="subject-grid">${c.scores.map(s=>`<div class="subject-tile"><span>${s.subject}</span><strong>${s.level}</strong><small>${s.points} 積分</small></div>`).join('')}<div class="subject-tile writing"><span>寫作</span><strong>${c.writing}<small> 級分</small></strong><small>加 ${fmt((c.writing-1)/5)} 分</small></div></div><p class="notice">短問答抽樣模擬：各科由學科答對率 85%＋常識答對率 15% 換算 1～7 積分，再加作文 0～1 分，非正式會考評量。</p><details class="panel review"><summary>查看 ${state.questions.length} 題答案與解析</summary>${state.questions.map((q,i)=>`<div class="review-item"><span class="review-result ${c.review[i].correct?'good':'bad'}">${c.review[i].correct?'✓ 答對':'↗ 再學一次'}</span><h3>${i+1}. ${escapeHTML(q.text)}</h3><p>你的答案：${escapeHTML(q.options[state.answers[i]])}<br>正確答案：${escapeHTML(q.options[c.review[i].answer])}</p><p class="muted">${escapeHTML(c.review[i].explanation)}</p></div>`).join('')}</details><div class="button-row end">${btn('選填高中職志願 →','open-highschools')}</div>`);
}
function filters(types) { return `<div class="filters"><label><span class="sr-only">搜尋學校或科系</span><input id="catalog-search" placeholder="搜尋學校、特色或科系…" value="${escapeHTML(filter.search)}"></label><label><span class="sr-only">類別</span><select id="catalog-type">${['全部',...types].map(t=>`<option ${filter.type===t?'selected':''}>${t}</option>`).join('')}</select></label><label><span class="sr-only">地區</span><select id="catalog-area">${['全部','北部','中部','南部','東部'].map(t=>`<option ${filter.area===t?'selected':''}>${t}</option>`).join('')}</select></label></div>`; }
function filtered(list) { return list.filter(x=>(filter.type==='全部'||x.type===filter.type||x.track===filter.type)&&(filter.area==='全部'||x.area===filter.area)&&JSON.stringify(x).includes(filter.search.trim())); }
function preferencePanel(list, selected, max, submit, label) {
  return `<aside class="preferences"><div class="preference-heading"><h3>我的志願序</h3><span>${selected.length} / ${max}</span></div><p class="muted">把最想去的放前面。可以不填滿。</p>${selected.length?`<ol>${selected.map((id,i)=>{ const s=list.find(s=>s.id===id); return `<li><span class="preference-number">${i+1}</span><div><b>${escapeHTML(s.university||s.name)}</b>${s.university?`<small>${s.name}</small>`:''}<div class="preference-controls"><button data-action="move-preference" data-id="${id}" data-dir="-1" aria-label="將第 ${i+1} 志願往前移" ${i===0?'disabled':''}>↑</button><button data-action="move-preference" data-id="${id}" data-dir="1" aria-label="將第 ${i+1} 志願往後移" ${i===selected.length-1?'disabled':''}>↓</button><button data-action="remove-preference" data-id="${id}">移除</button></div></div></li>`;}).join('')}</ol>`:'<div class="empty-preferences"><span>＋</span>選一間學校，<br>把想像放進志願裡。</div>'}${btn(label,submit,'primary wide',selected.length?'':'disabled')}<p class="input-note">送出後會依目前順序進行模擬分發。</p></aside>`;
}
function renderHighSchools() {
  const supplement = state.supplement;
  const list = filtered(HIGH_SCHOOLS).filter(s=>!supplement||s.threshold<=state.cap.total);
  return shell(`${title('CHAPTER 02 / 高中職志願',supplement?'再選一次，找到新的起點。':'下一站，想在哪裡長大？',supplement?'前五個志願沒有錄取，續招提供符合積分的學校，保留你的升學旅程。':'普通高中、技術高中、藝術高中。選填最多五個志願，由你排出順序。')}<div class="inline-banner">你的會考積分 <b>${fmt(state.cap.total)} / 36</b><span>18 個虛構示範校科 · 公私立皆可選</span></div>${filters(['公立','私立','普通高中','技術高中','藝術高中'])}<div class="catalog-layout"><div class="school-list">${list.map(s=>`<article class="school-card"><div><div class="tags"><span>${s.type} · ${s.area}</span><span>${s.track}</span></div><h3>${s.name}</h3><p>${s.feature} <span class="muted">／ 模擬錄取門檻 ${s.threshold}</span></p><span class="fit ${state.cap.total>=s.threshold?'good':'bad'}">${state.cap.total>=s.threshold+3?'保底選擇':state.cap.total>=s.threshold?'符合門檻':'挑戰志願（目前未達門檻）'}</span></div>${btn(state.preferences.includes(s.id)?'已加入 ✓':'＋ 加入志願','add-preference','secondary',`data-id="${s.id}" ${state.preferences.includes(s.id)||state.preferences.length>=5?'disabled':''}`)}</article>`).join('')||'<div class="panel empty">找不到符合篩選的學校，試著調整條件。</div>'}</div>${preferencePanel(HIGH_SCHOOLS,state.preferences,5,'submit-highschools','送出志願，等待放榜 →')}</div>`,1);
}
function renderSchoolResult() {
  return shell(`${title('ADMISSION / 高中職放榜','新的校園，新的你。','你已依照志願順序，錄取第一個符合遊戲門檻的學校。')}<article class="admission-letter"><span class="eyebrow">WELCOME TO YOUR NEXT CHAPTER</span><div class="letter-seal">錄取</div><h2>${state.school.name}</h2><p>${escapeHTML(state.name)} 同學，歡迎加入。</p><div class="letter-details"><span>${state.school.type} · ${state.school.area} · ${state.school.track}</span><span>校園特色：${state.school.feature}</span><span>錄取第 ${state.schoolPreference} 志願 · 會考 ${fmt(state.cap.total)} 分</span></div>${btn('翻開高中職生活的第一頁 →','enter-school')}</article><p class="notice">本作高中職皆銜接一般大學模擬升學。技術高中的統測、技優與科技大學專屬管道尚未實作。</p>`,1);
}
const ACTIONS = [
  {name:'人文閱讀',note:'人文＋國文／社會',attr:0,cost:10,stress:4},
  {name:'科學解題',note:'數理＋數學／自然',attr:1,cost:12,stress:6},
  {name:'語言練習',note:'語言＋國文／英文',attr:2,cost:10,stress:4},
  {name:'運動訓練',note:'體育＋精力恢復',attr:3,cost:-5,stress:-7},
  {name:'藝術創作',note:'藝術＋學習歷程',attr:4,cost:7,stress:-4},
  {name:'音樂練習',note:'音樂＋學習歷程',attr:5,cost:7,stress:-4},
  {name:'同伴共學',note:'人緣＋自信＋各科熟練',attr:6,cost:7,stress:-3},
  {name:'好好休息',note:'精力＋20，壓力－15',attr:null,cost:-20,stress:-15}
];
function termName(round) { return `高${['一','二','三'][Math.floor(round/6)]}${Math.floor(round/3)%2===0?'上':'下'}`; }
function renderRound() {
  const e = EVENTS[state.eventOrder[state.round]];
  const used = state.actions.reduce((a,b)=>a+b,0);
  return shell(`${title(`CHAPTER 03 / ${termName(state.round)} · 第 ${state.round%3+1} 次段考前`,'日常的小選擇，會慢慢累積。',state.round>=15?'學測已結束，繼續完成高三生活，整理作品與升學準備。':'安排這段時間的生活，再決定如何回應校園裡的小插曲。')}<div class="term-strip"><span>第 ${state.round+1} / 18 回合</span><div class="mini-terms">${Array.from({length:6},(_,i)=>`<span class="${Math.floor(state.round/3)===i?'current':Math.floor(state.round/3)>i?'complete':''}">${termName(i*3)}</span>`).join('')}</div><span>成長點 <b>${state.points}</b></span></div><section class="panel"><div class="section-heading"><div><span class="eyebrow">01 / YOUR SCHEDULE</span><h2>把時間留給什麼？</h2></div><span class="budget">已安排 ${used} / 3 格</span></div><div class="action-grid">${ACTIONS.map((a,i)=>`<div class="action-card"><span class="action-icon">${['文','理','語','體','藝','樂','伴','息'][i]}</span><div><b>${a.name}</b><small>${a.note}</small></div><div class="stepper"><button data-action="change-action" data-id="${i}" data-dir="-1" aria-label="減少${a.name}" ${state.actions[i]===0?'disabled':''}>−</button><span>${state.actions[i]}</span><button data-action="change-action" data-id="${i}" data-dir="1" aria-label="增加${a.name}" ${used>=3?'disabled':''}>＋</button></div></div>`).join('')}</div></section><section class="event-panel"><div class="event-label">✳ 校園小插曲</div><h2>${e.title}</h2><p>${e.text}</p><div class="event-choices">${e.choices.map((c,i)=>`<button class="event-choice ${state.eventChoice===i?'selected':''}" data-action="event-choice" data-id="${i}" aria-pressed="${state.eventChoice===i}"><b>${c[0]}</b><small>${Object.entries(c[1]).map(([a,n])=>ATTR[a]+`＋${n}`).join(' · ')} · 壓力${c[2]>0?'＋':''}${c[2]} · 歷程＋${c[4]}</small></button>`).join('')}</div></section><div class="button-row end">${btn('完成這段日常，迎接段考 →','resolve-round','primary',used===3&&state.eventChoice!==null?'':'disabled')}</div>`,2);
}
function talentCost(value) { return value<60?1:value<80?2:value<95?3:5; }
function renderRoundResult() {
  const r = state.lastRound;
  const isTermEnd = (state.round+1)%3===0;
  return shell(`${title('GROWTH / 每一步，都算數',isTermEnd?`${termName(state.round)}，辛苦了。`:'又向前走了一小步。',isTermEnd?'一學期結束了。看看這段時間的累積，再為下一段日子做準備。':'分數是回饋，成長才是你可以帶走的東西。')}<div class="result-cards"><div class="metric"><span>平時表現</span><strong>${r.daily}</strong></div><div class="metric"><span>小考平均</span><strong>${r.quiz}</strong></div><div class="metric"><span>段考平均</span><strong>${r.exam}</strong></div><div class="metric highlight"><span>綜合成績</span><strong>${r.total}</strong></div></div><p class="notice">綜合成績＝平時 20%＋小考 20%＋段考 60%。本回合獲得 ${r.earned} 成長點。學習歷程 ${Math.round(state.portfolio)} / 100。</p>${isTermEnd?`<div class="inline-banner">${termName(state.round)} 學期平均 <b>${fmt(state.history.slice(-3).reduce((s,x)=>s+x.total,0)/3)}</b><span>${state.rank?`升學排名已固定：前 ${state.rank}%（高一至高三上）`:'升學排名於高三上結束時結算。'}</span></div>`:''}<section class="panel"><div class="section-heading"><div><span class="eyebrow">GROW AT YOUR OWN PACE</span><h2>把成長點，放進你的專長。</h2></div><span class="budget">剩餘 ${state.points} 點</span></div><div class="growth-grid">${state.attrs.slice(0,6).map((n,i)=>{const cost=talentCost(n); return `<div class="growth-row"><div><b>${ATTR[i]}</b><small>每提升 1 需 ${cost} 點</small></div><strong>${n}</strong>${btn('＋','allocate-point','round-button',`data-id="${i}" aria-label="提升${ATTR[i]}" ${state.points<cost||n>=100?'disabled':''}`)}</div>`;}).join('')}</div><p class="input-note">能力上限 100；60、80、95 以上升級成本增加。剩餘點數可保留。</p></section><div class="button-row end">${btn(state.round===14?'選擇學測報考科目 →':state.round===17?'前往大學升學選擇 →':'繼續下一段日常 →','next-round')}</div>`,2);
}
function renderExamSelection(split = false) {
  const names = split ? SPLITS : SUBJECTS;
  const selected = split ? state.splitSubjects : state.gsatSubjects;
  return shell(`${title(split?'CHALLENGE / 分科測驗':'CHAPTER 04 / 學科能力測驗',split?'再給夢想，一次機會。':'選好科目，往想去的地方。',split?'分科每科最高 60 級分。先查看目標科系的採計需求，再決定報考科目。':'每科最高 15 級分。數學 A 的模擬難度高於數學 B，兩科可以同時選考。')}<section class="panel"><div class="exam-subjects">${names.map(s=>`<label class="subject-check ${selected.includes(s)?'checked':''}"><input type="checkbox" name="exam-subject" value="${s}" ${selected.includes(s)?'checked':''}><span>${s}</span><small>${split?'60 級分':s==='數學A'?'進階難度':'15 級分'}</small></label>`).join('')}</div><div class="notice">這場大考依累積能力、各科熟練度、精力與壓力模擬產生成績，不另出題。運氣只帶來小幅波動。${split?'本作分發簡化為所選分科科目的加權平均，不混採學測。':''}</div><details class="rules"><summary>先查看各示範科系需要的科目</summary><div class="requirements">${DEPTS.map(d=>`<p><b>${d.name}</b><span>${(split?d.split:d.subjects).join('、')}${d.field>=3?'；專長會影響申請表現':''}</span></p>`).join('')}</div></details></section><div class="button-row end">${btn(split?'準備好了，挑戰分科 →':'準備好了，參加學測 →',split?'take-division':'take-gsat','primary',selected.length?'':'disabled')}</div>`,3);
}
function renderExamResult(split = false) {
  const scores = split ? state.division : state.gsat;
  return shell(`${title('EXAM RESULT / 累積的答案',split?'這一次，你又向前了。':'三年的努力，有了新的回音。','接下來，把成績、專長與期待放在一起，選擇你的下一站。')}<div class="subject-grid exam-results">${Object.entries(scores).map(([s,n])=>`<div class="subject-tile"><span>${s}</span><strong>${n}</strong><small>最高 ${split?60:15} 級分</small></div>`).join('')}</div><div class="panel"><h3>你的升學檔案</h3><div class="file-grid"><p>在校排名<strong>前 ${state.rank}%</strong></p><p>學習歷程<strong>${Math.round(state.portfolio)} / 100</strong></p><p>自信<strong>${state.attrs[7]} / 100</strong></p></div><p class="muted">排名來自高一至高三上 15 回合綜合成績，與入學時生成的同校模擬同儕比較；高三下不再改變升學排名。</p></div><div class="button-row end">${btn(split?'選填分發志願 →':'繼續高三下的最後一學期 →',split?'open-distribution':'continue-senior')}</div>`,3);
}
function renderRoutes() {
  return shell(`${title('CHOOSE YOUR PATH / 大學升學','通往未來，不只有一條路。','看看你的排名、學測與作品，選擇這次想嘗試的升學方式。')}<div class="route-grid"><article class="route-card"><span class="route-number">01</span><h2>繁星推薦</h2><p>讓長期努力被看見。以在校排名與學測表現進行模擬推薦。</p><ul><li>前 50% 才能參加，各校另有門檻</li><li>本作簡化為選一個校系</li><li>錄取後可接受或放棄改考分科</li></ul>${btn('選擇繁星 →','choose-route','secondary',`data-route="star" ${state.rank>50||state.starUsed?'disabled':''}`)}${state.starUsed?'<small>已使用本輪推薦機會</small>':''}</article><article class="route-card featured"><span class="route-number">02</span><h2>個人申請</h2><p>讓分數之外的你被看見。用學測、學習歷程與專長爭取錄取。</p><ul><li>最多選填六個校系</li><li>先檢定學測，再綜合評分</li><li>依志願順序錄取第一個達標校系</li></ul>${btn('選擇個人申請 →','choose-route','primary','data-route="apply"')}</article><article class="route-card"><span class="route-number">03</span><h2>分科測驗</h2><p>想再挑戰一次？選考需要的科目，用新的成績尋找新的可能。</p><ul><li>八科可自由選考</li><li>每科最高六十級分</li><li>最多選填五十個志願</li></ul>${btn('直接挑戰分科 →','prepare-division','secondary')}</article></div><p class="notice">本作採簡化模擬規則，不等同現行招生制度。繁星錄取後，本作不再開放個人申請；放棄後可進入分科。</p>`,3);
}
function subjectEligibility(p) { return (state.route==='distribution'?p.split:p.subjects).every(s=>Object.hasOwn(state.route==='distribution'?state.division:state.gsat,s)); }
function programExam(p) {
  const split = state.route==='distribution';
  const names = split?p.split:p.subjects;
  const scores = split?state.division:state.gsat;
  // 第一採計科目權重2，其餘1。所有校系分別計分。
  const sum = names.reduce((n,s,i)=>n+(scores[s]||0)*(i===0?2:1),0);
  return sum/(names.length+1)/(split?60:15)*100;
}
function renderUniversities() {
  const route = state.route;
  const max = route==='star'?1:route==='apply'?6:50;
  const list = filtered(PROGRAMS);
  const names = {star:'繁星推薦',apply:'個人申請',distribution:'分發入學'};
  return shell(`${title(`CHAPTER 04 / ${names[route]}`,'把理想，排進你的志願序。',`目前提供 16 間虛構大學、80 個示範系組，最多選填 ${max} 個。缺少採計科目的校系無法加入。`)}<div class="inline-banner"><b>${names[route]}</b><span>${route==='distribution'?`分科：${Object.keys(state.division).join('、')}`:`學測：${Object.keys(state.gsat).join('、')} ／ 排名前 ${state.rank}%`}</span></div><details class="rules"><summary>查看本管道的模擬錄取公式</summary><p>${route==='star'?'學測加權百分成績 × 65%＋（100－排名百分比）× 35%。另須符合校排名門檻。':route==='apply'?'第一階段：學測加權百分成績達到校系門檻－15（最低20）。第二階段：學測55%＋學習歷程20%＋自信10%＋科系對應專長15%。':'僅以分科加權百分成績比較門檻，不額外加入人緣或專長分數。'} 第一採計科目權重為2，其餘為1。達門檻即錄取，依志願順序保留第一個達標校系；本版未模擬其他考生競爭與名額。</p></details>${filters(['公立','私立'])}<div class="catalog-layout"><div class="school-list">${list.map(p=>{const eligible=subjectEligibility(p)&&(route!=='star'||state.rank<=p.maxRank);return `<article class="school-card program-card"><div><div class="tags"><span>${p.type} · ${p.area}</span><span>模擬門檻 ${p.threshold}</span></div><h3>${p.university}<small>${p.name}</small></h3><p>採計：${(route==='distribution'?p.split:p.subjects).join('、')}${route==='star'?` ／ 校排名前 ${p.maxRank}%`:''}</p><span class="fit ${eligible?'good':'bad'}">${eligible?`你的採計成績 ${fmt(programExam(p))} / 100`:'尚未符合科目或排名資格'}</span></div>${btn(state.preferences.includes(p.id)?'已加入 ✓':'＋ 加入','add-preference','secondary',`data-id="${p.id}" ${!eligible||state.preferences.includes(p.id)||state.preferences.length>=max?'disabled':''}`)}</article>`;}).join('')||'<div class="panel empty">找不到符合篩選的校系。</div>'}</div>${preferencePanel(PROGRAMS,state.preferences,max,'submit-universities','送出志願，查看結果 →')}</div><div class="button-row">${route==='distribution'?btn('沒有合適校系，選擇重考','retake-ending','text-button'):btn('← 返回升學管道','back-routes','text-button')}</div>`,3);
}
function renderAdmissionResult() {
  const accepted = state.admission.accepted;
  const p = accepted ? PROGRAMS.find(p=>p.id===state.admission.program) : null;
  return shell(`${title('THE NEXT CHAPTER / 大學放榜',accepted?'恭喜，你的下一站到了。':'暫時沒有錄取，故事還沒結束。',accepted?'這張通知，裝著你一路累積的選擇與努力。':'可以重新整理志願、挑戰下一條管道，或帶著這次的經驗準備重考。')}${accepted?`<article class="admission-letter"><span class="eyebrow">YOUR ADMISSION LETTER</span><div class="letter-seal">錄取</div><h2>${p.university}</h2><h3>${p.name}</h3><p>${escapeHTML(state.name)} 同學，歡迎走向新的起點。</p><div class="letter-details"><span>${{star:'繁星推薦',apply:'個人申請',distribution:'分發入學'}[state.route]} · 第 ${state.admission.preference} 志願</span><span>模擬錄取分數 ${fmt(state.admission.score)} ／ 門檻 ${p.threshold}</span></div>${btn('接受錄取，回顧我的旅程 →','accept-admission')}</article>`:''}<details class="panel review" ${accepted?'':'open'}><summary>查看本次志願結果</summary>${state.admission.results.map(r=>{const d=PROGRAMS.find(p=>p.id===r.id);return `<div class="review-item"><b>${d.university} · ${d.name}</b><p>${r.reason} ／ 模擬分數 ${fmt(r.score)}</p></div>`;}).join('')}</details><div class="button-row">${state.route==='star'&&!accepted?btn('改走個人申請 →','failed-star-apply','secondary'):''}${state.route==='apply'&&!accepted?btn('調整申請志願','revise-applications','secondary'):''}${state.route!=='distribution'?btn(accepted?'放棄本次錄取，挑戰分科':'挑戰分科測驗 →','prepare-division','secondary'):''}${state.route==='distribution'&&!accepted?btn('重新調整分發志願','revise-distribution','secondary'):''}${btn(accepted?'放棄錄取，選擇重考':'選擇重考，回顧旅程','retake-ending','text-button')}</div><p class="notice">接受錄取就結束本輪旅程；放棄錄取後，原錄取資格不保留。個申結果不如預期也可改走分科。</p>`,3);
}
function renderEnding() {
  const isAdmitted = state.ending==='admitted';
  const p = isAdmitted ? PROGRAMS.find(x=>x.id===state.admission.program) : null;
  const best = state.attrs.slice(0,6).indexOf(Math.max(...state.attrs.slice(0,6)));
  const labels = ['人文觀察家','科學探索者','語言旅人','運動行動派','視覺創作者','音樂追夢人'];
  const growth = state.attrs.slice(0,6).map((n,i)=>n-state.initialAttrs[i]);
  const improved = growth.indexOf(Math.max(...growth));
  const evaluation = `${state.name}，從會考的 ${fmt(state.cap.total)} 分出發，你在${state.school.name}走過了六個學期。${ATTR[improved]}是你進步最多的領域，累積提升了 ${growth[improved]} 點；${state.portfolio>=60?'持續累積的作品與活動，也成為你升學檔案中的亮點。':'你在課業與生活之間摸索自己的節奏，留下了屬於自己的選擇。'}${isAdmitted?`最後，你透過${{star:'繁星推薦',apply:'個人申請',distribution:'分發入學'}[state.route]}，走進${p.university}${p.name}。`:'這次你選擇再準備一年。回顧採計科目與自己的專長，會比只追求所有科目都高分，更有助於下一次出發。'}${state.stress>70?'下段旅程，記得也為休息留一點位置。':'願你帶著這些經驗，繼續探索自己想成為的樣子。'}`;
  return shell(`${title('EPILOGUE / 你的升學故事',isAdmitted?'準大學生，準備出發。':'重考生，新的篇章正在等你。','終點是一個名字，旅程是你自己走出來的。')}<section class="ending-card"><span class="ending-flower">✳</span><span class="eyebrow">${isAdmitted?'A NEW BEGINNING':'ANOTHER CHANCE'}</span><h2>${isAdmitted?p.university:'下一次，帶著經驗再出發。'}</h2><p>${isAdmitted?p.name:'暫停一下，不代表失去方向。'}</p><div class="tags centered"><span>${labels[best]}</span>${state.attrs[6]>=65?'<span>可靠的夥伴</span>':''}${state.portfolio>=60?'<span>實作累積者</span>':''}</div></section><article class="panel evaluation"><h2>寫給 ${escapeHTML(state.name)} 的旅程評語</h2><p>${escapeHTML(evaluation)}</p></article><div class="timeline"><div><span>起點</span><b>會考 ${fmt(state.cap.total)} / 36</b></div><div><span>三年校園</span><b>${state.school.name}</b></div><div><span>成長</span><b>${ATTR[improved]} ＋${growth[improved]}</b></div><div><span>下一站</span><b>${isAdmitted?'準大學生':'重考生'}</b></div></div><section class="panel"><h3>最後的能力檔案</h3><div class="ending-attrs">${attributeBars()}</div></section><div class="button-row end">${btn('下載旅程紀錄','download-story','secondary')}${btn('再寫一個不同的故事 ↗','restart')}</div>`,4);
}
function render() {
  $('#restart-button').hidden = !state;
  if (welcome || !state) app.innerHTML = renderWelcome();
  else {
    const views = {quiz:renderQuiz,essay:renderEssay,cap:renderCAP,highschools:renderHighSchools,schoolResult:renderSchoolResult,round:renderRound,roundResult:renderRoundResult,gsatSelect:()=>renderExamSelection(),gsatResult:()=>renderExamResult(),routes:renderRoutes,universities:renderUniversities,admissionResult:renderAdmissionResult,divisionSelect:()=>renderExamSelection(true),divisionResult:()=>renderExamResult(true),ending:renderEnding};
    app.innerHTML = views[state.stage]();
  }
}

function enterSchool() {
  const score = Object.fromEntries(state.cap.scores.map(s=>[s.subject,s.raw]));
  state.attrs = [score.社會*.28+22,(score.數學+score.自然)*.14+22,(score.國文+score.英文)*.14+22,30+state.cap.general*4,30+state.cap.general*4,30+state.cap.general*4,45,45,45].map(n=>Math.round(n));
  state.attrs[state.school.boost] = clamp(state.attrs[state.school.boost]+5);
  state.initialAttrs = [...state.attrs];
  state.proficiency = {國文:25,英文:25,數學A:20,數學B:25,自然:25,社會:25};
  state.energy = 85; state.stress = 20; state.points = 0; state.portfolio = 5;
  state.round = 0; state.history = []; state.rank = null;
  state.eventOrder = EVENTS.map((_,i)=>i);
  for (let i=state.eventOrder.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [state.eventOrder[i],state.eventOrder[j]]=[state.eventOrder[j],state.eventOrder[i]];}
  const peerBase = 45 + state.school.threshold * .8;
  state.peers = Array.from({length:99},()=>clamp(peerBase+(random()+random()+random()-1.5)*23,25,95));
  resetRound(); go('round');
}
function resetRound() { state.actions=Array(8).fill(0); state.eventChoice=null; }
function addAttr(i,n) { state.attrs[i]=clamp(state.attrs[i]+n); }
function resolveRound() {
  if (state.actions.reduce((a,b)=>a+b,0)!==3 || state.eventChoice===null) return;
  state.actions.forEach((times,i)=>{
    const a=ACTIONS[i];
    for(let t=0;t<times;t++) {
      if(a.attr!==null) addAttr(a.attr,2);
      state.energy=clamp(state.energy-a.cost); state.stress=clamp(state.stress+a.stress);
      if(i===0) {state.proficiency.國文=clamp(state.proficiency.國文+4);state.proficiency.社會=clamp(state.proficiency.社會+6);}
      if(i===1) for(const s of ['數學A','數學B','自然']) state.proficiency[s]=clamp(state.proficiency[s]+5);
      if(i===2) {state.proficiency.國文=clamp(state.proficiency.國文+4);state.proficiency.英文=clamp(state.proficiency.英文+6);}
      if(i===4||i===5) state.portfolio=clamp(state.portfolio+3);
      if(i===6) { addAttr(7,1); Object.keys(state.proficiency).forEach(s=>state.proficiency[s]=clamp(state.proficiency[s]+2)); }
    }
  });
  const e=EVENTS[state.eventOrder[state.round]], c=e.choices[state.eventChoice];
  for(const [i,n] of Object.entries(c[1])) addAttr(Number(i),n);
  state.stress=clamp(state.stress+c[2]); state.energy=clamp(state.energy+c[3]); state.portfolio=clamp(state.portfolio+c[4]);
  // 課內學習的自然累積讓各種養成路線都有基本進步。
  Object.keys(state.proficiency).forEach(s=>state.proficiency[s]=clamp(state.proficiency[s]+2));
  const academic=(state.attrs[0]+state.attrs[1]+state.attrs[2])/3;
  const mastery=Object.values(state.proficiency).reduce((a,b)=>a+b,0)/6;
  const condition=state.energy*.08-state.stress*.09+(state.attrs[7]-50)*.04;
  const daily=Math.round(clamp(48+academic*.32+state.attrs[6]*.12+condition+random()*5));
  const quiz=Math.round(clamp(25+academic*.42+mastery*.28+condition+(random()-.5)*10));
  const exam=Math.round(clamp(22+academic*.48+mastery*.3+condition+(random()-.5)*(10-state.attrs[8]*.04)));
  const total=Math.round(daily*.2+quiz*.2+exam*.6);
  const earned=total<60?3:total<70?4:total<80?5:total<90?6:7;
  state.points+=earned;
  state.lastRound={daily,quiz,exam,total,earned,term:termName(state.round),event:e.title,choice:c[0]};
  state.history.push({...state.lastRound});
  if(state.round===14) {
    const avg=state.history.reduce((a,b)=>a+b.total,0)/15;
    state.rank=1+state.peers.filter(n=>n>avg).length;
  }
  // 每回合間有固定休息，避免精力不可逆地耗盡。
  state.energy=clamp(state.energy+18); state.stress=clamp(state.stress-5);
  go('roundResult');
}
function takeExam(split=false) {
  const selected=split?state.splitSubjects:state.gsatSubjects;
  if(!selected.length)return;
  const result={};
  selected.forEach(s=>{
    const social=['社會','歷史','地理','公民與社會'].includes(s);
    const lang=['國文','英文'].includes(s);
    const ability=lang?(s==='國文'?state.attrs[2]*.65+state.attrs[0]*.35:state.attrs[2]):social?state.attrs[0]:state.attrs[1];
    const mastery=state.proficiency[split?(social?'社會':s==='數學甲'?'數學A':s==='數學乙'?'數學B':'自然'):s];
    const difficulty=['數學A','數學甲'].includes(s)?7:0;
    const raw=clamp(ability*.63+mastery*.37+state.energy*.07-state.stress*.065+(state.attrs[7]-50)*.035+(random()-.5)*(10-state.attrs[8]*.04)-difficulty+(split?5:0));
    result[s]=clamp(Math.round(raw/100*(split?60:15)),1,split?60:15);
  });
  if(split) {state.division=result;go('divisionResult');}
  else {state.gsat=result;go('gsatResult');}
}
async function submitUniversities() {
  if(!state.preferences.length)return;
  const route=state.route;
  const results=[];
  let accepted=null;
  for(let i=0;i<state.preferences.length;i++) {
    const p=PROGRAMS.find(p=>p.id===state.preferences[i]);
    if(!p||!subjectEligibility(p))throw new Error('志願資格不符合，請重新選擇。');
    const r=await api('admission',{route,exam:programExam(p),portfolio:state.portfolio,confidence:state.attrs[7],talent:state.attrs[p.field],threshold:p.threshold,rank:state.rank,maxRank:p.maxRank});
    results.push({...r,id:p.id});
    if(r.accepted) {accepted={...r,program:p.id,preference:i+1};break;}
  }
  state.admission={accepted:!!accepted,...accepted,results};
  if(route==='star')state.starUsed=true;
  go('admissionResult');
}
function setRoute(route) {state.route=route;state.preferences=[];filter={search:'',type:'全部',area:'全部'};go('universities');}
function prepareDivision() {
  if(state.stage==='admissionResult'&&state.admission.accepted) {
    showDecision('放棄這次錄取，挑戰分科？','確認後原錄取資格不保留，將以分科成績重新選填志願。',()=>{state.admission=null;state.splitSubjects=['數學乙','歷史','地理','公民與社會'];go('divisionSelect');});
  } else {state.admission=null;state.splitSubjects=['數學乙','歷史','地理','公民與社會'];go('divisionSelect');}
}
function showDecision(heading,text,callback) {
  const old=$('#decision-dialog'); if(old)old.remove();
  const d=document.createElement('dialog');d.id='decision-dialog';d.innerHTML=`<div class="dialog-content"><h2>${heading}</h2><p>${text}</p><div class="button-row"><button class="secondary" data-cancel>再想想</button><button class="primary" data-confirm>確定</button></div></div>`;document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{d.close();callback();};d.showModal();
}
function finishRetake() {showDecision('選擇重考，結束這輪旅程？','這會結束目前的升學選擇，保留旅程紀錄與評語。',()=>{state.ending='retake';go('ending');});}

app.addEventListener('submit',async event=>{
  if(event.target.id!=='start-form')return;
  event.preventDefault();if(busy)return;
  const name=$('#player-name').value.trim();if(!name){toast('先填寫你的名字或暱稱。');return;}
  const start=async()=>{
    busy=true;const button=$('#start-form button');button.disabled=true;button.textContent='準備題目中…';
    try {const data=await api('exam');state={version:1,stage:'quiz',name,questions:data.questions,answers:Array(18).fill(null),qIndex:0,essay:'',seed:(Date.now()>>>0)||1234567};welcome=false;go('quiz');}
    catch(e){toast('無法取得題目：'+(e.name==='AbortError'?'連線逾時，請確認 Java 伺服器仍在執行。':e.message));render();}
    finally{busy=false;}
  };
  if(state)showDecision('開始新的故事？','目前儲存的旅程會被新遊戲取代。',start);else await start();
});
app.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled||busy)return;
  const action=b.dataset.action;
  try {
    if(action==='resume'){welcome=false;render();return;}
    if(action==='restart'){$('#restart-dialog').showModal();return;}
    if(action==='answer'){state.answers[state.qIndex]=Number(b.dataset.value);save();render();}
    else if(action==='previous-question'){state.qIndex=Math.max(0,state.qIndex-1);go('quiz');}
    else if(action==='next-question'){if(state.answers[state.qIndex]===null)return;if(state.qIndex===17)go('essay');else{state.qIndex++;go('quiz');}}
    else if(action==='back-quiz')go('quiz');
    else if(action==='submit-exam'){
      const n=[...(state.essay||'').trim()].length;if(n<40||n>300){toast('請先完成 40～300 字的寫作任務。');return;}
      busy=true;b.disabled=true;b.textContent='批改中…';
      const cap=await api('grade',{ids:state.questions.map(q=>q.id).join(','),answers:state.answers.join(','),essay:state.essay});state.cap=cap;go('cap');
    }
    else if(action==='open-highschools'){state.preferences=[];filter={search:'',type:'全部',area:'全部'};go('highschools');}
    else if(action==='add-preference'){
      const isHigh=state.stage==='highschools',max=isHigh?5:state.route==='star'?1:state.route==='apply'?6:50;
      const item=(isHigh?HIGH_SCHOOLS:PROGRAMS).find(s=>s.id===b.dataset.id);
      if(!item||state.preferences.length>=max||state.preferences.includes(item.id)||(!isHigh&&!subjectEligibility(item)))return;
      state.preferences.push(item.id);save();render();
    }
    else if(action==='remove-preference'){state.preferences=state.preferences.filter(id=>id!==b.dataset.id);save();render();}
    else if(action==='move-preference'){const i=state.preferences.indexOf(b.dataset.id),j=i+Number(b.dataset.dir);if(i<0||j<0||j>=state.preferences.length)return;[state.preferences[i],state.preferences[j]]=[state.preferences[j],state.preferences[i]];save();render();}
    else if(action==='submit-highschools'){
      if(!state.preferences.length)return;
      const index=state.preferences.findIndex(id=>HIGH_SCHOOLS.find(s=>s.id===id).threshold<=state.cap.total);
      if(index===-1){state.supplement=true;state.preferences=[];filter={search:'',type:'全部',area:'全部'};go('highschools');toast('本次志願未錄取，已開放符合積分的續招選擇。');}
      else{state.school=HIGH_SCHOOLS.find(s=>s.id===state.preferences[index]);state.schoolPreference=index+1;go('schoolResult');}
    }
    else if(action==='enter-school')enterSchool();
    else if(action==='change-action'){const i=Number(b.dataset.id),d=Number(b.dataset.dir);if(state.actions[i]+d<0||state.actions.reduce((a,b)=>a+b,0)+d>3)return;state.actions[i]+=d;save();render();}
    else if(action==='event-choice'){state.eventChoice=Number(b.dataset.id);save();render();}
    else if(action==='resolve-round')resolveRound();
    else if(action==='allocate-point'){const i=Number(b.dataset.id),cost=talentCost(state.attrs[i]);if(state.points<cost||state.attrs[i]>=100)return;state.points-=cost;addAttr(i,1);save();render();}
    else if(action==='next-round'){
      if(state.round===14){state.gsatSubjects=['國文','英文','數學B','社會'];go('gsatSelect');}
      else if(state.round===17)go('routes');
      else{state.round++;resetRound();go('round');}
    }
    else if(action==='take-gsat')takeExam();
    else if(action==='continue-senior'){state.round=15;resetRound();go('round');}
    else if(action==='choose-route')setRoute(b.dataset.route);
    else if(action==='back-routes')go('routes');
    else if(action==='prepare-division')prepareDivision();
    else if(action==='take-division')takeExam(true);
    else if(action==='open-distribution')setRoute('distribution');
    else if(action==='submit-universities'){busy=true;b.disabled=true;b.textContent='正在模擬錄取…';await submitUniversities();}
    else if(action==='failed-star-apply')setRoute('apply');
    else if(action==='revise-applications')setRoute('apply');
    else if(action==='revise-distribution')setRoute('distribution');
    else if(action==='accept-admission'){state.ending='admitted';go('ending');}
    else if(action==='retake-ending')finishRetake();
    else if(action==='download-story'){
      const p=state.ending==='admitted'?PROGRAMS.find(x=>x.id===state.admission.program):null;
      const text=`呆丸升學模擬｜${state.name}的旅程\n結局：${state.ending==='admitted'?'準大學生':'重考生'}\n會考：${state.cap.total}/36\n高中職：${state.school.name}\n在校排名：前${state.rank}%\n學測：${JSON.stringify(state.gsat)}\n分科：${JSON.stringify(state.division||{})}\n${p?'大學：'+p.university+' '+p.name:''}\n\n${$('.evaluation p').textContent}\n\n能力：\n${ATTR.map((a,i)=>`${a}：${state.attrs[i]}`).join('\n')}\n\n校園回憶：\n${state.history.map(h=>`${h.term} ${h.event} → ${h.choice}；綜合成績 ${h.total}`).join('\n')}`;
      const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='呆丸升學旅程.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  } catch(e){toast('操作未完成：'+(e.name==='AbortError'?'連線逾時，請確認伺服器後重試。':e.message));render();}
  finally{busy=false;}
});
app.addEventListener('input',event=>{
  if(event.target.id==='essay'){state.essay=event.target.value;save();$('#essay-count').textContent=`${[...state.essay].length} / 300 字`;}
  if(event.target.id==='catalog-search'){
    const start=event.target.selectionStart;filter.search=event.target.value;render();$('#catalog-search').focus();$('#catalog-search').setSelectionRange(start,start);
  }
});
app.addEventListener('change',event=>{
  if(event.target.id==='catalog-type'){filter.type=event.target.value;render();}
  if(event.target.id==='catalog-area'){filter.area=event.target.value;render();}
  if(event.target.name==='exam-subject'){
    const field=state.stage==='divisionSelect'?'splitSubjects':'gsatSubjects';
    state[field]=Array.from(app.querySelectorAll('[name="exam-subject"]:checked'),x=>x.value);save();render();
  }
});
$('#help-button').onclick=()=>$('#help-dialog').showModal();
$('#close-help').onclick=()=>$('#help-dialog').close();
$('#restart-button').onclick=()=>$('#restart-dialog').showModal();
$('#cancel-restart').onclick=()=>$('#restart-dialog').close();
$('#confirm-restart').onclick=()=>{
  state=null;welcome=true;try{localStorage.removeItem(KEY);}catch{}$('#restart-dialog').close();$('#save-status').textContent='你的故事，從這裡開始';render();window.scrollTo(0,0);
};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
render();
