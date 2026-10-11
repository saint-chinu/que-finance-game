const test=require('node:test');
const assert=require('node:assert/strict');
const {bootDOM}=require('./helpers/dom.cjs');
test('career and period shares use the displayed result, canonical URL, and a working copy fallback',async()=>{
 const ui=bootDOM();
 try{
  ui.click('#welcomeStart');ui.click('#skipIntro');
  ui.run('showFinalResult()');
  let section=ui.document.querySelector('.result-share');
  assert(section);
  let intent=new URL(section.querySelector('a').href);
  assert.equal(intent.origin,'https://x.com');
  assert.equal(intent.pathname,'/intent/post');
  assert.equal(intent.searchParams.get('url'),'https://que-finance-game.doppel-tag.workers.dev/');
  assert.equal(intent.searchParams.get('hashtags'),'資本主義の権化,ブラウザゲーム');
  assert.match(intent.searchParams.get('text'),/経営途中・確定0か月/);
  assert.match(intent.searchParams.get('text'),/財務スコア：未確定/);
  let copied='';Object.defineProperty(ui.window.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
  await section.querySelector('button').onclick();
  assert.equal(copied,section.querySelector('.result-share-preview').textContent);
  assert.match(section.querySelector('[role=status]').textContent,/コピーしました/);
  ui.window.navigator.clipboard.writeText=async()=>{throw Error('denied');};
  await section.querySelector('button').onclick();
  assert.match(section.querySelector('[role=status]').textContent,/選択してコピー/);
  ui.click('#closeShopDialog');ui.click('#commit');ui.finishEntries();ui.run('showYearReview(1)');
  section=ui.document.querySelector('.result-share');
  intent=new URL(section.querySelector('a').href);
  assert.match(intent.searchParams.get('text'),/第1期 1か月の期中成績/);
  assert(!intent.searchParams.get('text').includes('10年間の経営完了'));
  assert.match(intent.searchParams.get('text'),/税引後損益.*円/);
  assert.equal(ui.errors.length,0);
 }finally{ui.close();}
});