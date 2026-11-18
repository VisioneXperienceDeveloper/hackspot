import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = resolve('dist');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/nested\//, '/');
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(root + '/')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
async function openApp(page, name) {
  const running = page
    .getByRole('navigation', { name: '작업 표시줄' })
    .getByRole('button', { name, exact: true });
  if (await running.count()) {
    await running.click();
  } else {
    await page.getByRole('button', { name: '앱 및 파일 검색', exact: true }).click();
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).fill(name);
    await page.getByRole('group', { name: '설치된 앱', exact: true }).getByRole('option').click();
  }
}
async function finishSetup(page) {
  await openApp(page, '메일');
  const email = page.getByLabel('메일 주소');
  if (await email.count()) {
    await email.fill('nightowl');
    await page.getByRole('button', { name: '계정 만들기', exact: true }).click();
    await openApp(page, '브라우저');
    await page
      .getByRole('region', { name: '브라우저 창', exact: true })
      .locator('.site-directory')
      .getByRole('button', { name: /VAULT BANK/ })
      .click();
    await page.getByRole('button', { name: '새 계좌 개설', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: '계좌 개설하기', exact: true }).click();
  }
  await openApp(page, '메일');
  const startButton = page
    .getByRole('region', { name: '메일 창', exact: true })
    .getByRole('button', { name: '조사 시작', exact: true });
  if (await startButton.count()) await startButton.click();
}
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/nested/']) {
    const page = await browser.newPage();
    const errors = [];
    const assets = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(r.url());
      if (r.url().endsWith('/ocean.png')) assets.push(r.url());
    });
    await page.goto(base + path);
    await finishSetup(page);
    await page.getByRole('button', { name: '앱 및 파일 검색', exact: true }).click();
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).fill('메모장');
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).press('Enter');
    await page.getByRole('textbox', { name: '개인 메모' }).fill('하위 경로에서도 진행 복구');
    await page.getByRole('button', { name: '저장하기', exact: true }).click();
    await page.getByLabel('파일 이름', { exact: true }).fill('하위 경로 메모.txt');
    await page.getByLabel('저장할 폴더', { exact: true }).fill('조사 기록/해온');
    await page.getByRole('button', { name: '파일 저장', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: '앱 및 파일 검색', exact: true }).click();
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).fill('메모장');
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).press('Enter');
    assert.equal(
      await page.getByRole('textbox', { name: '개인 메모' }).inputValue(),
      '하위 경로에서도 진행 복구',
    );
    const savedNote = await page.evaluate(() => {
      const files = JSON.parse(localStorage.getItem('echo-investigation-v1')).noteFiles;
      return files
        .map(({ name, folder, content }) => ({ name, folder, content }))
        .find(({ name }) => name === '하위 경로 메모.txt');
    });
    assert.deepEqual(savedNote, {
      name: '하위 경로 메모.txt',
      folder: '조사 기록/해온',
      content: '하위 경로에서도 진행 복구',
    });
    await page.waitForLoadState('networkidle');
    assert.ok(assets.length > 0);
    assert.deepEqual(errors, []);
    const timing = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('echo-investigation-v1'));
      state.notes = '가'.repeat(10000);
      state.history = Array(100).fill('x'.repeat(512));
      state.terminal = Array(160).fill({ input: 'x'.repeat(512), output: '기록'.repeat(1000) });
      const times = [];
      let size = 0;
      try {
        for (let i = 0; i < 30; i++) {
          const start = performance.now();
          const raw = JSON.stringify(state);
          size = raw.length;
          localStorage.setItem('echo-benchmark', raw);
          times.push(performance.now() - start);
        }
      } finally {
        localStorage.removeItem('echo-benchmark');
      }
      times.sort((a, b) => a - b);
      return { characters: size, p95Ms: times[Math.floor(times.length * 0.95)] };
    });
    console.log(
      JSON.stringify({ path, assetsLoaded: true, reloadRestored: true, saveBenchmark: timing }),
    );
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
