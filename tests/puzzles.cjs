const assert=require('node:assert/strict');
const click=(p,a)=>p.locator(`[data-action="${a}"]`).click();
const tile=(p,id)=>p.locator(`[data-action="puzzle-tile"][data-id="${id}"]`).click();
const footballAnswer=play=>play.defend?play.shot:[0,1,2].find(i=>i!==play.keeper&&i!==play.back);
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
  for(let i=g.steps;i<4;i++)await stackDrop(p,true);
 }else if(g.type==='football'){
  for(const play of g.plays.slice(g.steps))await tile(p,footballAnswer(play));
 }else if(g.type==='recycle'){
  for(const item of g.items.slice(g.steps))await tile(p,item[2]);
 }else await tile(p,g.prizes.indexOf(100));
}
async function missPuzzle(p,g){
 if(g.type==='stack')await stackDrop(p,false);
 else if(g.type==='football')await tile(p,(footballAnswer(g.plays[g.steps])+1)%3);
 else await tile(p,(g.items[g.steps][2]+1)%4);
}
async function interview(p,{reload=false}={}){
 await p.locator('[data-action="enter-interview"]').waitFor();
 const games=await p.evaluate(()=>state.interview.games.map(g=>g.type).sort());
 assert.deepEqual(games,['football','recycle','stack']);
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
module.exports={interview,solvePuzzle,missPuzzle};
