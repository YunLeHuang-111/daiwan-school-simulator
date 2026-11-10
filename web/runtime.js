/* Browser-only runtime for static hosting. Mirrors the Java single-player rules. */
(function (root) {
'use strict';
const GSAT=['國文','英文','數學A','數學B','自然','社會'];
const SPLIT=['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會'];
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))|0;return h;};
class JavaRandom {
 constructor(seed){this.seed=(BigInt(seed)^0x5deece66dn)&((1n<<48n)-1n);}
 next(bits){this.seed=(this.seed*0x5deece66dn+11n)&((1n<<48n)-1n);return Number(this.seed>>BigInt(48-bits));}
 nextInt(bound){if((bound&-bound)===bound)return Math.floor(bound*this.next(31)/2147483648);let bits,value;do{bits=this.next(31);value=bits%bound;}while(((bits-value+bound-1)|0)<0);return value;}
 nextBoolean(){return this.next(1)!==0;}
 nextDouble(){return (this.next(26)*134217728+this.next(27))/9007199254740992;}
}
function num(v,min,max){if(v===undefined||v===null||String(v).trim()==='')throw Error('缺少數值。');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('數值超出允許範圍。');return n;}
function int(v,min,max){const n=num(v,min,max);if(!Number.isInteger(n))throw Error('選項必須是整數。');return n;}
const seed=f=>int(f.seed??1,0,4294967295);
const vector=v=>{const a=String(v??'').split(',');if(a.length!==5)throw Error('需要五項能力。');return a.map(x=>num(x,0,100));};
function labels(f){if(f.mode==='term'){int(f.round,0,5);return ['流行文化','生活推理'];}const allowed=f.mode==='gsat'?GSAT:f.mode==='split'?SPLIT:[],a=String(f.subjects??'').split(',');if(!a.length||new Set(a).size!==a.length||a.some(s=>!allowed.includes(s)))throw Error('請選擇有效且不重複的應考科目。');return a;}
function sources(s){return ({'流行文化':['校園趣聞','影視','動漫','體育','時事','音樂'],'生活推理':['校園趣聞','國文','英文','數學','自然','歷史','地理','公民','藝術','常識'],'數學A':['數學'],'數學B':['數學'],'數學甲':['數學'],'數學乙':['數學'],'自然':['自然','物理','化學','生物'],'社會':['歷史','地理','公民'],'公民與社會':['公民']})[s]||[s];}
function ability(s){if(['國文','英文'].includes(s))return 1;if(['歷史','地理','公民','公民與社會','社會','流行文化'].includes(s))return 2;return s==='藝術'?3:s==='音樂'?4:0;}
function active(q){return !(q.difficulty>2&&(q.subject==='英文'||q.subject==='數學'&&!q.id.startsWith('advanced-match-')&&!q.id.startsWith('math-concept-')&&!q.id.startsWith('match-bank-math-')))&&!(q.subject==='英文'&&['Literary bookshelf','Authors and works'].includes(q.theme))&&!(q.subject==='數學'&&['數學史與解謎','數學史','典籍考古'].includes(q.theme))&&!(q.subject==='音樂'&&['歌詞選字','歌手點名','emoji猜歌','歌名謎語'].includes(q.theme));}
const norm=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,'');
function songKey(q){
 if(q.subject!=='音樂')return '';
 const title=q.theme==='歌詞猜歌名'?q.options[Number(q.key)]:q.text.match(/《([^》]+)》/)?.[1];
 return title?'song:'+title:'';
}
function questionFingerprints(q){
 if(q.type==='match'){
  const keys=q.key.split(',').map(Number);
  return ['pairs:'+q.left.map((text,i)=>norm(text)+'='+norm(q.options[keys[i]])).sort().join('|')];
 }
 if(q.type==='choice'){
  const answer=norm(q.options[Number(q.key)]);
  if(/[\p{L}]{2}/u.test(answer)){
   const distractors=q.options.map(norm).filter(option=>option!==answer).sort();
   return distractors.flatMap((left,i)=>distractors.slice(i+1).map(right=>'options:'+answer+'|'+left+'|'+right));
  }
 }
 return [];
}
function questionPrompt(q){
 return norm(q.text).replace(/[\p{P}\p{S}]/gu,'');
}
function questionCategory(q){
 if(q.subject==='校園趣聞')return q.theme;
 if(q.subject==='體育'&&/棒球|職棒|投手|打者|壘/.test(q.text))return '棒球';
 if(q.theme.includes('麻將'))return '麻將';
 return q.subject+'：'+q.theme;
}
function termCategory(q){
 if(q.subject==='校園趣聞')return q.theme==='銀幕世界'?'影視':q.theme;
 if(q.subject==='地理')return '臺灣旅行';
 if(q.subject==='常識')return '麻將';
 if(q.subject==='影視'&&['台劇','韓劇','泰劇','甄嬛傳'].includes(q.theme))return q.theme;
 if(q.subject==='時事')return q.theme.includes('中職')||q.text.includes('台灣大賽')?'棒球':q.theme.endsWith('新聞')&&q.theme!=='足球新聞'?'時事':'其他運動';
 if(q.subject==='音樂')return q.theme.startsWith('K-pop')?'韓流':'歌曲';
 if(q.subject==='體育')return questionCategory(q)==='棒球'?'棒球':'其他運動';
 return q.subject;
}
function termQuestion(q){
 return ['校園趣聞','影視','動漫','體育','音樂','時事'].includes(q.subject)
  ||q.theme==='臺灣走走'||q.theme.includes('麻將');
}
function rememberQuestion(q,used,prompts,facts,categories){
 used.add(q.id);
 prompts.add(questionPrompt(q));
 for(const fingerprint of questionFingerprints(q))facts.add(fingerprint);
 const song=songKey(q);
 if(song)used.add(song);
 const category=questionCategory(q);
 categories.set(category,(categories.get(category)||0)+1);
}
class Engine {
 constructor(data){this.data=data;this.questions=new Map(data.questions.map(q=>[q.id,q]));this.programs=new Map(data.programs.map(p=>[p.id,p]));}
 request(path,f){switch(path){case 'enroll':return this.enroll(f);case 'paper':return this.paper(f);case 'grade':return this.grade(f);case 'answer':return this.reviewAnswer(f,labels(f),f.id,f.label,f.answer,f.ms);case 'admission':return this.admission(f);default:throw Error('找不到這個API。');}}
 enroll(f){if(!['male','female'].includes(f.gender)||!['公立','私立'].includes(f.schoolType))throw Error('請選擇性別與公私立偏好。');const r=new JavaRandom(seed(f)),all=this.data.schools.filter(s=>s.type===f.schoolType&&(s.gender==='all'||s.gender===f.gender));let draw=r.nextInt(all.reduce((a,s)=>a+s.weight,0)),school=all[0];for(const s of all){draw-=s.weight;if(draw<0){school=s;break;}}const attrs=[],aptitude=[];for(const b of school.base){attrs.push(Math.max(0,Math.min(100,b+r.nextInt(7)-3)));aptitude.push(Math.max(20,Math.min(85,b+8+(school.tier-3)*2+r.nextInt(11)-5)));}const {weight,...publicSchool}=school;return {school:publicSchool,attrs,aptitude};}
 pick(label,type,level,used,seen,current,facts,categories,r,theme,term,termCounts,paperSeed){
  let candidates=this.data.questions.filter(q=>sources(label).includes(q.subject)&&q.type===type&&active(q)&&(!term||(
    (paperSeed%6===0||!q.theme.includes('麻將'))&&
    (paperSeed%4!==1||!q.theme.includes('柯南')&&!q.text.includes('柯南'))&&
    (paperSeed%4!==2||termCategory(q)!=='棒球')))
   &&!used.has(q.id)&&!current.has(questionPrompt(q))&&!questionFingerprints(q).some(key=>facts.has(key))&&!used.has(songKey(q)));
  if(!candidates.length)throw Error('本科題庫不足，無法再抽出未作答的題目。');
  if(type==='match'&&label.startsWith('數學')){
   const tier=candidates.filter(q=>level===3?q.difficulty===3:q.id.startsWith('match-bank-math-b-'));
   if(tier.length)candidates=tier;
  }
  if(type==='match'){
   // Prefer the oldest question only after every candidate has appeared recently.
   const recency=new Map([...seen].map((id,i)=>[id,i]));
   const fresh=candidates.filter(q=>!recency.has(q.id));
   if(fresh.length)candidates=fresh;
   else{
    const oldest=Math.min(...candidates.map(q=>recency.get(q.id)));
    candidates=candidates.filter(q=>recency.get(q.id)===oldest);
   }
  }
  const focus=label.startsWith('數學')&&type!=='match'?'math-concept-':
   label==='國文'&&type==='match'&&paperSeed%4!==0?'chinese-modern-':'';
  if(focus){
   const preferred=candidates.filter(q=>q.id.startsWith(focus)||focus==='chinese-modern-'&&q.id.startsWith('match-bank-chinese-'));
   if(preferred.length)candidates=preferred;
  }
  if(term){
   const local=new Map();
   for(const id of used){
    const q=this.questions.get(id);
    if(q&&q.type==='choice'&&termQuestion(q)){
     const k=termCategory(q);local.set(k,(local.get(k)||0)+1);
    }
   }
   const leisure=candidates.filter(termQuestion);
   if(leisure.length)candidates=leisure;
   const least=Math.min(...candidates.map(q=>local.get(termCategory(q))||0));
   candidates=candidates.filter(q=>(local.get(termCategory(q))||0)===least);
   const recent=Math.min(...candidates.map(q=>termCounts.get(termCategory(q))||0));
   candidates=candidates.filter(q=>(termCounts.get(termCategory(q))||0)===recent);
  }
  const leastUsed=Math.min(...candidates.map(q=>categories.get(questionCategory(q))||0));
  if(!term&&!theme&&type!=='match')candidates=candidates.filter(q=>(categories.get(questionCategory(q))||0)===leastUsed);
  if(type!=='match'){
   const fresh=candidates.filter(q=>!seen.has(q.id));
   if(fresh.length)candidates=fresh;
  }
  const themed=candidates.filter(q=>q.theme===theme);
  if(themed.length)candidates=themed;
  const difficultyGap=q=>Math.abs(q.difficulty-(term&&q.theme==='柯南案卷'?2:level));
  const distance=Math.min(...candidates.map(difficultyGap));
  const nearest=candidates.filter(q=>difficultyGap(q)===distance);
  const q=nearest[r.nextInt(nearest.length)];
  rememberQuestion(q,used,current,facts,categories);
  const {key,explanation,...question}=q;
  return {...question,examSubject:label};
 }
 paper(f){const subjects=labels(f);if(f.mode==='split'&&!['star','apply'].includes(f.previousRoute))throw Error('先完成繁星或個申放榜，再參加分科。');const attrs=vector(f.attrs??'40,40,40,40,40'),used=new Set(String(f.used??'').split(',').filter(Boolean)),seen=new Set(String(f.seen??'').split(',')),current=new Set(),facts=new Set(),categories=new Map();
  for(const id of [...used]){
   const q=this.questions.get(id);
   if(!q)continue;
   rememberQuestion(q,used,current,facts,categories);
  }
  const termCounts=new Map();
  for(const id of String(f.termHistory??'').split(',').slice(-72)){
   const q=this.questions.get(id);
   if(!q||q.type!=='choice'||!termQuestion(q))continue;
   const k=termCategory(q);termCounts.set(k,(termCounts.get(k)||0)+1);
  }
  const paperSeed=seed(f);
  const r=new JavaRandom(BigInt(paperSeed)^BigInt(hash(f.mode))^BigInt(hash(String(f.round??'0')))^BigInt(hash('['+subjects.join(', ')+']')));const questions=[],per=f.mode==='term'?1:3;
  for(const label of subjects)for(let j=0;j<per;j++){const type=f.mode==='term'?'choice':j===0?'choice':j===1?'match':label==='英文'?'choice':'fill';const a=attrs[ability(label)];let level=f.mode==='term'?(a<45&&Number(f.round)<2?2:3):j===0?2:3;if(a>=75||['數學A','數學甲'].includes(label))level=3;if(label==='英文')level=2;if(label.startsWith('數學'))level=['數學A','數學甲'].includes(label)?3:2;const theme=label==='英文'?(j===1?(r.nextBoolean()?'Screen matching':'Grammar matching'):j===0?'Movie clues':'Grammar practice'):label.startsWith('數學')?(type==='choice'&&r.nextBoolean()?'數學家點名':''):'';questions.push(this.pick(label,type,level,used,seen,current,facts,categories,r,theme,f.mode==='term',termCounts,paperSeed));}
  return {mode:f.mode,questions};
 }
 fraction(q,a){if(q.type==='choice')return int(a,0,q.options.length-1)===Number(q.key)?1:0;if(q.type==='fill'){if(!String(a??'').trim()||String(a).length>80)throw Error('請完成短填答（最多80字元）。');return q.key.split('/').some(k=>norm(k)===norm(a))?1:0;}const parts=String(a??'').split(',');if(parts.length!==q.left.length)throw Error('請完成所有配對。');const indices=parts.map(v=>int(v,0,q.options.length-1));if(new Set(indices).size!==parts.length)throw Error('配對選項不可重複。');const keys=q.key.split(',').map(Number);return indices.filter((v,i)=>v===keys[i]).length/parts.length;}
 reviewAnswer(f,subjects,id,label,answer,time){
  const q=this.questions.get(id);
  if(!q)throw Error('題目不存在。');
  if(!subjects.includes(label)||!sources(label).includes(q.subject))throw Error('試題不屬於所選科目。');
  if(label==='英文'&&q.type==='fill')throw Error('英文不使用填答題。');
  const limit=label.startsWith('數學')?60000:30000,choice=f.mode!=='term'&&f.timed==='1'&&q.type==='choice';
  const ms=choice?int(time,0,limit):0;
  const fraction=choice&&ms>=limit?0:this.fraction(q,answer);
  const result={id,fraction,correct:fraction===1,answer:q.key,explanation:q.explanation};
  if(choice){
   const edges=limit===60000?[8000,15000,20000,30000]:[5000,8000,10000,15000];
   result.points=fraction===1?5-edges.filter(edge=>ms>edge).length:0;
  }
  return result;
 }
 grade(f){
  const subjects=labels(f),ids=String(f.ids??'').split(','),term=f.mode==='term',timed=!term&&f.timed==='1';
  if(ids.length!==(term?2:subjects.length*3)||new Set(ids).size!==ids.length)throw Error('試卷題數不符或題號重複。');
  const grades=new Map(subjects.map(s=>[s,{earned:0,weight:0,points:0,choices:0,count:0}]));
  let correct=0,sum=0,weight=0;
  const review=ids.map((id,i)=>{
   const q=this.questions.get(id),label=f['label'+i],grade=grades.get(label);
   const result=this.reviewAnswer(f,subjects,id,label,f['a'+i],f['ms'+i]);
   const {fraction,points}=result;
   if(fraction===1)correct++;
   grade.count++;
   if(points!=null){
    grade.choices++;
    grade.points+=points;
   }else{
    grade.earned+=fraction*q.difficulty;
    grade.weight+=q.difficulty;
   }
   sum+=fraction*q.difficulty;weight+=q.difficulty;
   return result;
  });
  if([...grades.values()].some(g=>g.count!==(term?1:3)))throw Error('各科題數不符。');
  if(term)return {correct,exam:Math.round(sum/weight*100),review};
  const multiplier=f.mode==='gsat'?1:4;
  const scores=Object.fromEntries([...grades].map(([label,g])=>[
   label,Math.round(multiplier*(g.points+(g.weight?g.earned/g.weight*(15-g.choices*5):0)))
  ]));
  if(f.mode==='gsat'&&f.aptitude!==undefined){
   const aptitude=vector(f.aptitude),attrs=vector(f.attrs);
   const rawScores={...scores};
   for(const label of subjects){
    const i=ability(label),raw=rawScores[label],readiness=aptitude[i]*.65+attrs[i]*.35;
    if(readiness<55)scores[label]=Math.max(0,raw-1);
    else if(readiness>=76&&raw>=4&&raw<14)scores[label]=raw+1;
   }
   return {scores,rawScores,correct,review};
  }
  return {scores,correct,review};
 }
 admission(f){const route=f.route;if(!['star','apply','distribution'].includes(route))throw Error('未知升學管道。');const ids=String(f.preferences??'').split(','),limit=route==='distribution'?10:3;if(ids.length>limit||!ids.length||new Set(ids).size!==ids.length)throw Error('志願數量不符。');const choices=ids.map(id=>this.programs.get(id));if(choices.some(p=>!p))throw Error('校系不存在。');if(route==='star'&&(new Set(choices.map(p=>p.university)).size!==1||new Set(choices.map(p=>p.group)).size!==1))throw Error('繁星僅能選一校、一類組，至多三系。');const p=this.programs.get(f.program);if(!p||!ids.includes(p.id))throw Error('校系不在志願內。');const attrs=vector(f.attrs),apt=vector(f.aptitude),portfolio=num(f.portfolio,0,100),rank=num(f.rank,1,100),split=route==='distribution',subjects=split?p.split:p.subjects;
  const sum=subjects.reduce((n,s,i)=>n+num(f['s.'+s],0,split?60:15)*(i===0?2:1),0),exam=sum/(subjects.length+1)/(split?60:15)*100,talent=p.weights.reduce((n,w,i)=>n+(attrs[i]*.65+apt[i]*.35)*w,0);
  const art=['ntua','tnua','tnnua'].includes(p.university);
  const apply=route==='apply';
  const examFloor=apply?(p.applyFloor??(art?55:Math.min(p.examFloor,94))):art?Math.min(p.examFloor,55):p.examFloor;
  if(apply&&f.phase==='screen'){
   const accepted=exam>=examFloor;
   return {accepted,score:Math.round(exam*10)/10,floor:examFloor,chance:accepted?100:0,
    reason:accepted?'通過一階':'未達一階學測門檻'};
  }
  const interview=apply?num(f.interview??80,0,100):0;
  let score;
  if(apply)score=exam*.4+talent*.3+interview*.3;
  else if(route==='star')score=exam*.25+num(f.schoolScore??100-rank,0,100)*.75;
  else score=art?exam*.25+talent*.75:exam*.7+talent*.3;
  const talentFloor=art?Math.max(p.talentFloor,58):apply?0:p.talentFloor;
  const rankLimit=['ntu','nthu','nycu','ncku','nccu'].includes(p.university)?20:['ncu','nchu','nsysu','ccu'].includes(p.university)?30:p.maxRank;
  const qualified=route!=='star'||rank<=rankLimit,screened=route==='star'?subjects.every(s=>f['s.'+s]!=null):exam>=examFloor&&talent>=talentFloor;
  const safety=apply&&f.safety==='1'&&screened&&exam>=100&&['public','privateTech','private'].includes(p.selectivity);
  const unit=value=>Math.max(0,Math.min(1,value));
  const topSupport=apply&&p.selectivity==='top'
   ?unit((exam-85)/8)*unit((talent-48)/12)*unit((interview-74)/10):0;
  const cap=({medical:18,pharmacy:25,top:35,midTech:46,midOther:57,public:70,privateTech:83}[p.selectivity]??98)+10*topSupport;
  const threshold=p.threshold-9*topSupport;
  const chance=safety?100:qualified&&screened?Math.max(.5,Math.min(cap,100/(1+Math.exp((threshold-score)/5)))):0;
  const draw=new JavaRandom(BigInt.asIntN(64,BigInt(seed(f))*6364136223846793005n)^BigInt(hash(p.id))^BigInt(hash(route))).nextDouble()*100,accepted=draw<chance;
  return {accepted,score:Math.round(score*10)/10,chance:Math.round(chance*10)/10,reason:safety?'滿級分備用錄取':!qualified?'在校排名未達門檻':!screened?(route==='star'?'缺少採計考科':exam<examFloor?'考試門檻未達標':'科系資質未達標'):accepted?'錄取':'本輪未錄取'};
 }
}
let ready;
async function request(path,f){if(!ready)ready=fetch(new URL('runtime-data.json',document.baseURI),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('遊戲資料讀取失敗。');return r.json();}).then(d=>new Engine(d));return (await ready).request(path,f);}
const api={Engine,JavaRandom,request};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DaiwanRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
