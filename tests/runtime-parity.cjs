// Compare the browser-only runtime with the Java API before publication.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Engine}=require('../web/runtime.js');const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/runtime-data.json'),'utf8'));const e=new Engine(data),bank=new Map(data.questions.map(q=>[q.id,q]));
const BASE=process.env.TEST_JAVA_URL||'http://localhost:8080';let count=0;
async function parity(route,form){const res=await fetch(BASE+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form)});const expected=await res.json();if(!res.ok){assert.throws(()=>e.request(route,form));}else assert.deepEqual(e.request(route,form),expected,route+': '+JSON.stringify(form));count++;return expected;}
function gradeForm(p,subjects,round,wrong=false){const form={mode:p.mode,subjects,round,ids:p.questions.map(q=>q.id).join(',')};p.questions.forEach((q,i)=>{const key=bank.get(q.id).key;form['label'+i]=q.examSubject;form['a'+i]=q.type==='fill'?(wrong?'錯誤':key.split('/')[0]):q.type==='choice'?(wrong?(Number(key)+1)%4:key):(wrong?key.split(',').map(n=>(Number(n)+1)%q.options.length).join(','):key);});return form;}
(async()=>{
 for(const seed of [0,1,42,2147483648,4294967295])for(const gender of ['male','female'])for(const schoolType of ['公立','私立'])await parity('enroll',{seed,gender,schoolType});
 for(const seed of [0,42,4294967295])for(let round=0;round<6;round++){const paper=await parity('paper',{mode:'term',round,seed,attrs:'30,55,80,45,65'});await parity('grade',gradeForm(paper,'',round));await parity('grade',gradeForm(paper,'',round,true));}
 for(const [mode,subjects] of [['gsat',['國文','英文','數學A','數學B','自然','社會']],['split',['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會']]])for(const selected of [...subjects.map(s=>[s]),subjects]){const joined=selected.join(','),paper=await parity('paper',{mode,seed:4294967295,round:5,attrs:'90,75,70,45,30',subjects:joined,previousRoute:'apply'});await parity('grade',gradeForm(paper,joined,5));await parity('grade',gradeForm(paper,joined,5,true));}
 // A maximal journey must keep every question distinct even after exhausting cross-run freshness.
 const used=[],prompts=new Set();
 const exams=[
  ...[0,1,2,3,4].map(round=>({mode:'term',round})),
  {mode:'gsat',round:4,subjects:'國文,英文,數學A,數學B,自然,社會'},
  {mode:'term',round:5},
  {mode:'split',round:5,subjects:'數學甲,數學乙,物理,化學,生物,歷史,地理,公民與社會',previousRoute:'apply'},
 ];
 for(const exam of exams){
  const paper=await parity('paper',{seed:42,attrs:'80,80,80,80,80',...exam,used:used.join(','),seen:[...bank.keys()].join(',')});
  for(const q of paper.questions){
   const prompt=q.text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,'');
   assert(!used.includes(q.id)&&!prompts.has(prompt),q.id);
   used.push(q.id);prompts.add(prompt);
  }
 }
 assert.equal(used.length,54);
 for(const seed of [0,42,4294967295])for(const route of ['star','apply','distribution'])for(const p of data.programs.filter((_,i)=>i%23===0)){const form={seed,route,program:p.id,preferences:p.id,attrs:'80,80,75,65,55',aptitude:'60,65,65,60,60',portfolio:90,rank:5};for(const s of route==='distribution'?p.split:p.subjects)form['s.'+s]=route==='distribution'?56:14;await parity('admission',form);}
 for(const university of ['ntua','tnua','tnnua']){
  for(const route of ['star','apply','distribution']){
   const p=data.programs.find(p=>p.university===university&&p.group===4);
   const subjects=route==='distribution'?p.split:p.subjects,max=route==='distribution'?60:15;
   const form={seed:42,route,program:p.id,preferences:p.id,attrs:'50,50,50,70,100',
    aptitude:'50,50,50,70,85',portfolio:85,rank:5};
   for(const s of subjects)form['s.'+s]=Math.ceil(max*.6);
   const artFirst=await parity('admission',form);
   assert(artFirst.chance>0);
   const scoreFirst={...form,attrs:'50,50,50,75,75',aptitude:'50,50,50,65,70'};
   for(const s of subjects)scoreFirst['s.'+s]=max;
   const higherExam=await parity('admission',scoreFirst);
   if(route!=='apply')assert(artFirst.score>higherExam.score&&artFirst.chance>=higherExam.chance);
   else assert(higherExam.score>artFirst.score);
   const weak=await parity('admission',{...scoreFirst,attrs:'100,100,100,35,35',aptitude:'100,100,100,35,35'});
   assert.equal(weak.chance,0);
  }
 }
 for(const [subject,mode,edges,limit] of [
  ['英文','gsat',[5000,8000,10000,15000],30000],
  ['數學A','gsat',[8000,15000,20000,30000],60000],
  ['物理','split',[5000,8000,10000,15000],30000],
 ]){
  const form={mode,subjects:subject,round:4,previousRoute:'apply'};
  const paper=await parity('paper',form);
  const graded={...gradeForm(paper,subject,4),timed:'1'};
  const choiceIndices=paper.questions.flatMap((q,i)=>q.type==='choice'?[i]:[]);
  for(const i of choiceIndices)graded['ms'+i]=0;
  const index=choiceIndices[0];
  for(const [ms,points] of [...edges.flatMap((edge,i)=>[[edge,5-i],[edge+1,4-i]]),[limit,0]]){
   const scores=await parity('grade',{...graded,['ms'+index]:ms});
   assert.equal(scores.review[index].points,points);
   assert.equal(scores.scores[subject],(10+points)*(mode==='split'?4:1));
  }
  const missed=await parity('grade',{...graded,['ms'+index]:limit,['a'+index]:'null'});
  assert.equal(missed.review[index].fraction,0);
 }
 const option=data.programs.find(p=>p.id==='ntu-8');
 const base={route:'apply',program:option.id,preferences:option.id,attrs:'80,80,80,80,80',aptitude:'80,80,80,80,80',portfolio:80,rank:5,seed:42};
 for(const s of option.subjects)base['s.'+s]=15;
 const screen=await parity('admission',{...base,phase:'screen'});
 assert(screen.accepted&&screen.floor===option.applyFloor);
 const better=await parity('admission',{...base,phase:'final',interview:90});
 const weaker=await parity('admission',{...base,phase:'final',interview:60});
 assert.equal(better.score-weaker.score,9);
 await parity('paper',{mode:'split',subjects:'物理'});await parity('enroll',{seed:5,gender:'other',schoolType:'公立'});
 console.log('PASS:',count,'Java/browser runtime parity cases, including seed boundaries, grading, selected subjects, admission.');
})().catch(err=>{console.error(err);process.exitCode=1;});
