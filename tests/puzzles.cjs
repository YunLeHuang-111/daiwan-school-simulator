const assert=require('node:assert/strict');
const click=(p,a)=>p.locator(`[data-action="${a}"]`).click();
const tile=(p,id)=>p.locator(`[data-action="puzzle-tile"][data-id="${id}"]`).click();
async function beginRelay(p){
 if(await p.locator('[data-action="puzzle-start"]').count())await click(p,'puzzle-start');
 if(await p.locator('.relay-sequence').count()){
  await p.evaluate(()=>{activePuzzle().deadline=Date.now()-1;});
 }
 await p.locator('.relay-grid').waitFor();
}
async function expireRelay(p){
 await p.evaluate(()=>{activePuzzle().deadline=Date.now()-1;});
 await p.locator('.relay-feedback').waitFor();
 assert.match(await p.locator('.relay-feedback').innerText(),/時間到/);
}
async function stackDrop(p,hit){
 if(await p.locator('[data-action="puzzle-start"]').count())await click(p,'puzzle-start');
 await p.evaluate(hit=>{
  const g=state.stage==='interview'?state.interview.games[state.interview.index]:state.game.puzzle;
  // Fix the moving floor's phase at the instant of the click.
  const x=hit?g.floors.at(-1):g.floors.at(-1)>50?12:88;
  g.phase=(x-12)/.76;g.started=Date.now();
  document.querySelector('[data-action="puzzle-drop"]').click();
 },hit);
}
async function solvePuzzle(p,g){
 if(g.type==='stack'){
  for(let i=g.steps;i<5;i++)await stackDrop(p,true);
 }else if(g.type==='relay'){
  assert.deepEqual(g.rounds.map(seq=>seq.length),[4,5,6]);
  for(const seq of g.rounds.slice(g.steps)){
   await beginRelay(p);
   assert.equal(await p.locator('.relay-sequence').count(),0);
   for(const id of seq)await tile(p,id);
  }
 }else if(g.type==='recycle'){
  for(const item of g.items.slice(g.steps))await tile(p,item[2]);
 }else await tile(p,g.prizes.indexOf(100));
}
async function missPuzzle(p,g){
 if(g.type==='stack')await stackDrop(p,false);
 else if(g.type==='relay'){
  await beginRelay(p);
  await tile(p,(g.rounds[g.steps][g.recalled]+1)%6);
 }
 else await tile(p,(g.items[g.steps][2]+1)%4);
}
async function interview(p,{reload=false}={}){
 await p.locator('[data-action="enter-interview"]').waitFor();
 const games=await p.evaluate(()=>state.interview.games.map(g=>g.type).sort());
 assert.deepEqual(games,['recycle','relay','stack']);
 await click(p,'enter-interview');
 assert.equal(await p.locator('[data-action="interview-answer"]').count(),0);
 for(let i=0;i<3;i++){
  const puzzle=await p.evaluate(()=>state.interview.games[state.interview.index]);
  if(reload&&i===0){
   await p.reload();await click(p,'resume');
   assert.deepEqual(await p.evaluate(()=>state.interview.games[0]),puzzle);
  }
  await solvePuzzle(p,puzzle);
  assert.equal(await p.evaluate(()=>state.interview.games[state.interview.index].score),100);
  await click(p,'interview-next');
 }
}
module.exports={interview,solvePuzzle,missPuzzle,beginRelay,expireRelay};
