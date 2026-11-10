const assert=require('node:assert/strict');
const click=(p,a)=>p.locator(`[data-action="${a}"]`).click();
const tile=(p,id)=>p.locator(`[data-action="puzzle-tile"][data-id="${id}"]`).click();
const adjacent=(a,b)=>Math.abs(a%5-b%5)+Math.abs(Math.floor(a/5)-Math.floor(b/5))===1;
function pathTo(g,target){
 const paths=[[g.position]],seen=new Set([g.position]);
 for(const path of paths){
  const last=path.at(-1);
  if(target(last))return path.slice(1);
  for(let i=0;i<25;i++){
   if(!seen.has(i)&&!g.walls.includes(i)&&adjacent(last,i)){seen.add(i);paths.push([...path,i]);}
  }
 }
 assert.fail('No route through maze');
}
async function solvePuzzle(p,g){
 if(g.type==='pattern'){
  if(g.preview)await click(p,'puzzle-ready');
  for(const i of g.sequence.slice(g.steps))await tile(p,i);
 }else if(g.type==='maze'){
  for(const i of pathTo(g,n=>n===g.goal))await tile(p,i);
 }else{
  for(const goal of g.targets.slice(g.steps)){
   const left=g.tiles.findIndex(n=>n+n!==goal&&g.tiles.includes(goal-n));
   await tile(p,left);await tile(p,g.tiles.indexOf(goal-g.tiles[left]));
  }
 }
}
async function missPuzzle(p,g){
 if(g.type==='pattern')await tile(p,(g.sequence[g.steps]+1)%4);
 else if(g.type==='maze'){
  const wallNear=n=>g.walls.some(i=>adjacent(i,n));
  const path=pathTo(g,wallNear);
  for(const i of path)await tile(p,i);
  await tile(p,g.walls.find(i=>adjacent(i,path.at(-1)??g.position)));
 }else{
  await tile(p,0);await tile(p,g.tiles[0]+g.tiles[1]===g.targets[g.steps]?2:1);
 }
}
async function interview(p,{reload=false}={}){
 await p.locator('[data-action="enter-interview"]').waitFor();
 const games=await p.evaluate(()=>state.interview.games.map(g=>g.type).sort());
 assert.deepEqual(games,['maze','pattern','sum']);
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
module.exports={interview,solvePuzzle,missPuzzle,pathTo};
