const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.TEST_URL||'http://localhost:8090/dist/';
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

async function choose(p,key,value){await p.locator(`[data-select-wrap="${key}"] .select-trigger`).click();await p.locator(`[data-select-wrap="${key}"] [data-value="${value}"]`).click();}
async function noOverflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(BASE+'#collection');await p.waitForSelector('.collection-page');assert.equal(await p.locator('.collection-school').count(),100);assert.equal(await p.locator('.collection-school[open]').count(),0);assert((await p.locator('.collection-summary').innerText()).includes('0 / 827'));await noOverflow(p);
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
for(const target of await p.locator('.allocate-card').all()){
 const box=await target.boundingBox();
 assert(box.y>=0&&box.y+box.height<=568,'allocation target visible without scrolling');
}
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
assert.equal(await p.locator('.school-card').count(),827);
await p.locator('#catalog-search').fill('台北大學');
assert.equal(await p.locator('.school-card h3').first().textContent(),'苔北大學');
await p.locator('#catalog-search').fill('');
const preferences=await p.evaluate(()=>JSON.stringify(state.preferences));await choose(p,'university','nycu');assert.equal(await p.locator('.school-card').count(),19);assert((await p.locator('.school-card h3').allTextContents()).every(s=>s==='楊明蕉通大學'));
for(const sort of ['chance-asc','chance-desc']){await choose(p,'sort',sort);assert.equal(await p.evaluate(()=>JSON.stringify(state.preferences)),preferences);const values=(await p.locator('.program-fit>b').allTextContents()).map(t=>Number(t.replace('%','')));assert(values.every((n,i)=>!i||(sort==='chance-asc'?n>=values[i-1]:n<=values[i-1])));}
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await click(p,'review-preferences');await p.waitForFunction(()=>document.querySelector('[data-action="submit-universities"]').getBoundingClientRect().top>=0&&document.querySelector('[data-action="submit-universities"]').getBoundingClientRect().bottom<innerHeight);await p.screenshot({path:'/tmp/daiwan-mobile-preferences.png',fullPage:false});
const current=await p.evaluate(()=>JSON.stringify(state));await p.locator('#collection-button').click();assert.equal(await p.locator('.collection-school').count(),100);assert.equal(await p.locator('.collection-school[open]').count(),0);await click(p,'close-collection');assert.equal(await p.evaluate(()=>JSON.stringify(state)),current);
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
console.log('PASS: mobile submit placement/jump, desktop columns, university + rate filters, all-school collection with visible locked/unlocked departments, acceptance-only unlocks, persistence, backfill and deduplication, Chinese home labels.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
