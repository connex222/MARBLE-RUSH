/* Browser smoke for the approved MARBLE RUSH visual integration.
 * Requires npm install --no-save playwright && playwright install chromium.
 * Runs against a locally started game server; never touches production.
 */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
async function main(){
  const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:35993';
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__marbleArtDraws={backgrounds:new Set(),textures:new Set(),props:new Set()};
    const originalDraw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
      const src=(image&&typeof image.src==='string')?image.src:'';
      if(src.includes('bg_far_'))window.__marbleArtDraws.backgrounds.add(src.split('/').pop());
      if(src.includes('prop_'))window.__marbleArtDraws.props.add(src.split('/').pop());
      return originalDraw.call(this,image,...args);
    };
    const originalPattern=CanvasRenderingContext2D.prototype.createPattern;
    CanvasRenderingContext2D.prototype.createPattern=function(image,...args){
      const src=(image&&typeof image.src==='string')?image.src:'';
      if(src.includes('tex_rail_'))window.__marbleArtDraws.textures.add(src.split('/').pop());
      return originalPattern.call(this,image,...args);
    };
  });
  try{
    await page.goto(base+'/tv',{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('#btnBoot').click();
    // Force full-effects art rendering on headless CI even if its framerate dips.
    await page.locator('[data-set="fx"]').click();
    await page.locator('#btnKb').click();
    await page.locator('#btnStart').waitFor({state:'visible',timeout:10000});
    await page.locator('#btnStart').click();
    await page.locator('#voteCards .vcard').first().waitFor({state:'visible',timeout:10000});
    const cards=page.locator('#voteCards .vcard');
    const names=await cards.locator('.vname').allTextContents();
    assert.equal(names.length,3,'Three track choices are required');
    const choice=names.findIndex(x=>!x.toLowerCase().includes('jungle'));
    assert.ok(choice>=0,'This smoke test needs an already-complete theme');
    await cards.nth(choice).click();
    await page.locator('#btnSkipVote').click();
    await page.waitForSelector('#raceHud:not([hidden])',{timeout:20000});
    await page.waitForTimeout(5000);
    const stats=await page.evaluate(()=>{
      const art=window.__marbleArtDraws;
      return {backgrounds:[...art.backgrounds],textures:[...art.textures],props:[...art.props],
        track:document.querySelector('#trackName')?.textContent,
        imageCount:performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/img/')).length};
    });
    await page.screenshot({path:'qa-art-race-preview.png',fullPage:true});
    console.log('BROWSER ART DRAW STATS:',JSON.stringify(stats));
    assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
    assert.ok(stats.backgrounds.some(x=>x.startsWith('bg_far_')),'No approved theme far background painted on canvas');
    assert.ok(stats.textures.some(x=>x.startsWith('tex_rail_')),'No theme rail material applied to canvas');
    assert.ok(stats.props.some(x=>x.startsWith('prop_')),'No approved decorative props painted on canvas');
    console.log('PASS: real browser opened TV, added keyboard racer, selected track and rendered thematic background, patterned rail and transparent props');
  }finally{
    await browser.close();
  }
}
main().catch(e=>{console.error('FAIL:',e.stack||e);process.exitCode=1;});
