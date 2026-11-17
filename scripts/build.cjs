const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const esbuild = require('esbuild');

async function build() {
  const root = path.resolve(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file));
  const asset = name => read('assets/' + name).toString('base64');
  const bundle = await esbuild.build({
    absWorkingDir: root, entryPoints: ['src/main.js'], bundle: true,
    minify: true, write: false, format: 'iife', target: 'es2020', legalComments: 'inline'
  });

  let html = read('src/player.html').toString();
  const tokens = {
    __SCRIPT__: bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'),
    __PANO__: asset('coast.webp'), __SAND__: asset('sand.webp'), __LIGHT__: asset('light.hdr'),
    __SERIF__: 'data:font/ttf;base64,' + asset('roman.ttf'),
    __ITALIC__: 'data:font/ttf;base64,' + asset('italic.ttf'),
    __WIDE_POSTER__: 'data:image/webp;base64,' + asset('poster-wide.webp'),
    __TALL_POSTER__: 'data:image/webp;base64,' + asset('poster-tall.webp')
  };
  for (const [token, value] of Object.entries(tokens)) html = html.replace(token, () => value);
  const licenses = read('licenses/instrument-serif.txt') + '\n' + read('licenses/three.txt');
  html = html.replace('</body>', () => '<script type="text/plain" id="licenses">' + licenses + '</script></body>');

  const appHead = [
    '<link rel="icon" href="./icons/pelican.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="./icons/pelican-180.png">',
    '<link rel="manifest" href="./manifest.webmanifest">',
    '<meta name="apple-mobile-web-app-title" content="Pelican Ride">'
  ].join('\n');
  html = html.replace('<link rel="icon" href="data:,">', appHead);
  const register = `<script>
if ('serviceWorker' in navigator && ['https:', 'http:'].includes(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
</script>`;
  html = html.replace('</body>', () => register + '\n</body>');
  fs.writeFileSync(path.join(root, 'docs/index.html'), html);

  const worker = read('src/service-worker.js').toString();
  const hash = createHash('sha256').update(html).update(worker).update(read('docs/manifest.webmanifest'));
  for (const icon of fs.readdirSync(path.join(root, 'docs/icons')).sort()) hash.update(read('docs/icons/' + icon));
  const version = hash.digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(root, 'docs/sw.js'), worker.replace('__BUILD_VERSION__', version));
  console.log('Built docs/index.html and its offline cache ' + version);
}
build().catch(error => { console.error(error); process.exitCode = 1; });
