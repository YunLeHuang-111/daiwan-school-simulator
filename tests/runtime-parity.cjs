// Compare the browser-only runtime with the Java API before publication.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Engine}=require('../web/runtime.js');const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/runtime-data.json'),'utf8'));const e=new Engine(data),bank=new Map(data.questions.map(q=>[q.id,q]));
function termCategory(q){
 if(q.subject==='校園趣聞')return q.theme==='銀幕世界'?'影視':q.theme;
 if(q.subject==='地理')return '臺灣旅行';
 if(q.subject==='常識')return '麻將';
 if(q.subject==='影視'&&['台劇','韓劇','泰劇','甄嬛傳'].includes(q.theme))return q.theme;
 if(q.subject==='時事')return q.theme.includes('中職')||q.text.includes('台灣大賽')?'棒球':q.theme.endsWith('新聞')&&q.theme!=='足球新聞'?'時事':'其他運動';
 if(q.subject==='音樂')return q.theme.startsWith('K-pop')?'韓流':'歌曲';
 if(q.subject==='體育')return /棒球|職棒|投手|打者|壘/.test(q.text)?'棒球':'其他運動';
 return q.subject;
}
const BASE=process.env.TEST_JAVA_URL||'http://localhost:8080';let count=0;
async function parity(route,form){const res=await fetch(BASE+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form)});const expected=await res.json();if(!res.ok){assert.throws(()=>e.request(route,form));}else assert.deepEqual(e.request(route,form),expected,route+': '+JSON.stringify(form));count++;return expected;}
function gradeForm(p,subjects,round,wrong=false){const form={mode:p.mode,subjects,round,ids:p.questions.map(q=>q.id).join(',')};p.questions.forEach((q,i)=>{const key=bank.get(q.id).key;form['label'+i]=q.examSubject;form['a'+i]=q.type==='fill'?(wrong?'錯誤':key.split('/')[0]):q.type==='choice'?(wrong?(Number(key)+1)%4:key):(wrong?key.split(',').map(n=>(Number(n)+1)%q.options.length).join(','):key);});return form;}
(async()=>{
 for(const seed of [0,1,42,2147483648,4294967295])for(const gender of ['male','female'])for(const schoolType of ['公立','私立'])await parity('enroll',{seed,gender,schoolType});
 for(const seed of [0,42,4294967295])for(let round=0;round<6;round++){const paper=await parity('paper',{mode:'term',round,seed,attrs:'30,55,80,45,65'});await parity('grade',gradeForm(paper,'',round));await parity('grade',gradeForm(paper,'',round,true));}
 for(const [mode,subjects] of [['gsat',['國文','英文','數學A','數學B','自然','社會']],['split',['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會']]])for(const selected of [...subjects.map(s=>[s]),subjects]){const joined=selected.join(','),paper=await parity('paper',{mode,seed:4294967295,round:5,attrs:'90,75,70,45,30',subjects:joined,previousRoute:'apply'});await parity('grade',gradeForm(paper,joined,5));await parity('grade',gradeForm(paper,joined,5,true));}
 // A maximal journey must keep every question distinct even after exhausting cross-run freshness.
 const used=[],prompts=new Set(),termCategories=new Set();
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
   if(exam.mode==='term'){
    const category=termCategory(q);assert(!termCategories.has(category),category);termCategories.add(category);
   }
  }
 }
 assert.equal(used.length,54);assert.equal(termCategories.size,12);
 const termHistory=[],sets=[];
 for(const seed of [160,161,162,163,164,165]){
  const ids=[],categories=new Set();
  for(let round=0;round<6;round++){
   const paper=await parity('paper',{mode:'term',seed,round,used:ids.join(','),seen:termHistory.join(','),termHistory:termHistory.join(',')});
   for(const q of paper.questions){
    if(q.theme.includes('麻將'))assert.equal(seed%6,0);
    if(q.theme==='柯南案卷')assert.equal(q.difficulty,2);
    ids.push(q.id);categories.add(termCategory(q));
   }
  }
  assert.equal(categories.size,12);
  termHistory.push(...ids);sets.push(categories);
 }
 assert(new Set(sets.flatMap(s=>[...s])).size>=17,'several journeys cover more topics than a single run');
 assert(sets.slice(1).every((s,i)=>[...s].some(topic=>!sets[i].has(topic))),'consecutive runs rotate topic mix');
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
   if(route==='distribution')assert(artFirst.score>higherExam.score&&artFirst.chance>=higherExam.chance);
   else assert(higherExam.score>artFirst.score);
   const weak=await parity('admission',{...scoreFirst,attrs:'100,100,100,35,35',aptitude:'100,100,100,35,35'});
   if(route!=='star')assert.equal(weak.chance,0);
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
 const aptitudePaper=await parity('paper',{mode:'gsat',subjects:'國文',round:4});
 assert(aptitudePaper.questions.some(q=>q.id.startsWith('chinese-modern-')||q.id.startsWith('match-bank-chinese-')));
 const aptitudeGrade=gradeForm(aptitudePaper,'國文',4);
 const modest=await parity('grade',{...aptitudeGrade,aptitude:'50,45,50,50,50',attrs:'50,60,50,50,50'});
 assert.equal(modest.rawScores.國文,15);assert.equal(modest.scores.國文,14);
 const choiceIndex=aptitudePaper.questions.findIndex(q=>q.type==='choice');
 const fastStrong=await parity('grade',{...aptitudeGrade,timed:'1',['ms'+choiceIndex]:9000,aptitude:'50,85,50,50,50',attrs:'50,90,50,50,50'});
 assert.equal(fastStrong.rawScores.國文,13);assert.equal(fastStrong.scores.國文,14);
 const top=data.programs.find(p=>p.id==='ntu-0');
 const topForm={...base,program:top.id,preferences:top.id,attrs:'68,68,68,68,68',aptitude:'60,60,60,60,60'};
 for(const s of top.subjects)topForm['s.'+s]=14;
 const strongTop=await parity('admission',{...topForm,phase:'final',interview:85});
 assert(strongTop.chance>=25&&strongTop.chance<=45);
 const weakerTop=await parity('admission',{...topForm,phase:'final',interview:79});
 assert(weakerTop.chance<strongTop.chance);
 for(const [university,limit] of [['ntu',20],['nccu',20],['ncu',30],['ccu',30]]){
  const p=data.programs.find(p=>p.university===university);
  const f={...base,route:'star',program:p.id,preferences:p.id,rank:limit,schoolScore:88};
  for(const subject of p.subjects)f['s.'+subject]=15;
  const good=await parity('admission',f);
  assert.equal(good.score,91);
  assert(good.chance>0);
  assert.equal((await parity('admission',{...f,rank:limit+1})).chance,0);
  assert.equal((await parity('admission',{...f,schoolScore:80})).score,85);
 }
 const answerPaper=await parity('paper',{mode:'gsat',subjects:'英文,國文',round:4});
 const answerGrade={...gradeForm(answerPaper,'英文,國文',4),timed:'1'};
 answerPaper.questions.forEach((q,i)=>{if(q.type==='choice')answerGrade['ms'+i]=q.examSubject==='英文'?8001:30000;});
 const batch=await parity('grade',answerGrade);
 for(const [i,q] of answerPaper.questions.entries()){
  const single=await parity('answer',{...answerGrade,id:q.id,label:q.examSubject,answer:answerGrade['a'+i],ms:answerGrade['ms'+i]??''});
  assert.deepEqual(single,batch.review[i]);
 }
 // With every original match already seen, draw from the expanded bank for every section.
 const oldMatches=data.questions.filter(q=>q.type==='match'&&!q.id.startsWith('match-bank-')).map(q=>q.id);
 for(const [mode,subjects] of [['gsat','國文,英文,數學A,數學B,自然,社會'],['split','數學甲,數學乙,物理,化學,生物,歷史,地理,公民與社會']]){
  const newMatches=[];
  const form={mode,subjects,round:5,seed:17,previousRoute:'apply'};
  for(let i=0;i<3;i++){
   const paper=await parity('paper',{...form,seen:[...oldMatches,...newMatches].join(',')});
   for(const q of paper.questions.filter(q=>q.type==='match')){
    assert(q.id.startsWith('match-bank-'),q.id);
    assert(!newMatches.includes(q.id),q.id);
    if(['數學A','數學甲'].includes(q.examSubject))assert.equal(q.difficulty,3);
    if(['數學B','數學乙'].includes(q.examSubject))assert.equal(q.difficulty,2);
    newMatches.push(q.id);
   }
  }
 }
 await parity('paper',{mode:'split',subjects:'物理'});await parity('enroll',{seed:5,gender:'other',schoolType:'公立'});
 console.log('PASS:',count,'Java/browser runtime parity cases, including seed boundaries, grading, selected subjects, admission.');
})().catch(err=>{console.error(err);process.exitCode=1;});
