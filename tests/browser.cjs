// Optional QA: Playwright + Chrome; no dependency needed to play the game.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BASE=process.env.TEST_URL||'http://localhost:8080';
const BANK=Object.fromEntries(fs.readFileSync(path.join(__dirname,'../data/questions.tsv'),'utf8').split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>{const a=s.split('|');return[a[0],a];}));
const click=(p,a)=>p.locator(`[data-action="${a}"]`).click();
async function interview(p){
 await p.locator('[data-action="enter-interview"]').waitFor();
 const ids=await p.evaluate(()=>state.interview.questions.map(q=>q.id));
 assert.equal(new Set(ids).size,3);
 await click(p,'enter-interview');
 for(let i=0;i<3;i++){
  await p.locator('[data-action="interview-answer"]').first().click();
 }
}

async function answer(p){const q=await p.evaluate(()=>state.paper.questions[state.paper.index]),key=BANK[q.id][8];
 if(q.type==='choice')await p.locator(`[data-action="answer"][data-id="${key}"]`).click();
 else if(q.type==='fill')await p.locator('#short-answer').fill(key.split('/')[0]);
 else for(const [i,v] of key.split(',').entries()){await p.locator(`[data-select-wrap="match-${i}"] .select-trigger`).click();await p.locator(`[data-select-wrap="match-${i}"] [data-value="${v}"]`).click();}
 await click(p,'next');
}
async function paper(p,n){for(let i=0;i<n;i++)await answer(p);}
async function resume(p){await p.reload();await click(p,'resume');}
async function mobile(p,label){await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);await p.setViewportSize({width:1440,height:1000});}
async function win(p){if(await p.locator('[data-action="memory-ready"]').count())await click(p,'memory-ready');const g=await p.evaluate(()=>state.game);
 if(['match','swatch'].includes(g.type))for(let i=0;i<g.pairs.length;i++){await p.locator(`[data-action="pair-left"][data-id="${i}"]`).click();await p.locator(`[data-action="pair-right"][data-id="${g.right.indexOf(g.pairs[i][1])}"]`).click();}
 else if(g.type==='memory'){for(const s of [...new Set(g.cards)])for(const i of g.cards.flatMap((v,i)=>v===s?[i]:[]))await p.locator(`[data-action="memory-card"][data-id="${i}"]`).click();}
 else if(g.type==='order')for(const item of [...g.items].sort((a,b)=>a[1]-b[1]))await p.locator(`[data-action="order-tile"][data-id="${g.tiles.findIndex(t=>t[0]===item[0])}"]`).click();
 else if(g.type==='spot')for(let i=0;i<3;i++){const odd=await p.evaluate(()=>state.game.odd);await p.locator(`[data-action="spot-tile"][data-id="${odd}"]`).click();}
 else assert.fail('Unexpected minigame: '+g.type);
 assert.equal(await p.evaluate(()=>state.game.score),100,g.type);
}
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'chrome'});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(BASE);await p.waitForSelector('#start-form');assert(await p.getByText('LeleHuang',{exact:true}).isVisible());
 await p.screenshot({path:'/tmp/daiwan-v6-home.png',fullPage:true});await mobile(p,'home');
 await p.locator('#player-name').fill('試玩同學 <樂>');await p.locator('#seed-input').fill('LELE2026');await p.locator('[name="gender"][value="female"]').check();await p.locator('[name="schoolType"][value="公立"]').check();await p.locator('#start-form button').click();await p.waitForSelector('[data-action="enter-school"]');
 assert.equal(await p.evaluate(()=>state.stage),'enrolled');assert.equal(await p.evaluate(()=>state.gender),'female');assert(['all','female'].includes(await p.evaluate(()=>state.school.gender)));assert.equal(await p.evaluate(()=>Object.hasOwn(state,'cap')),false);
 await mobile(p,'enrollment');await click(p,'enter-school');
 for(let r=0;r<6;r++){
  await click(p,'start-term');await p.waitForSelector('[data-action="answer"]');assert.equal(await p.evaluate(()=>state.paper.questions.length),2);
  if(r===0){
   await p.setViewportSize({width:320,height:568});
   const nav=await p.locator('.question-nav').boundingBox();
   assert(nav.y>=0&&nav.y+nav.height<=569);
   await p.setViewportSize({width:1440,height:1000});
  }
  if(r===0){const b=await p.evaluate(()=>JSON.stringify(state.paper));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify(state.paper)),b);}
  await paper(p,2);await p.waitForSelector('[data-action="event-choice"]');assert.equal(await p.evaluate(()=>state.lastRound.correct),2);assert.equal(await p.evaluate(()=>state.lastRound.rewards.reduce((a,b)=>a+b,0)),4);assert(await p.locator('.reward-notice').isVisible());
  if(r===0){await p.screenshot({path:'/tmp/daiwan-v6-event.png',fullPage:true});await mobile(p,'event');}
  const before=await p.evaluate(()=>({attrs:[...state.attrs],delta:state.event.choices[0].delta}));await p.locator('[data-action="event-choice"][data-id="0"]').click();
  assert.deepEqual(await p.evaluate(()=>state.attrs),before.attrs.map((v,i)=>Math.max(0,Math.min(100,v+before.delta[i]))));
  const dice=await p.evaluate(()=>state.dice);assert(dice.length>=1&&dice.length<=6&&dice.every(v=>v>=1&&v<=6));
  if(r===0){const b=await p.evaluate(()=>JSON.stringify([state.dice,state.seed,state.attrs]));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify([state.dice,state.seed,state.attrs])),b);}
  while(await p.evaluate(()=>state.dieIndex<state.dice.length)){const i=await p.evaluate(()=>state.attrs.indexOf(Math.min(...state.attrs)));if(await p.evaluate(()=>state.attrs.every(v=>v===100))){await click(p,'full-dice');break;}await p.locator(`[data-action="assign"][data-id="${i}"]`).click();}
  await click(p,'start-game');await mobile(p,'game');await win(p);
  if(r===2){const b=await p.evaluate(()=>JSON.stringify([state.attrs,state.game,state.history]));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify([state.attrs,state.game,state.history])),b);}
  await click(p,'next-round');
  if(r===4){for(const s of ['數學A','自然'])await p.locator(`[name="exam-subject"][value="${s}"]`).check();await click(p,'start-gsat');await p.waitForSelector('[data-action="answer"]');assert.equal(await p.evaluate(()=>state.paper.questions.length),18);assert.equal(await p.locator('[data-action=previous]').count(),0);await paper(p,18);await p.waitForSelector('[data-action="continue-senior"]');assert((await p.evaluate(()=>Object.values(state.gsat))).every(v=>v===15));await click(p,'continue-senior');}
 }
 assert.equal(await p.evaluate(()=>state.history.length),6);assert(await p.locator('.report-summary').isVisible());assert.equal(await p.locator('.subject-grid>div').count(),6);await mobile(p,'routes');
 await p.screenshot({path:'/tmp/daiwan-v6-report.png',fullPage:true});
 const routeState=await p.evaluate(()=>structuredClone(state));
 // All nineteen mini-game themes: exercise real generation and handlers against a saved run.

 for(const source of await p.evaluate(()=>miniBank)){
  await p.evaluate(id=>{state.stage='dice';state.round=0;state.game=null;state.gameOrder[0]=id;state.dice=[1];state.dieIndex=1;state.assignments=[{attr:0,added:1}];render();},source.id);await click(p,'start-game');
  if(source.id==='anime')assert.equal(await p.evaluate(()=>new Set(state.game.right.map(title=>title.normalize('NFKC'))).size),4);
  if(source.id==='flags')assert(await p.evaluate(()=>state.game.right.every(name=>!['波札那','加彭','盧安達','迦納'].includes(name))));
  if(source.type==='swatch'){assert.equal(await p.locator('.brand-palette').count(),4);assert.equal(await p.locator('.brand-palette i').count()>3,true);await p.screenshot({path:'/tmp/daiwan-v6-brand.png',fullPage:true});}
  if(['lyrics','singer','lyric-singer'].includes(source.type)){
   const game=await p.evaluate(()=>state.game);
   assert.equal(game.type,'match');assert.equal(game.pairs.length,4);assert.equal(new Set(game.right).size,4);
   assert.equal(await p.locator('[data-action=mini-answer]').count(),0);
  }
  const gameStart=await p.evaluate(()=>structuredClone(state));await win(p);
  await p.evaluate(s=>{state=s;go('game');},gameStart);
  if(source.type==='memory')await click(p,'memory-ready');
  const beforeFailure=await p.evaluate(()=>state.attrs[state.game.attr]);
  for(let strike=0;strike<2;strike++){
   const g=await p.evaluate(()=>state.game);
   if(['match','swatch'].includes(g.type)){await p.locator('[data-action="pair-left"][data-id="0"]').click();await p.locator(`[data-action="pair-right"][data-id="${g.right.findIndex(v=>v!==g.pairs[0][1])}"]`).click();}
   else if(g.type==='spot')await p.locator(`[data-action="spot-tile"][data-id="${(g.odd+1)%25}"]`).click();
   else if(g.type==='order'){const latest=g.tiles.findIndex(t=>t[1]===Math.max(...g.tiles.map(x=>x[1])));await p.locator(`[data-action="order-tile"][data-id="${latest}"]`).click();}
   else if(g.type==='memory'){if(strike)await click(p,'memory-again');await p.locator('[data-action="memory-card"][data-id="0"]').click();await p.locator(`[data-action="memory-card"][data-id="${g.cards.findIndex(v=>v!==g.cards[0])}"]`).click();}
   else assert.fail('Unexpected minigame: '+g.type);
   assert.equal(await p.evaluate(()=>state.game.mistakes),strike+1,source.id);
  }
  assert(await p.evaluate(()=>state.game.done&&state.game.failed));assert.equal(await p.evaluate(()=>state.attrs[state.game.attr]),Math.max(0,beforeFailure-4));
  assert(await p.locator('.mistake-badge.danger').isVisible());
  if(source.id==='colors'){const saved=await p.evaluate(()=>JSON.stringify([state.attrs,state.game]));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify([state.attrs,state.game])),saved);}
 }
 // Both wrong term questions deduct the relevant abilities exactly once.
 await p.evaluate(s=>{state=structuredClone(s);state.round=0;resetRound();go('round');},routeState);await click(p,'start-term');await p.waitForSelector('[data-action="answer"]');
 const preQuiz=await p.evaluate(()=>[...state.attrs]);const quizQs=await p.evaluate(()=>state.paper.questions);
 for(const q of quizQs){const wrong=(Number(BANK[q.id][8])+1)%4;await p.locator(`[data-action="answer"][data-id="${wrong}"]`).click();await click(p,'next');}
 await p.waitForSelector('[data-action="event-choice"]');const loss=await p.evaluate(()=>state.lastRound.penalties);assert.equal(loss.reduce((a,b)=>a+b,0),6);
 assert.deepEqual(await p.evaluate(()=>state.attrs),preQuiz.map((n,i)=>n-loss[i]));assert(await p.locator('.penalty-notice').isVisible());
 const savedQuiz=await p.evaluate(()=>JSON.stringify([state.attrs,state.lastRound.penalties]));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify([state.attrs,state.lastRound.penalties])),savedQuiz);
 // One correct and one wrong: rewards and losses are both visible and persist.
 await p.evaluate(s=>{state=structuredClone(s);state.round=0;resetRound();go('round');},routeState);await click(p,'start-term');await p.waitForSelector('[data-action="answer"]');
 const mixedBefore=await p.evaluate(()=>[...state.attrs]);await answer(p);let current=await p.evaluate(()=>state.paper.questions[state.paper.index]);await p.locator(`[data-action="answer"][data-id="${(Number(BANK[current.id][8])+1)%4}"]`).click();await click(p,'next');await p.waitForSelector('[data-action="event-choice"]');
 const mixed=await p.evaluate(()=>({penalties:state.lastRound.penalties,rewards:state.lastRound.rewards,attrs:state.attrs}));assert.equal(mixed.rewards.reduce((a,b)=>a+b,0),2);assert.equal(mixed.penalties.reduce((a,b)=>a+b,0),3);assert.deepEqual(mixed.attrs,mixedBefore.map((n,i)=>n-mixed.penalties[i]+mixed.rewards[i]));assert(await p.locator('.reward-notice').isVisible());assert(await p.locator('.penalty-notice').isVisible());
 const mixedSaved=await p.evaluate(()=>JSON.stringify([state.attrs,state.lastRound]));await resume(p);assert.equal(await p.evaluate(()=>JSON.stringify([state.attrs,state.lastRound])),mixedSaved);
 await p.evaluate(s=>{state=s;go('routes');},routeState);
 await p.locator('[data-route="star"]').click();assert.equal(await p.locator('.university-choice').count(),100);assert(!/[A-Za-z]/.test((await p.locator('.university-choice h3, .university-choice > span').allTextContents()).join('')));const starRates=(await p.locator('.school-chance').allTextContents()).map(t=>Number(t.match(/[\d.]+/)[0]));assert(starRates.every((n,i)=>!i||n<=starRates[i-1]));
 await p.locator('[data-select-wrap="sort"] .select-trigger').click();await p.locator('[data-select-wrap="sort"] [data-value="chance-asc"]').click();await mobile(p,'star school sort');await p.locator('[data-action="star-school"][data-id="ntu"]').click();assert.equal(await p.locator('[data-action="add"]').count(),0);
 await p.locator('[data-action="star-group"][data-id="1"]').click();assert((await p.evaluate(()=>[...new Set(programs.filter(x=>x.university===state.starSchool&&x.group===state.starGroup).map(x=>x.group))])).length===1);
 for(let i=0;i<3;i++)await p.locator('[data-action="add"]:not(:disabled)').first().click();assert.equal(await p.locator('[data-action="add"]:not(:disabled)').count(),0);assert.equal(await p.evaluate(()=>state.preferences.length),3);
 await click(p,'submit-universities');await p.waitForSelector('[data-action="accept"], [data-action="failed-star-apply"]');
 await p.evaluate(s=>{state=structuredClone(s);go('routes');},routeState);await p.locator('[data-route="apply"]').click();assert.equal(await p.locator('select').count(),0);
 const trigger=p.locator('[data-select-wrap="group"] .select-trigger');await trigger.focus();await p.keyboard.press('ArrowDown');assert.equal(await p.locator('[role="listbox"]').count(),1);await p.keyboard.press('End');await p.keyboard.press('Enter');assert.notEqual(await p.evaluate(()=>filter.group),'全部');await p.evaluate(()=>{resetFilters();render();});
 for(const order of ['chance-asc','chance-desc','original']){await p.locator('[data-select-wrap="sort"] .select-trigger').click();await p.locator(`[data-select-wrap="sort"] [data-value="${order}"]`).click();const values=(await p.locator('.program-fit>b').allTextContents()).map(t=>Number(t.replace('%','')));if(order!=='original')assert(values.every((n,i)=>!i||(order==='chance-asc'?n>=values[i-1]:n<=values[i-1])));}
 await mobile(p,'catalog');
 for(let i=0;i<3;i++)await p.locator('[data-action="add"]:not(:disabled)').first().click();assert.equal(await p.locator('[data-action="add"]:not(:disabled)').count(),0);
 // Pick a deterministic accepted program to validate a real successful server result, never change its outcome.
 const chosen=await p.evaluate(async()=>{for(const p of programs){if(!eligibility(p))continue;const d={route:'apply',program:p.id,preferences:p.id,attrs:state.attrs.join(','),aptitude:state.aptitude.join(','),portfolio:state.portfolio,rank:state.rank,seed:state.originSeed};Object.entries(state.gsat).forEach(([s,v])=>d['s.'+s]=v);const r=await api('admission',d);if(r.accepted){if(Math.abs(admissionEstimate(p)-r.chance)>.01)throw Error('chance parity');return p.id;}}throw Error('No accepted program');});
 await p.evaluate(id=>{state.preferences=[];filter.search=programs.find(p=>p.id===id).universityName;render();},chosen);await p.locator(`[data-action="add"][data-id="${chosen}"]`).click();await click(p,'submit-universities');await interview(p);await p.waitForSelector('[data-action="accept"]');await click(p,'accept');
 assert((await p.locator('.card-portrait').getAttribute('src')).endsWith('/assets/avatar-female.svg'));assert(await p.locator('.card-crest').isVisible());const abbr=await p.evaluate(()=>university(admittedProgram().university).abbr);assert(!(await p.locator('.card-school').innerText()).includes(abbr));assert.equal(await p.locator('.unlocked-banner').count(),1);await mobile(p,'student card');
 await p.screenshot({path:'/tmp/daiwan-v6-card.png',fullPage:true});
 let dl=p.waitForEvent('download');await click(p,'download-card');let file=await dl;await file.saveAs('/tmp/daiwan-v6-card-export.png');let buf=fs.readFileSync('/tmp/daiwan-v6-card-export.png');assert.equal(buf.readUInt32BE(16),1520);assert.equal(buf.readUInt32BE(20),960);
 dl=p.waitForEvent('download');await click(p,'download-story');file=await dl;
 assert.equal(file.suggestedFilename(),'呆丸升學旅程.html');
 await file.saveAs('/tmp/daiwan-journey-test.html');
 const story=await browser.newPage({viewport:{width:320,height:568}});
 await story.goto('file:///tmp/daiwan-journey-test.html');
 assert.equal(await story.locator('h1').textContent(),'試玩同學 <樂>的升學旅程');
 assert.equal(await story.locator('.timeline li').count(),6);
 assert.equal(await story.locator('.abilities progress').count(),5);
 assert(await story.getByRole('heading',{name:'學測成績'}).isVisible());
 assert(await story.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await story.close();
 await p.locator('#photo-input').setInputFiles(path.join(__dirname,'../web/assets/campus-summer-v4.png'));await p.waitForFunction(()=>state.photo?.startsWith('data:image/jpeg'));await resume(p);assert((await p.locator('.card-portrait').getAttribute('src')).startsWith('data:image/jpeg'));
 dl=p.waitForEvent('download');await click(p,'download-card');await(await dl).saveAs('/tmp/daiwan-v6-photo-export.png');await click(p,'reset-photo');assert((await p.locator('.card-portrait').getAttribute('src')).endsWith('/assets/avatar-female.svg'));
 const originalAward=await p.evaluate(()=>achievements.first.date);await p.evaluate(()=>{delete state.achievementVersion;delete achievements.firstchoice;saveStore(ACH_KEY,achievements);save();});await resume(p);assert(await p.evaluate(()=>!!achievements.firstchoice));assert.equal(await p.evaluate(()=>achievements.first.date),originalAward);assert.equal(await p.evaluate(()=>state.achievementVersion),6);const seedCount=await p.evaluate(()=>achievements._seeds.length);await resume(p);assert.equal(await p.evaluate(()=>achievements._seeds.length),seedCount);
 await p.locator('#achievement-button').click();assert(await p.locator('.achievement.unlocked').count()>=4);assert.equal(await p.locator('.achievement').count(),300);assert.equal(await p.evaluate(()=>new Set(ACHIEVEMENTS.map(x=>x[0])).size),300);assert.equal(await p.locator('.achievement.locked b').first().innerText(),'尚未發現');await p.locator('[data-achievement-category=university]').click();
 assert.equal(await p.locator('.achievement').count(),100);
 await p.locator('[data-achievement-category=unlocked]').click();
 assert.equal(await p.locator('.achievement.locked').count(),0);
 await p.locator('#close-achievements').click();
 // Split route: select all eight subjects and enforce 24 questions and 10 preferences.
 await p.evaluate(s=>{state=structuredClone(s);go('routes');},routeState);assert.equal(await p.locator('[data-action="prepare-split"]').count(),0);await p.locator('[data-route="apply"]').click();await p.evaluate(id=>{state.preferences=[id];save();render();},chosen);await click(p,'submit-universities');await interview(p);await p.waitForSelector('[data-action="prepare-split"]');await click(p,'prepare-split');if(await p.locator('#confirm-dialog').isVisible())await p.locator('#confirm-ok').click();for(const c of await p.locator('[name="exam-subject"]').all())await c.check();await click(p,'start-split');await p.waitForSelector('[data-action="answer"]');assert.equal(await p.evaluate(()=>state.paper.questions.length),24);await paper(p,24);await p.waitForSelector('[data-action="open-distribution"]');await click(p,'open-distribution');
 for(let i=0;i<10;i++)await p.locator('[data-action="add"]:not(:disabled)').first().click();assert.equal(await p.evaluate(()=>state.preferences.length),10);assert.equal(await p.locator('[data-action="add"]:not(:disabled)').count(),0);await click(p,'submit-universities');await p.waitForSelector('[data-action="retake"]');await click(p,'retake');await p.locator('#confirm-ok').click();assert.equal(await p.evaluate(()=>state.ending),'retake');assert(await p.locator('.retake-illustration').isVisible());assert(await p.evaluate(()=>!!achievements.retake));
 await click(p,'restart');await p.locator('#confirm-ok').click();assert.equal(await p.evaluate(()=>state),null);assert(await p.evaluate(()=>!!readStore(ACH_KEY,{}).first));await p.locator('#player-name').fill('男生試玩');await p.locator('[name="gender"][value="male"]').check();await p.locator('[name="schoolType"][value="私立"]').check();await p.locator('#start-form button').click();await p.waitForSelector('[data-action="enter-school"]');assert((await p.evaluate(()=>defaultPortrait())).endsWith('/assets/avatar-male.svg'));assert.equal(await p.evaluate(()=>state.school.type),'私立');assert(['all','male'].includes(await p.evaluate(()=>state.school.gender)));const bounds=await p.evaluate(()=>{const saved=[...state.attrs];state.attrs=[100,0,100,0,100];const p={mode:'term',questions:[{subject:'數學'},{subject:'英文'}]},r={review:[{fraction:1},{fraction:0}]};const loss=applyQuizPenalty(p,r);const result={attrs:state.attrs,loss,rewards:r.rewards};state.attrs=saved;return result;});assert.deepEqual(bounds.attrs,[100,0,100,0,100]);assert.equal(bounds.loss.reduce((a,b)=>a+b,0),0);assert.equal(bounds.rewards.reduce((a,b)=>a+b,0),0);assert.deepEqual(errors,[]);
 console.log('PASS: six semesters, 19 mini-game themes, event/dice persistence, 18-question GSAT / 24-question split, admission limits, custom dropdown keyboard, photos/PNG, achievements, both endings, mobile layouts.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
