const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.TEST_URL||'http://localhost:8090/dist/';
const click=(p,a)=>p.locator(`[data-action="${a}"]`).click();
const {interview}=require('./puzzles.cjs');

async function choose(p,key,value){await p.locator(`[data-select-wrap="${key}"] .select-trigger`).click();await p.locator(`[data-select-wrap="${key}"] [data-value="${value}"]`).click();}
async function noOverflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(BASE+'#collection');await p.waitForSelector('.collection-page');assert.equal(await p.locator('.collection-school').count(),50);assert.equal(await p.locator('.collection-school[open]').count(),0);assert((await p.locator('.collection-summary').innerText()).includes('0 / 538'));await noOverflow(p);
await p.locator('[data-university=nccu] summary').click();
assert.equal(await p.locator('.collection-school[open] li.locked:visible').count(),36);
assert.equal(await p.locator('.collection-school:not([open]) li:visible').count(),0);
await click(p,'close-collection');await p.locator('#start-form').waitFor();assert((await p.locator('.author-credit').innerText()).includes('作者 LeleHuang'));assert(!/[A-Za-z]/.test(await p.locator('.university-strip').innerText()));
const seed=await p.locator('#seed-input').inputValue();assert.match(seed,/^[A-Z0-9]+$/);
await p.locator('#collection-button').click();await click(p,'close-collection');assert.equal(await p.locator('#seed-input').inputValue(),seed);
await p.locator('#player-name').fill('圖鑑試玩');await p.locator('#seed-input').fill('COLLECTION');await p.locator('#start-form button').click();await p.waitForSelector('[data-action="enter-school"]');
// Six dice and all five targets should fit on a small phone before scrolling.
await p.setViewportSize({width:320,height:568});
await p.evaluate(()=>{state.dice=[1,2,3,4,5,6];go('dice');});
await noOverflow(p);
assert.match(await p.locator('.school-progress').innerText(),/高一上學期/);
for(const target of await p.locator('.allocate-card').all()){
 const box=await target.boundingBox();
 assert(box.y>=0&&box.y+box.height<=568,'allocation target visible without scrolling');
}
const diceColors=new Set();
for(const theme of ['campus','retro','hongkong']){
 await p.locator('#theme-button').click();await p.locator(`[data-theme-choice="${theme}"]`).click();await p.locator('#close-themes').click();
 assert.equal(await p.locator('.dice-tray .die').count(),6);
 assert.deepEqual(await p.locator('.dice-tray .die').evaluateAll(ds=>ds.map(d=>d.querySelectorAll('.pip').length)),[1,2,3,4,5,6]);
 if(theme==='retro'){
  assert.deepEqual(await p.locator('.chip-value:visible').allTextContents(),['1','2','3','4','5','6']);
  assert.equal(await p.locator('.dice-tray .pip:visible').count(),0);
 }else assert.equal(await p.locator('.dice-tray .pip:visible').count(),21);
 diceColors.add(await p.locator('.dice-tray .die').first().evaluate(d=>getComputedStyle(d).backgroundColor));
 await noOverflow(p);
}
assert.equal(diceColors.size,3);
await p.reload();await click(p,'resume');assert.equal(await p.locator('html').getAttribute('data-theme'),'hongkong');
const orders=await p.evaluate(()=>{
 const history=miniHistory,base=miniBank.map(g=>g.id),result=[];
 miniHistory=[];
 for(let i=0;i<5;i++){
  const order=variedMiniOrder(base).slice(0,6);
  result.push({ids:order,types:order.map(miniType)});
  miniHistory=[...miniHistory,...order].slice(-36);
 }
 miniHistory=history;
 return result;
});
assert(orders.every(({types})=>new Set(types).size===6));
assert(orders.slice(1).every(({ids},i)=>ids.some(id=>!orders[i].ids.includes(id))));
assert.equal(new Set(orders.flatMap(({types})=>types)).size,7);
await p.screenshot({path:'/tmp/daiwan-compact-dice.png'});
await p.setViewportSize({width:390,height:844});
await p.evaluate(()=>{state.route='apply';state.rank=5;state.round=5;state.attrs=[85,85,85,85,85];state.aptitude=[75,75,75,75,75];state.portfolio=90;state.gsat=Object.fromEntries(GSAT.map(s=>[s,15]));state.history=TERMS.map(term=>({term,total:90,correct:2,gameScore:100}));state.preferences=['tku-0','fcu-0','fju-0'];welcome=false;resetFilters();go('universities');});
await noOverflow(p);let panel=await p.locator('#preferences-panel').boundingBox(),list=await p.locator('.school-list').boundingBox();assert(panel.y+panel.height<list.y+1,'preferences before the whole catalog');
const submit=await p.locator('[data-action="submit-universities"]').boundingBox();assert(submit.y<844&&submit.y+submit.height<844,'mobile submit is visible near top');
// Zhuyin composition must preserve the live input and only apply the committed text.
await p.locator('[data-select-wrap="sort"] .select-trigger').click();
await p.locator('#catalog-search').click();
await p.evaluate(()=>{
 const input=document.querySelector('#catalog-search');
 window.searchBeforeComposition=input;
 const count=document.querySelectorAll('.school-card').length;
 input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 input.value='ㄧㄤˊ';
 input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
 if(filter.search||document.querySelectorAll('.school-card').length!==count)throw Error('filter applied during composition');
 input.value='楊明';
 input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'楊明'}));
});
assert(await p.evaluate(()=>searchBeforeComposition===document.activeElement));
assert((await p.locator('.school-card h3').allTextContents()).every(name=>name==='楊明蕉通大學'));
assert.equal(await p.locator('.school-card').count(),19);
await p.locator('#catalog-search').fill('');
assert.equal(await p.locator('.school-card').count(),538);
await p.locator('#catalog-search').fill('台北大學');
assert.equal(await p.locator('.school-card h3').first().textContent(),'苔北大學');
await p.locator('#catalog-search').fill('');
const preferences=await p.evaluate(()=>JSON.stringify(state.preferences));await choose(p,'university','nycu');assert.equal(await p.locator('.school-card').count(),19);assert((await p.locator('.school-card h3').allTextContents()).every(s=>s==='楊明蕉通大學'));
for(const sort of ['chance-asc','chance-desc']){await choose(p,'sort',sort);assert.equal(await p.evaluate(()=>JSON.stringify(state.preferences)),preferences);const values=(await p.locator('.program-fit>b').allTextContents()).map(t=>Number(t.replace('%','')));assert(values.every((n,i)=>!i||(sort==='chance-asc'?n>=values[i-1]:n<=values[i-1])));}
assert.match(await p.locator('.school-progress').innerText(),/高三下學期/);
const rows=p.locator('#preference-order li');
const readOrder=()=>rows.evaluateAll(nodes=>nodes.map(row=>row.dataset.preferenceId));
const initialOrder=await readOrder();
await p.locator('#preferences-panel').evaluate(panel=>panel.scrollIntoView({block:'start',behavior:'instant'}));
const firstHandle=await rows.first().locator('.preference-handle').boundingBox();
const lastRow=await rows.last().boundingBox();
const x=Math.round(firstHandle.x+firstHandle.width/2),startY=Math.round(firstHandle.y+firstHandle.height/2);
const endY=Math.round(lastRow.y+lastRow.height-5);
const cdp=await p.context().newCDPSession(p);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY}]});
for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:Math.round(startY+(endY-startY)*i/8)}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const rotated=[initialOrder[1],initialOrder[2],initialOrder[0]];
assert.deepEqual(await readOrder(),rotated);
assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem(KEY)).preferences),rotated);
await rows.last().locator('.preference-handle').press('Home');
assert.deepEqual(await readOrder(),initialOrder);
// Mouse drag and keyboard ordering use the same persisted preference list.
const lastHandle=await rows.last().locator('.preference-handle').boundingBox();
const firstRow=await rows.first().boundingBox();
await p.mouse.move(lastHandle.x+12,lastHandle.y+12);
await p.mouse.down();
await p.mouse.move(lastHandle.x+12,firstRow.y+4,{steps:8});
await p.mouse.up();
assert.deepEqual(await readOrder(),[initialOrder[2],initialOrder[0],initialOrder[1]]);
assert.deepEqual(await p.evaluate(()=>state.preferences),await readOrder());
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await click(p,'review-preferences');await p.waitForFunction(()=>document.querySelector('[data-action="submit-universities"]').getBoundingClientRect().top>=0&&document.querySelector('[data-action="submit-universities"]').getBoundingClientRect().bottom<innerHeight);await p.screenshot({path:'/tmp/daiwan-mobile-preferences.png',fullPage:false});
const current=await p.evaluate(()=>JSON.stringify(state));await p.locator('#collection-button').click();assert.equal(await p.locator('.collection-school').count(),50);assert.equal(await p.locator('.collection-school[open]').count(),0);await click(p,'close-collection');assert.equal(await p.evaluate(()=>JSON.stringify(state)),current);
await p.setViewportSize({width:1440,height:1000});panel=await p.locator('#preferences-panel').boundingBox();list=await p.locator('.school-list').boundingBox();assert(panel.x>list.x,'desktop preferences remain on the right');
// Use an actual successful admission result; an unaccepted offer must not unlock the collection.
const chosen=await p.evaluate(async()=>{for(const q of programs){if(!eligibility(q))continue;const f={route:'apply',program:q.id,preferences:q.id,attrs:state.attrs.join(','),aptitude:state.aptitude.join(','),portfolio:state.portfolio,rank:state.rank,seed:state.originSeed};Object.entries(state.gsat).forEach(([s,v])=>f['s.'+s]=v);const r=await api('admission',f);if(r.accepted){state.preferences=[q.id];resetFilters();save();render();return q.id;}}});assert(chosen);
await click(p,'submit-universities');await interview(p);await p.waitForSelector('[data-action="accept"]');assert.equal(await p.evaluate(()=>Object.keys(collection.programs).length),0);await click(p,'accept');assert.equal(await p.evaluate(()=>Object.keys(collection.programs).length),1);assert.equal(await p.evaluate(()=>state.newAchievements.length),5);
assert.equal(await p.locator('.unlocked-banner b').count(),5);
const accepted=await p.evaluate(()=>structuredClone(state)),first=await p.evaluate(()=>JSON.stringify(collection));
await p.evaluate(()=>recordCollection());assert.equal(await p.evaluate(()=>JSON.stringify(collection)),first);
await p.locator('#collection-button').click();await p.setViewportSize({width:390,height:844});await noOverflow(p);
await p.locator('.collection-school.has-unlocks summary').click();
assert.equal(await p.locator('.collection-school li.unlocked:visible').count(),1);
assert(await p.locator('.collection-school[open] li.locked:visible').count()>0);
await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:'/tmp/daiwan-mobile-collection.png',fullPage:true});await p.reload();await p.waitForSelector('.collection-page');assert.equal(await p.locator('.collection-school li.unlocked').count(),1);
await click(p,'close-collection');await click(p,'resume');await click(p,'restart');await p.locator('#confirm-ok').click();
assert.match(await p.locator('#seed-input').inputValue(),/^[A-Z0-9]+$/);
assert.notEqual(await p.locator('#seed-input').inputValue(),seed);
await p.locator('#collection-button').click();assert.equal(await p.locator('.collection-school li.unlocked').count(),1,'collection survives a new journey');
// Backfill only the currently saved accepted ending when upgrading an older save.
await p.evaluate(s=>{localStorage.removeItem(COLLECTION_KEY);saveStore(KEY,s);},accepted);await p.reload();await p.waitForSelector('.collection-page');assert.equal(await p.locator('.collection-school li.unlocked').count(),1);
const ids=await p.evaluate(id=>{const original=programs.find(p=>p.id===id);return [programs.find(p=>p.university===original.university&&p.id!==id).id,programs.find(p=>p.university!==original.university).id];},chosen);
for(const id of ids)await p.evaluate(id=>{state.ending='admitted';state.admission={accepted:true,program:id,preference:1};recordCollection();render();},id);
assert.equal(await p.locator('.collection-school.has-unlocks').count(),2);assert.equal(await p.locator('.collection-school li.unlocked').count(),3);
await p.evaluate(()=>{state.ending='retake';recordCollection();});assert.equal(await p.evaluate(()=>Object.keys(collection.programs).length),3);assert.deepEqual(errors,[]);
// Older accepted offers remain available in the archive, outside the active catalog.
await p.evaluate(s=>{
 state=structuredClone(s);
 const retired=archivedPrograms[0];
 state.admission={accepted:true,program:retired.id,preference:1};
 state.newAchievements=['campus-'+retired.university];
 save();recordCollection();
},accepted);
await p.reload();await p.waitForSelector('.collection-page');
assert(await p.getByRole('heading',{name:'歷屆收藏'}).isVisible());
await click(p,'close-collection');await click(p,'resume');
assert(await p.locator('#student-card').isVisible());
assert.equal(await p.evaluate(()=>admittedProgram().id),await p.evaluate(()=>archivedPrograms[0].id));
// A finished failed application only offers split or retake and cannot re-enter preferences.
await p.evaluate(()=>{
 state.ending=null;state.route='apply';finishAdmission([],null);
});
assert.equal(await p.locator('[data-action=revise]').count(),0);
assert(await p.locator('[data-action=prepare-split]').isVisible());
assert(await p.locator('[data-action=retake]').isVisible());
await p.evaluate(()=>setRoute('apply'));
assert.equal(await p.evaluate(()=>state.stage),'admissionResult');
console.log('PASS: touch, mouse and keyboard preference order, themed dice, school/grade banner, mobile submit placement/jump, desktop columns, university + rate filters, all-school collection with visible locked/unlocked departments, acceptance-only unlocks, persistence, backfill and deduplication, Chinese home labels.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
