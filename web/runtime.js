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
function sources(s){return ({'流行文化':['影視','動漫','體育','時事','音樂'],'生活推理':['國文','英文','數學','自然','歷史','地理','公民','藝術','常識'],'數學A':['數學'],'數學B':['數學'],'數學甲':['數學'],'數學乙':['數學'],'自然':['自然','物理','化學','生物'],'社會':['歷史','地理','公民'],'公民與社會':['公民']})[s]||[s];}
function ability(s){if(['國文','英文'].includes(s))return 1;if(['歷史','地理','公民','公民與社會','社會','流行文化'].includes(s))return 2;return s==='藝術'?3:s==='音樂'?4:0;}
function active(q){return !(['英文','數學'].includes(q.subject)&&q.difficulty>2)&&!(q.subject==='英文'&&['Literary bookshelf','Authors and works'].includes(q.theme))&&!(q.subject==='數學'&&['數學史與解謎','數學史','典籍考古'].includes(q.theme))&&!(q.subject==='音樂'&&['歌詞選字','歌手點名','emoji猜歌','歌名謎語'].includes(q.theme));}
const norm=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,'');
class Engine {
 constructor(data){this.data=data;this.questions=new Map(data.questions.map(q=>[q.id,q]));this.programs=new Map(data.programs.map(p=>[p.id,p]));}
 request(path,f){switch(path){case 'enroll':return this.enroll(f);case 'paper':return this.paper(f);case 'grade':return this.grade(f);case 'admission':return this.admission(f);default:throw Error('找不到這個API。');}}
 enroll(f){if(!['male','female'].includes(f.gender)||!['公立','私立'].includes(f.schoolType))throw Error('請選擇性別與公私立偏好。');const r=new JavaRandom(seed(f)),all=this.data.schools.filter(s=>s.type===f.schoolType&&(s.gender==='all'||s.gender===f.gender));let draw=r.nextInt(all.reduce((a,s)=>a+s.weight,0)),school=all[0];for(const s of all){draw-=s.weight;if(draw<0){school=s;break;}}const attrs=[],aptitude=[];for(const b of school.base){attrs.push(Math.max(0,Math.min(100,b+r.nextInt(7)-3)));aptitude.push(Math.max(20,Math.min(85,b+8+r.nextInt(11)-5)));}const {weight,...publicSchool}=school;return {school:publicSchool,attrs,aptitude};}
 pick(label,type,level,used,current,r,theme){let a=this.data.questions.filter(q=>sources(label).includes(q.subject)&&!current.has(q.id)&&active(q));const typed=a.filter(q=>q.type===type);if(typed.length)a=typed;const themed=a.filter(q=>!theme||q.theme===theme);if(themed.length)a=themed;const fresh=a.filter(q=>!used.has(q.id));if(fresh.length)a=fresh;if(!a.length)throw Error('本科題庫不足。');const distance=Math.min(...a.map(q=>Math.abs(q.difficulty-level)));a=a.filter(q=>Math.abs(q.difficulty-level)===distance);const q=a[r.nextInt(a.length)];current.add(q.id);const {key,explanation,...question}=q;return {...question,examSubject:label};}
 paper(f){const subjects=labels(f);if(f.mode==='split'&&!['star','apply'].includes(f.previousRoute))throw Error('先完成繁星或個申放榜，再參加分科。');const attrs=vector(f.attrs??'40,40,40,40,40'),used=new Set(String(f.used??'').split(',')),current=new Set();const r=new JavaRandom(BigInt(seed(f))^BigInt(hash(f.mode))^BigInt(hash(String(f.round??'0')))^BigInt(hash('['+subjects.join(', ')+']')));const questions=[],per=f.mode==='term'?1:3;
  for(const label of subjects)for(let j=0;j<per;j++){const type=f.mode==='term'?'choice':j===0?'choice':j===1?'match':label==='英文'?'choice':'fill';const a=attrs[ability(label)];let level=f.mode==='term'?(a<45&&Number(f.round)<2?2:3):j===0?2:3;if(a>=75||['數學A','數學甲'].includes(label))level=3;if(label==='英文')level=2;if(label.startsWith('數學'))level=['數學A','數學甲'].includes(label)||a>=75?2:1;const theme=label==='英文'?(j===1?(r.nextBoolean()?'Screen matching':'Grammar matching'):j===0?'Movie clues':'Grammar practice'):label.startsWith('數學')?(type==='choice'&&r.nextBoolean()?'數學家點名':''):'';questions.push(this.pick(label,type,level,used,current,r,theme));}
  return {mode:f.mode,questions};
 }
 fraction(q,a){if(q.type==='choice')return int(a,0,q.options.length-1)===Number(q.key)?1:0;if(q.type==='fill'){if(!String(a??'').trim()||String(a).length>80)throw Error('請完成短填答（最多80字元）。');return q.key.split('/').some(k=>norm(k)===norm(a))?1:0;}const parts=String(a??'').split(',');if(parts.length!==q.left.length)throw Error('請完成所有配對。');const indices=parts.map(v=>int(v,0,q.options.length-1));if(new Set(indices).size!==parts.length)throw Error('配對選項不可重複。');const keys=q.key.split(',').map(Number);return indices.filter((v,i)=>v===keys[i]).length/parts.length;}
 grade(f){const subjects=labels(f),ids=String(f.ids??'').split(','),count=f.mode==='term'?2:subjects.length*3;if(ids.length!==count||new Set(ids).size!==count)throw Error('試卷題數不符或題號重複。');const earned={},possible={},counts={},review=[];let correct=0,sum=0,weight=0;
  ids.forEach((id,i)=>{const q=this.questions.get(id),label=f['label'+i];if(!q)throw Error('題目不存在。');if(label==='英文'&&q.type==='fill')throw Error('英文不使用填答題。');if(!subjects.includes(label)||!sources(label).includes(q.subject))throw Error('試題不屬於所選科目。');const fraction=this.fraction(q,f['a'+i]);if(fraction===1)correct++;earned[label]=(earned[label]||0)+fraction*q.difficulty;possible[label]=(possible[label]||0)+q.difficulty;counts[label]=(counts[label]||0)+1;sum+=fraction*q.difficulty;weight+=q.difficulty;review.push({id,fraction,correct:fraction===1,answer:q.key,explanation:q.explanation});});
  if(subjects.some(s=>counts[s]!== (f.mode==='term'?1:3)))throw Error('各科題數不符。');if(f.mode==='term')return {correct,exam:Math.round(sum/weight*100),review};const max=f.mode==='gsat'?15:60;return {scores:Object.fromEntries(subjects.map(s=>[s,Math.round(earned[s]/possible[s]*max)])),correct,review};
 }
 admission(f){const route=f.route;if(!['star','apply','distribution'].includes(route))throw Error('未知升學管道。');const ids=String(f.preferences??'').split(','),limit=route==='distribution'?10:3;if(ids.length>limit||!ids.length||new Set(ids).size!==ids.length)throw Error('志願數量不符。');const choices=ids.map(id=>this.programs.get(id));if(choices.some(p=>!p))throw Error('校系不存在。');if(route==='star'&&(new Set(choices.map(p=>p.university)).size!==1||new Set(choices.map(p=>p.group)).size!==1))throw Error('繁星僅能選一校、一類組，至多三系。');const p=this.programs.get(f.program);if(!p||!ids.includes(p.id))throw Error('校系不在志願內。');const attrs=vector(f.attrs),apt=vector(f.aptitude),portfolio=num(f.portfolio,0,100),rank=num(f.rank,1,100),split=route==='distribution',subjects=split?p.split:p.subjects;
  const sum=subjects.reduce((n,s,i)=>n+num(f['s.'+s],0,split?60:15)*(i===0?2:1),0),exam=sum/(subjects.length+1)/(split?60:15)*100,talent=p.weights.reduce((n,w,i)=>n+(attrs[i]*.65+apt[i]*.35)*w,0);
  const score=route==='star'?exam*.5+(100-rank)*.25+talent*.25:route==='apply'?exam*.5+talent*.35+portfolio*.15:exam*.7+talent*.3,qualified=route!=='star'||rank<=p.maxRank,screened=exam>=p.examFloor&&talent>=p.talentFloor;
  const chance=qualified&&screened?Math.max(.5,Math.min(p.selectivity==='medical'?30:p.selectivity==='elite'?55:98,100/(1+Math.exp((p.threshold-score)/5)))):0;
  const draw=new JavaRandom(BigInt.asIntN(64,BigInt(seed(f))*6364136223846793005n)^BigInt(hash(p.id))^BigInt(hash(route))).nextDouble()*100,accepted=draw<chance;
  return {accepted,score:Math.round(score*10)/10,chance:Math.round(chance*10)/10,reason:!qualified?'在校排名未達門檻':!screened?(exam<p.examFloor?'考試門檻未達標':'科系資質未達標'):accepted?'錄取':'本輪未錄取'};
 }
}
let ready;
async function request(path,f){if(!ready)ready=fetch(new URL('runtime-data.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('遊戲資料讀取失敗。');return r.json();}).then(d=>new Engine(d));return (await ready).request(path,f);}
const api={Engine,JavaRandom,request};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DaiwanRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
