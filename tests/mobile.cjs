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
    await page.locator('#rideMode').tap();
    await page.locator('[data-drive=right]').tap();
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
    for (const [width,height] of [[320,568],[844,390]]) {
      await page.setViewportSize({width,height});
      const pad = await page.locator('#touchPad').boundingBox(), actions = await page.locator('#arcadeActions').boundingBox();
      assert.ok(pad.x+pad.width <= actions.x && actions.x+actions.width <= width+1, 'thumb controls fit the viewport');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth===innerWidth));
    }
    assert.equal(await page.locator('#meters').textContent(), distance);
    await context.setOffline(true);
    await page.reload(); await ready();
    await page.locator('#rideMode').tap();
    assert.ok(await page.locator('#touchPad').isVisible(), 'offline play');
    assert.deepEqual(errors, []);
    console.log('Passed mobile steering, two-thumb flight and boost, cancelled holds, rolls, portrait and landscape layout, installability and offline play at ' + site.url);
  } finally { if (context) await context.close(); site.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
