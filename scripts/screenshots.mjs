// Install the real temporary extension in Firefox, smoke-test it, and capture UI.
// web-ext's RDP helper is internal; its version is pinned in package-lock.json.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firefox } from 'playwright';
import { connectWithMaxRetries } from '../node_modules/web-ext/lib/firefox/remote.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const sampleText = await readFile(resolve(root, 'listing/sample.json'), 'utf8');
const sample = JSON.parse(sampleText);
const server = http.createServer((request, response) => {
  if (request.url === '/ordinary.html') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Ordinary page</title><p>Leave this page unchanged.</p>');
  } else {
    response.setHeader('Content-Type', 'application/json');
    response.end(request.url === '/invalid.json' ? '{invalid' :
      request.url === '/primitive.json' ? '42' : sampleText);
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const probe = net.createServer();
await new Promise(done => probe.listen(0, '127.0.0.1', done));
const debugPort = probe.address().port;
await new Promise(done => probe.close(done));

let browser;
let remote;
try {
  browser = await firefox.launch({
    headless: true,
    args: ['--start-debugger-server', String(debugPort)],
    firefoxUserPrefs: {
      'devtools.debugger.remote-enabled': true,
      'devtools.debugger.prompt-connection': false,
      'devtools.chrome.enabled': true,
      'devtools.jsonview.enabled': false,
    },
  });
  remote = await connectWithMaxRetries({ port: debugPort });
  await remote.installTemporaryAddon(root, false);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/sample.json`);
  await page.locator('#jf-tree > .jf-line').waitFor();
  await page.waitForFunction(() => document.querySelector('link[rel="stylesheet"]')?.sheet);
  assert.deepEqual(await page.evaluate(() => window.data), sample);
  assert.equal(await page.locator('#jf-tree > .jf-line > .jf-key').count(), 0);
  assert.equal(await page.locator('#jf-tree > .jf-line > .jf-toggle').textContent(), '▶');
  assert.equal(await page.locator('#jf-root').getAttribute('data-theme'), 'auto');

  const capture = async name => {
    await page.mouse.move(1270, 790);
    await page.screenshot({ path: resolve(root, `listing/screenshots/${name}`), animations: 'disabled' });
  };
  await mkdir(resolve(root, 'listing/screenshots'), { recursive: true });
  const countRow = page.locator('.jf-line[data-path="data.endpoints[0].response.count"] > .jf-key');
  await countRow.click();
  assert.equal(await page.locator('#jf-path-text').textContent(), 'data.endpoints[0].response.count');
  assert.match(await page.locator('#jf-path-bar').getAttribute('class'), /jf-pinned/);
  await capture('01-dark-tree.png');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#jf-path-text').textContent(), '');

  // Use real theme controls: auto -> dark -> light.
  await page.locator('#jf-theme-btn').click();
  assert.equal(await page.locator('#jf-root').getAttribute('data-theme'), 'dark');
  await page.locator('#jf-theme-btn').click();
  assert.equal(await page.locator('#jf-root').getAttribute('data-theme'), 'light');
  await page.locator('#jf-levels button').getByText('2', { exact: true }).click();
  assert.ok(await page.locator('.jf-children.jf-collapsed').count() > 0);
  await capture('02-light-tree.png');
  await page.locator('#jf-levels button').getByText('All', { exact: true }).click();
  assert.equal(await page.locator('.jf-children.jf-collapsed').count(), 0);

  await page.locator('[data-view="formatted"]').click();
  assert.equal(await page.locator('#jf-formatted').textContent(), JSON.stringify(sample, null, 2));
  assert.ok(await page.locator('#jf-formatted').isVisible());
  await capture('03-formatted.png');
  await page.locator('[data-view="raw"]').click();
  assert.equal(await page.locator('#jf-raw').textContent(), JSON.stringify(sample));
  assert.ok(await page.locator('#jf-raw').isVisible());
  await page.locator('[data-view="tree"]').click();
  const toggle = page.locator('#jf-tree > .jf-line > .jf-toggle');
  await toggle.click();
  assert.match(await page.locator('#jf-tree > .jf-line').getAttribute('class'), /jf-collapsed/);
  await toggle.click();
  await page.reload();
  await page.locator('#jf-root[data-theme="light"]').waitFor();

  for (const path of ['/ordinary.html', '/invalid.json', '/primitive.json']) {
    await page.goto(origin + path);
    // Wait for the content script's document_end turn before asserting no viewer.
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#jf-root').count(), 0, path);
  }
  assert.deepEqual(errors, []);
  console.log(`Firefox ${browser.version()}: real extension smoke checks passed; three 1280x800 screenshots saved.`);
} finally {
  remote?.disconnect();
  await browser?.close();
  await new Promise(done => server.close(done));
}
