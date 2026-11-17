const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

async function localSite() {
  const root = path.resolve(__dirname, '../docs');
  const mount = '/pelican-ride/';
  const types = {'.html':'text/html', '.js':'text/javascript', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png'};
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(mount)) { res.writeHead(404).end(); return; }
    const file = path.join(root, pathname.slice(mount.length) || 'index.html');
    try { const data = await readFile(file); res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'}).end(data); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url:'http://127.0.0.1:' + server.address().port + mount, close:() => server.close()};
}

async function run() {
  const site = process.env.GAME_URL ? {url:process.env.GAME_URL, close() {}} : await localSite();
  let context;
  try {
    context = await chromium.launchPersistentContext('', {
      headless: true,
      channel: process.env.BROWSER_CHANNEL || undefined,
      args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
      isMobile:true, hasTouch:true, viewport:{width:390,height:844}, deviceScaleFactor:1, reducedMotion:'reduce'
    });
    const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const touch = (type, points=[]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:points});
    const center = async (selector, id) => {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, 'touch target ' + selector);
      return {x:box.x+box.width/2,y:box.y+box.height/2,id};
    };
    const ready = () => page.locator('#loading').waitFor({state:'hidden', timeout:60000});
    assert.equal((await page.goto(site.url)).status(), 200);
    await ready();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const installation = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const manifest = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
      return {scope:reg.scope, display:manifest.display, name:manifest.name};
    });
    assert.equal(installation.scope, site.url);
    assert.equal(installation.display, 'standalone');
    assert.equal(installation.name, 'Pelican Ride');
    const installability = await cdp.send('Page.getInstallabilityErrors');
    assert.deepEqual(installability.installabilityErrors, []);
    const stageFits = () => page.evaluate(() => {
      const rect=document.querySelector('#stage').getBoundingClientRect();
      return Math.abs(rect.left)<2 && Math.abs(rect.top)<2 &&
        Math.abs(rect.width-innerWidth)<2 && Math.abs(rect.height-innerHeight)<2;
    });
    await page.locator('#rideMode').tap();
    await page.waitForFunction(() => document.querySelector('#viewer').classList.contains('immersive'));
    assert.ok(await stageFits(), 'ride fills the available viewport');
    await page.locator('[data-drive=right]').tap();
    // A leftward camera drag must leave the player in the right lane.
    await touch('touchStart',[{x:248,y:340,id:1}]);await touch('touchMove',[{x:120,y:360,id:1}]);await touch('touchEnd');
    await page.waitForFunction(() => +document.querySelector('#meters').textContent >= 25);
    assert.ok(await page.locator('#resultPanel').isHidden(), 'clear the opening log');
    // The shield sits in the right lane. Collecting it proves the direction input took effect.
    assert.ok(await page.locator('#shieldTag').isVisible(), 'steered right');
    await page.locator('#flyButton').tap();
    await page.waitForFunction(() => document.querySelector('[data-drive=jump]').getAttribute('aria-label')==='爬升');
    const up = await center('[data-drive=jump]', 1), boost = await center('#boostButton', 2);
    await touch('touchStart', [up]); await touch('touchStart', [up, boost]);
    await page.waitForFunction(() =>
      parseFloat(document.querySelector('#altTag').textContent.split(' ')[1]) > 4.7 &&
      +document.querySelector('#velocity').textContent > 44
    );
    await touch('touchCancel');
    await page.waitForFunction(() => !document.querySelector('.touch-pad .pressed') &&
      document.querySelector('#boostButton').getAttribute('aria-pressed')==='false');
    await page.locator('#rollButton').tap();
    await page.waitForFunction(() => document.querySelector('#runEvent').textContent.includes('横滚 +'));
    await page.locator('#play').tap();
    const distance = await page.locator('#meters').textContent();
    const scene=page.locator('#film');
    const firstView=await scene.screenshot();
    await touch('touchStart',[{x:128,y:385,id:1}]);
    await touch('touchMove',[{x:252,y:370,id:1}]);await touch('touchEnd');
    await page.waitForTimeout(160);
    assert.ok(!firstView.equals(await scene.screenshot()), 'one finger rotates a paused scene');
    const zoomBase=await scene.screenshot();
    await touch('touchStart',[{x:138,y:399,id:1},{x:240,y:399,id:2}]);
    await touch('touchMove',[{x:95,y:399,id:1},{x:283,y:399,id:2}]);await touch('touchEnd');
    await page.waitForTimeout(160);
    assert.ok(!zoomBase.equals(await scene.screenshot()), 'pinch zoom');
    assert.ok(await page.evaluate(() => {
      const targets=['h1','#runHud small','#play svg','#touchPad small','#boostButton','#rideMode span'];
      return targets.every(s=>getComputedStyle(document.querySelector(s)).webkitUserSelect==='none') &&
        !document.querySelector('#runHud').dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}));
    }), 'game UI suppresses selection');
    for (const [width,height] of [[320,568],[844,390]]) {
      await page.setViewportSize({width,height});
      assert.ok(await stageFits(), 'full scene after rotation');
      const pad = await page.locator('#touchPad').boundingBox(), actions = await page.locator('#arcadeActions').boundingBox();
      assert.ok(pad.x+pad.width <= actions.x && actions.x+actions.width <= width+1, 'thumb controls fit the viewport');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth===innerWidth));
    }
    assert.equal(await page.locator('#meters').textContent(), distance);
    // Exercise the layout used when Safari does not expose element fullscreen.
    await page.addInitScript(() => {
      for(const key of ['requestFullscreen','webkitRequestFullscreen']) {
        Object.defineProperty(Element.prototype,key,{value:undefined,configurable:true});
      }
    });
    await context.setOffline(true);
    await page.reload(); await ready();
    const full=page.locator('#full');
    assert.ok(await full.isVisible(),'expand button available without native fullscreen');
    await full.tap();assert.ok(await stageFits(),'fallback film expansion');
    await full.tap();assert.equal(await full.getAttribute('aria-pressed'),'false');
    await page.locator('#film').focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('#touchPad').isVisible(), 'offline play with keyboard arrows');
    await page.waitForFunction(() => !document.querySelector('#shieldTag').hidden);
    await page.keyboard.press('KeyF');await page.keyboard.down('ArrowUp');
    await page.waitForFunction(() => parseFloat(document.querySelector('#altTag').textContent.split(' ')[1])>4);
    await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowDown');
    await page.waitForFunction(() => parseFloat(document.querySelector('#altTag').textContent.split(' ')[1])<3.1);
    await page.keyboard.up('ArrowDown');
    await page.locator('#play').tap();await page.locator('#rideMode').tap();
    assert.equal(await full.getAttribute('aria-pressed'),'false','exiting restores the film layout');
    assert.deepEqual(errors, []);
    console.log('Passed touch and keyboard steering, one-finger orbit, pinch, selection suppression, fullscreen fallback, rotation, boost, stunts and offline play at ' + site.url);
  } finally { if (context) await context.close(); site.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
