// 選用的端對端驗證：需要可用的 playwright 與 Chromium。
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:8080';
const source = fs.readFileSync(path.join(__dirname, '../src/Main.java'), 'utf8');
const bank = source.split('String bank = """')[1].split('""";')[0].trim().split('\n');
const key = Object.fromEntries(bank.map((s,i)=>['q'+i,Number(s.split('|')[4])]));
const essay = '我希望在高中完成自己的作品，因為我喜歡觀察生活，所以想把想法變成實際成果。例如我曾經和朋友設計海報，學會了分工，也發現自己還需要練習表達。未來我希望規劃固定的練習時間，記錄遇到的困難，並且勇敢向老師與同學請教，逐步完成一件能分享給大家的作品。';
(async()=>{
  const browser = await chromium.launch({headless:true, ...(process.env.TEST_BROWSER_CHANNEL ? {channel:process.env.TEST_BROWSER_CHANNEL} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.screenshot({path:'/tmp/daiwan-home.png',fullPage:true});
    await page.locator('#player-name').fill('測試旅人 <冒險>');
    await page.locator('#start-form button').click();
    await page.waitForSelector('[data-action="answer"]');
    for(let i=0;i<18;i++){
      const q=await page.evaluate(()=>state.questions[state.qIndex]);
      await page.locator(`[data-action="answer"][data-value="${key[q.id]}"]`).click();
      await page.locator('[data-action="next-question"]').click();
    }
    await page.locator('#essay').fill(essay);
    await page.locator('[data-action="submit-exam"]').click();
    await page.waitForSelector('[data-action="open-highschools"]');
    assert.equal(await page.evaluate(()=>state.cap.total),36);
    await page.reload();
    await page.locator('[data-action="resume"]').click();
    assert.equal(await page.evaluate(()=>state.stage),'cap');
    await page.locator('[data-action="open-highschools"]').click();
    await page.locator('[data-action="add-preference"][data-id="h0"]').click();
    await page.locator('[data-action="add-preference"][data-id="h2"]').click();
    await page.locator('[data-action="move-preference"][data-id="h2"][data-dir="-1"]').click();
    assert.equal(await page.evaluate(()=>state.preferences[0]),'h2');
    await page.locator('[data-action="submit-highschools"]').click();
    await page.locator('[data-action="enter-school"]').click();
    for(let round=0;round<18;round++){
      for(const id of [0,1,2])await page.locator(`[data-action="change-action"][data-id="${id}"][data-dir="1"]`).click();
      await page.locator('[data-action="event-choice"][data-id="0"]').click();
      await page.locator('[data-action="resolve-round"]').click();
      while(await page.locator('[data-action="allocate-point"]:not(:disabled)').count())await page.locator('[data-action="allocate-point"]:not(:disabled)').first().click();
      if(round===3){
        const before=await page.evaluate(()=>JSON.stringify([state.attrs,state.history,state.lastRound]));
        await page.reload();await page.locator('[data-action="resume"]').click();
        assert.equal(await page.evaluate(()=>JSON.stringify([state.attrs,state.history,state.lastRound])),before);
      }
      await page.locator('[data-action="next-round"]').click();
      if(round===14){
        for(const s of ['數學A','自然'])await page.locator(`input[name="exam-subject"][value="${s}"]`).check();
        await page.locator('[data-action="take-gsat"]').click();
        assert.equal(Object.keys(await page.evaluate(()=>state.gsat)).length,6);
        await page.locator('[data-action="continue-senior"]').click();
      }
    }
    assert.equal(await page.evaluate(()=>state.history.length),18);
    assert.equal(new Set(await page.evaluate(()=>state.history.map(h=>h.event))).size,18);
    await page.locator('[data-action="choose-route"][data-route="apply"]').click();
    await page.locator('[data-action="add-preference"]:not(:disabled)').last().click();
    await page.locator('[data-action="submit-universities"]').click();
    await page.waitForSelector('[data-action="accept-admission"]');
    await page.locator('[data-action="accept-admission"]').click();
    assert.equal(await page.evaluate(()=>state.ending),'admitted');
    const downloadPromise=page.waitForEvent('download');
    await page.locator('[data-action="download-story"]').click();
    assert.equal((await downloadPromise).suggestedFilename(),'呆丸升學旅程.txt');
    await page.screenshot({path:'/tmp/daiwan-ending.png',fullPage:true});
    // 從已完成養成狀態另存分支，驗證繁星落榜、分科與重考。
    await page.evaluate(()=>{state.stage='routes';state.rank=40;state.starUsed=false;state.ending=null;save();render();});
    await page.locator('[data-action="choose-route"][data-route="star"]').click();
    await page.locator('[data-action="add-preference"]:not(:disabled)').last().click();
    await page.locator('[data-action="submit-universities"]').click();
    await page.waitForSelector('[data-action="prepare-division"]');
    await page.locator('[data-action="prepare-division"]').click();
    if(await page.locator('#decision-dialog[open]').count())await page.locator('[data-confirm]').click();
    await page.locator('[data-action="take-division"]').click();
    await page.locator('[data-action="open-distribution"]').click();
    await page.locator('[data-action="add-preference"]:not(:disabled)').last().click();
    await page.locator('[data-action="submit-universities"]').click();
    await page.waitForSelector('[data-action="retake-ending"]');
    await page.locator('[data-action="retake-ending"]').click();
    await page.locator('[data-confirm]').click();
    assert.equal(await page.evaluate(()=>state.ending),'retake');
    // 手機寬度下各主要畫面都不能橫向溢出。
    await page.setViewportSize({width:390,height:844});
    for(const stage of ['ending','routes','universities','round','roundResult','gsatResult']){
      await page.evaluate(stage=>{state.stage=stage;if(stage==='round'){state.round=0;resetRound();}render();},stage);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`手機橫向溢出：${stage}`);
    }
    await page.evaluate(()=>{welcome=true;render();});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'首頁手機溢出');
    await page.screenshot({path:'/tmp/daiwan-mobile.png',fullPage:true});
    // 控制成績測試失敗分支：低學測繁星落榜後，仍可進入個申。
    await page.evaluate(()=>{welcome=false;state.gsat=Object.fromEntries(SUBJECTS.map(s=>[s,1]));state.rank=50;state.starUsed=false;state.stage='routes';render();});
    await page.locator('[data-action="choose-route"][data-route="star"]').click();
    await page.locator('[data-action="add-preference"]:not(:disabled)').first().click();
    await page.locator('[data-action="submit-universities"]').click();
    await page.waitForSelector('[data-action="failed-star-apply"]');
    assert.equal(await page.evaluate(()=>state.admission.accepted),false);
    await page.locator('[data-action="failed-star-apply"]').click();
    assert.equal(await page.evaluate(()=>state.route),'apply');
    // 用固定滿分驗證50志願上限與排序，不依賴本輪養成路線。
    await page.evaluate(()=>{state.division=Object.fromEntries(SPLITS.map(s=>[s,60]));setRoute('distribution');});
    for(let i=0;i<50;i++)await page.locator('[data-action="add-preference"]:not(:disabled)').first().click();
    assert.equal(await page.evaluate(()=>state.preferences.length),50);
    assert.equal(await page.locator('[data-action="add-preference"]:not(:disabled)').count(),0);
    await page.locator('[data-action="move-preference"][data-dir="-1"]:not(:disabled)').last().click();
    await page.locator('[data-action="submit-universities"]').click();
    await page.waitForSelector('[data-action="accept-admission"]');
    // 低分開局：五志願限制與續招都能使用。
    const low = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    low.on('pageerror',e=>errors.push(e.message));
    await low.goto(base);await low.locator('#player-name').fill('低分測試');await low.locator('#start-form button').click();await low.waitForSelector('[data-action="answer"]');
    for(let i=0;i<18;i++){
      const q=await low.evaluate(()=>state.questions[state.qIndex]);
      await low.locator(`[data-action="answer"][data-value="${(key[q.id]+1)%4}"]`).click();
      await low.locator('[data-action="next-question"]').click();
    }
    await low.locator('#essay').fill(essay);await low.locator('[data-action="submit-exam"]').click();await low.waitForSelector('[data-action="open-highschools"]');
    assert.equal(await low.evaluate(()=>state.cap.total),6);
    await low.locator('[data-action="open-highschools"]').click();
    for(let i=0;i<5;i++)await low.locator('[data-action="add-preference"]:not(:disabled)').first().click();
    assert.equal(await low.locator('[data-action="add-preference"]:not(:disabled)').count(),0);
    await low.locator('[data-action="submit-highschools"]').click();
    assert.equal(await low.evaluate(()=>state.supplement),true);
    assert.equal(await low.locator('.school-card').count(),1);
    await low.locator('[data-action="add-preference"]').click();await low.locator('[data-action="submit-highschools"]').click();
    await low.locator('[data-action="enter-school"]').click();
    await low.screenshot({path:'/tmp/daiwan-round-mobile.png',fullPage:true});
    assert(await low.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS：18題、寫作、志願排序、續存、18回合、學測、申請、繁星落榜轉申請、分科50志願、低分續招、兩種結局、下載、手機版面，無瀏覽器錯誤。');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
