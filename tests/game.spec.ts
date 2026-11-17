import { test, expect, type Page } from '@playwright/test';

const saveKey = 'echo-investigation-v1';
const app = (page: Page, name: string) =>
  page.getByRole('region', { name: `${name} 창`, exact: true });
async function open(page: Page, name: string) {
  const running = page
    .getByRole('navigation', { name: '작업 표시줄' })
    .getByRole('button', { name, exact: true });
  if (await running.count()) await running.click();
  else {
    await page.getByRole('button', { name: '앱 및 파일 검색', exact: true }).click();
    await page.getByRole('combobox', { name: '앱 및 파일 검색어' }).fill(name);
    await page.getByRole('group', { name: '설치된 앱', exact: true }).getByRole('option').click();
  }
}
async function command(page: Page, text: string) {
  await open(page, '터미널');
  const input = page.getByRole('textbox', { name: '터미널 명령어' });
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}
async function saveNoteAs(page: Page, name: string, folder: string) {
  await app(page, '메모장').getByRole('button', { name: '저장하기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '메모 저장', exact: true });
  await dialog.getByRole('textbox', { name: '파일 이름' }).fill(name);
  await dialog.getByLabel('저장할 폴더', { exact: true }).fill(folder);
  await dialog.getByRole('button', { name: '파일 저장', exact: true }).click();
}
async function openFolder(page: Page, path: string) {
  await open(page, '폴더');
  const parts = path.split('/').filter(Boolean);
  const sidebar = app(page, '폴더').getByRole('navigation', { name: '폴더 사이드바' });
  if (!parts.length) await sidebar.getByRole('button', { name: '내 파일', exact: true }).click();
  else {
    await sidebar.getByRole('button', { name: `${parts[0]} 폴더`, exact: true }).click();
    for (const part of parts.slice(1))
      await app(page, '폴더')
        .locator('.finder-items')
        .getByRole('button', { name: part, exact: true })
        .dblclick();
  }
}
async function visit(page: Page, url: string) {
  await open(page, '브라우저');
  const input = page.getByRole('textbox', { name: '가상 브라우저 주소' });
  await input.fill(url);
  await input.press('Enter');
  await expect(app(page, '브라우저').locator('.virtual-site')).toBeVisible();
}
async function saved(page: Page) {
  await expect(page.locator('.taskbar-status [role="status"]')).toHaveText('저장됨');
}
async function snapshot(page: Page) {
  await saved(page);
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const found: string[] = [];
  errors.set(page, found);
  page.on('pageerror', (e) => found.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') found.push(m.text());
  });
  page.on('requestfailed', (r) => found.push(r.url() + ': ' + r.failure()?.errorText));
  await page.goto('/');
  await expect(page).toHaveTitle('잔향 — 사라진 11분');
  await expect(app(page, '메일').getByRole('heading', { name: '사라진 11분' })).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const route of ['review', 'public'] as const) {
  test(`자료 조사 → 저장 재개 → 잘못된 판단 재시도 → ${route} 결말`, async ({ page }, info) => {
    await app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }).click();
    for (const url of [
      'haeon.test/report',
      'haeon.test/notice',
      'tide.test/',
      'tide.test/handover',
      'archive.test/',
      'archive.test/guide',
    ])
      await visit(page, url);
    await command(page, 'resolve haeon.test');
    await command(page, 'scan 10.17.0.11');
    await command(page, 'connect 10.17.0.11 auditor BAD');
    await expect(app(page, '터미널').getByRole('log')).toContainText('인증 실패');
    await command(page, 'connect 10.17.0.11 auditor MORA-1017');
    await command(page, 'ls');
    await command(page, 'read /audit/transfer.txt');
    await command(page, 'collect /audit/revision.log');
    await open(page, '메모장');
    await page.getByRole('textbox', { name: '개인 메모' }).fill('백업 호스트와 승인자를 대조한다.');
    await page.reload(); // page lifecycle flush must save the most recent edit without waiting.
    await open(page, '메모장');
    await expect(page.getByRole('textbox', { name: '개인 메모' })).toHaveValue(
      '백업 호스트와 승인자를 대조한다.',
    );
    expect((await snapshot(page)).evidence).toEqual(['revision']);
    await command(page, 'disconnect');
    await command(page, 'resolve vault.archive.test');
    await command(page, 'scan vault.archive.test');
    await command(page, 'connect vault.archive.test custodian ECHO-2314');
    await command(page, 'read /original/sensor.csv');
    await command(page, 'collect /original/sensor.csv');
    await command(page, 'read /original/approval.eml');
    await command(page, 'collect /original/approval.eml');
    await command(page, 'compare');
    await openFolder(page, '증거');
    await app(page, '폴더').getByRole('button', { name: 'sensor.csv', exact: true }).dblclick();
    const sheet = app(page, '액셀');
    await sheet.getByRole('cell', { name: '8.4', exact: true }).click();
    await expect(sheet.getByLabel('셀 위치')).toHaveText('B4');
    await expect(sheet.getByLabel('셀 값')).toHaveText('8.4');
    if (info.project.name === 'desktop' && route === 'review') {
      await page.screenshot({ path: '/tmp/hackspot-sheet-final.png' });
    }
    await page.keyboard.press('ArrowLeft');
    await expect(sheet.getByLabel('셀 위치')).toHaveText('A4');
    await expect(sheet.getByLabel('셀 값')).toHaveText('23:18');
    await openFolder(page, '증거');
    await app(page, '폴더').getByRole('button', { name: 'approval.eml', exact: true }).dblclick();
    await expect(
      app(page, '메일').getByRole('heading', { name: 'CHANGE-1017 / 오늘 보고서 처리' }),
    ).toBeVisible();
    await app(page, '메일').getByRole('button', { name: '수신함', exact: true }).click();
    await openFolder(page, '증거');
    await app(page, '폴더').getByRole('button', { name: 'comparison.txt', exact: true }).dblclick();
    await expect(app(page, '메모장').getByRole('textbox', { name: '개인 메모' })).toHaveValue(
      /한기석/,
    );
    await open(page, '메일');
    await app(page, '메일').getByRole('button', { name: '조사 결과 제출', exact: true }).click();
    await page.getByLabel('지시자', { exact: true }).selectOption('정민우');
    await page.getByLabel('은폐 사유').selectOption('오염 은폐');
    await page.getByLabel('누락 시간대').selectOption('23:14–23:25');
    await page.getByRole('button', { name: '증거와 함께 제출' }).click();
    await expect(page.getByRole('alert')).toContainText('일치하지');
    await page.getByLabel('지시자', { exact: true }).selectOption('한기석');
    await page.locator(`input[name="route"][value="${route}"]`).check();
    await page.getByRole('button', { name: '증거와 함께 제출' }).click();
    await expect(page.getByRole('dialog', { name: '조사 완료' })).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: route === 'review' ? '진실은 절차를 남겼다.' : '침묵은 끝났다.',
      }),
    ).toBeVisible();
    await saved(page);
    expect((await snapshot(page)).ending).toBe(route);
    await page.screenshot({ path: `/tmp/echo-${info.project.name}-${route}.png` });
    await page.reload();
    await expect(page.getByRole('dialog', { name: '조사 완료' })).toBeVisible();
    await page.getByRole('button', { name: '기록 돌아보기' }).click();
    await page.getByRole('button', { name: '진행 기록', exact: true }).click();
    await expect(page.locator('.journal-label')).toContainText('5 / 5');
  });
}

test('실행 중인 앱만 표시, 최소화 후 초안 유지, X 종료와 새 게임에서 초기화', async ({ page }) => {
  await expect(
    page.getByRole('navigation', { name: '작업 표시줄' }).getByRole('button'),
  ).toHaveCount(2);
  await visit(page, 'haeon.test/report');
  await visit(page, 'tide.test/handover');
  await page.getByRole('button', { name: '브라우저 최소화', exact: true }).click();
  await open(page, '브라우저');
  await expect(page.getByRole('textbox', { name: '가상 브라우저 주소' })).toHaveValue(
    'tide.test/handover',
  );
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '가상 브라우저 주소' })).toHaveValue(
    'haeon.test/report',
  );
  await page.getByRole('button', { name: '브라우저 닫기', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: '작업 표시줄' })
      .getByRole('button', { name: '브라우저', exact: true }),
  ).toHaveCount(0);
  await open(page, '브라우저');
  await expect(page.getByRole('textbox', { name: '가상 브라우저 주소' })).toHaveValue(
    'echo://start',
  );
  await open(page, '터미널');
  await page.getByRole('textbox', { name: '터미널 명령어' }).fill('미실행 입력');
  await page.getByRole('button', { name: '터미널 최소화', exact: true }).click();
  await open(page, '터미널');
  await expect(page.getByRole('textbox', { name: '터미널 명령어' })).toHaveValue('미실행 입력');
  await open(page, '메일');
  await app(page, '메일').getByRole('button', { name: '조사 결과 제출', exact: true }).click();
  await page.getByLabel('지시자', { exact: true }).selectOption('정민우');
  await page.getByRole('button', { name: '메일 닫기', exact: true }).click();
  await open(page, '메일');
  await app(page, '메일').getByRole('button', { name: '조사 결과 제출', exact: true }).click();
  await expect(page.getByLabel('지시자', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: '새 게임', exact: true }).click();
  await page.getByRole('button', { name: '새 조사 시작', exact: true }).click();
  await expect(
    app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }),
  ).toBeVisible();
  await app(page, '메일').getByRole('button', { name: '조사 결과 제출', exact: true }).click();
  await expect(page.getByLabel('지시자', { exact: true })).toHaveValue('');
  await open(page, '터미널');
  await expect(page.getByRole('textbox', { name: '터미널 명령어' })).toHaveValue('');
  await open(page, '브라우저');
  await expect(page.getByRole('textbox', { name: '가상 브라우저 주소' })).toHaveValue(
    'echo://start',
  );
});

test('키보드 기록·자동완성·지우기·IME 확정 방어', async ({ page }) => {
  await command(page, 'help');
  const input = page.getByRole('textbox', { name: '터미널 명령어' });
  await input.fill('draft');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('draft');
  await input.fill('hel');
  await input.press('Tab');
  await expect(input).toHaveValue('help ');
  await input.press('Control+l');
  await expect(app(page, '터미널').getByRole('log')).toHaveText('');
  await input.fill('한글');
  await input.dispatchEvent('compositionstart', { data: '한' });
  await input.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    isComposing: true,
    keyCode: 229,
  });
  await input.evaluate((el) => (el as HTMLInputElement).form!.requestSubmit());
  await expect(input).toHaveValue('한글');
  await expect(app(page, '터미널').getByRole('log')).toHaveText('');
  await input.dispatchEvent('compositionend', { data: '한글' });
  // Wait for the IME confirmation guard, then a separate intentional Enter is accepted.
  await expect.poll(() => input.evaluate(() => performance.now())).toBeGreaterThan(0);
  await page.waitForTimeout(60);
  await input.press('Enter');
  await expect(app(page, '터미널').getByRole('log')).toContainText('한글');
  await page.keyboard.press('Alt+2');
  await expect(app(page, '브라우저')).toHaveClass(/active/);
});

test('터미널 기본 도움말과 명령별 옵션을 표시한다', async ({ page }) => {
  await command(page, 'help');
  const output = app(page, '터미널').getByRole('log').locator('pre').last();
  await expect(output).toContainText('ls - 파일과 폴더 목록');
  await expect(output).not.toContainText('nmap');
  await command(page, 'man grep');
  await expect(output).toContainText('-v, --invert-match');
  await expect(output).toContainText("grep -in 'error' 기록.txt");
  await command(page, 'help nmap');
  await expect(output).toContainText('-p 포트목록');
});

test('터미널 맨 위에서 일반 사용자로 시작하고 루트 셸을 열고 나올 수 있다', async ({ page }) => {
  await open(page, '터미널');
  const terminal = app(page, '터미널');
  const log = terminal.getByRole('log');
  const prompt = terminal.locator('.terminal-prompt');
  const field = terminal.getByRole('textbox', { name: '터미널 명령어' });
  await expect(log).toBeEmpty();
  await expect(field).toBeFocused();
  await expect(prompt).toHaveText('analyst@hackspot:~$');
  const body = (await terminal.locator('.terminal-output').boundingBox())!;
  const input = (await field.boundingBox())!;
  expect(input.y - body.y).toBeLessThan(32);

  await command(page, 'sudo su root');
  await expect(prompt).toHaveText('root@hackspot:/home/analyst#');
  await command(page, 'id -u');
  const result = log.locator('pre').last();
  await expect(result).toHaveText('0');
  expect((await field.boundingBox())!.y).toBeGreaterThan((await result.boundingBox())!.y);
  await command(page, 'exit');
  await expect(prompt).toHaveText('analyst@hackspot:~$');
  await command(page, 'sudo su root');
  await page.reload();
  await open(page, '터미널');
  await expect(prompt).toHaveText('analyst@hackspot:~$');
});

test('손상 저장 원본 보존과 명시적 복구', async ({ page }) => {
  await saved(page);
  await page.evaluate((key) => localStorage.setItem(key, '{"version":99}'), saveKey);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('저장 기록을 읽을 수 없습니다');
  await page.getByRole('button', { name: '나중에', exact: true }).click();
  await app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), saveKey)).toBe('{"version":99}');
  await page.getByRole('button', { name: '저장 안내 열기' }).click();
  await page.getByRole('button', { name: '이 세션 저장 시작' }).click();
  await saved(page);
  expect((await snapshot(page)).accepted).toBe(true);
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('저장 실패를 알리고 재시도 시 현재 진행 보존', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      restoreStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('진행을 저장하지 못했습니다');
  await page.evaluate(() => {
    (window as unknown as { restoreStorage: () => void }).restoreStorage();
  });
  await page.getByRole('button', { name: '저장 다시 시도' }).click();
  await saved(page);
  expect((await snapshot(page)).accepted).toBe(true);
});

test('모달 포커스 격리, Escape 복귀, 반응형과 글자 확대', async ({ page }, info) => {
  await page.getByRole('button', { name: '조작 안내', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '조작 안내' });
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Alt+1');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: '조사로 돌아가기' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '대화상자 닫기' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: '조작 안내', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '글자 크기 변경' }).click();
  await expect(page.locator('main')).toHaveClass(/large-type/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: `/tmp/echo-${info.project.name}-desktop.png` });
  if (info.project.name === 'mobile')
    expect(await page.locator('.app-window:visible').count()).toBe(1);
});

test('창 이동·크기 조절·최대화·화면 축소 시 경계', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', '작은 화면은 단일 창 CSS 배치');
  await open(page, '터미널');
  const win = app(page, '터미널');
  const before = (await win.boundingBox())!;
  const title = win.locator('.window-name');
  const titleBox = (await title.boundingBox())!;
  await page.mouse.move(titleBox.x + 20, titleBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(300, 200);
  await page.mouse.up();
  const after = (await win.boundingBox())!;
  expect(after.x !== before.x || after.y !== before.y).toBe(true);
  const handle = (await win.locator('.resize-handle').boundingBox())!;
  await page.mouse.move(handle.x + 7, handle.y + 7);
  await page.mouse.down();
  await page.mouse.move(handle.x + 70, handle.y + 80);
  await page.mouse.up();
  const resized = (await win.boundingBox())!;
  expect(resized.width).toBeGreaterThan(after.width);
  await page.getByRole('button', { name: '터미널 최대화 또는 복원' }).click();
  await expect(win).toHaveClass(/maximized/);
  await page.getByRole('button', { name: '터미널 최대화 또는 복원' }).click();
  expect((await win.boundingBox())!.width).toBe(resized.width);
  await page.setViewportSize({ width: 900, height: 600 });
  const fitted = (await win.boundingBox())!;
  expect(fitted.x + fitted.width).toBeLessThanOrEqual(900);
  expect(fitted.y + fitted.height).toBeLessThanOrEqual(548);
});

test('미등록 주소·명령·권한 오류와 참고 문서 수집 실패에서 복구', async ({ page }) => {
  await open(page, '브라우저');
  const address = page.getByRole('textbox', { name: '가상 브라우저 주소' });
  await address.fill('https://example.com');
  await address.press('Enter');
  await expect(app(page, '브라우저')).toContainText('등록되지 않은 주소');
  await command(page, 'help __proto__');
  await expect(app(page, '터미널').getByRole('log')).toContainText('알 수 없는 명령어');
  await command(page, 'ls');
  await expect(app(page, '터미널').getByRole('log')).toContainText('메모');
  await command(page, 'scan haeon.test');
  await expect(app(page, '터미널').getByRole('log')).toContainText('의뢰를 수락');
  await open(page, '메일');
  await app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }).click();
  for (const c of [
    'resolve google.com',
    'resolve haeon.test',
    'scan haeon.test',
    'connect haeon.test auditor MORA-1017',
    'read /original/sensor.csv',
    'collect /audit/transfer.txt',
  ])
    await command(page, c);
  await expect(app(page, '터미널').getByRole('log')).toContainText('조사 참고 자료');
  expect((await snapshot(page)).evidence).toEqual([]);
  expect((await snapshot(page)).readFiles).toEqual([]);
  await command(page, 'read /audit/transfer.txt');
  expect((await snapshot(page)).readFiles).toContain('10.17.0.11/audit/transfer.txt');
});

test('좁은 화면과 낮은 화면에서도 앱 전환·대화상자 조작 가능', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 900, height: 500 },
  ]) {
    await page.setViewportSize(viewport);
    for (const name of ['터미널', '브라우저', '폴더', '메모장', '액셀', '메일']) {
      await open(page, name);
      await expect(app(page, name)).toBeVisible();
      const bounds = (await app(page, name).boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(42);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 52);
    }
    await page.getByRole('button', { name: '조작 안내', exact: true }).click();
    await page.getByRole('button', { name: '조사로 돌아가기' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

test('검색에서 앱·저장 메모·수집 파일 열기, 미확보 파일 제외와 현재 시각', async ({ page }) => {
  await app(page, '메일').getByRole('button', { name: '조사 시작', exact: true }).click();
  const launcher = page.getByRole('button', { name: '앱 및 파일 검색', exact: true });
  const search = page.getByRole('combobox', { name: '앱 및 파일 검색어' });
  const results = page.getByRole('listbox', { name: '검색 결과' });
  await launcher.click();
  await expect(search).toBeFocused();
  await expect(results.getByRole('option')).toHaveCount(6);
  await search.fill('sensor.csv');
  await expect(results.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('“sensor.csv” 검색 결과가 없습니다.')).toBeVisible();
  await search.fill('notepad');
  await search.press('Enter');
  await expect(app(page, '메모장')).toBeVisible();
  await expect(page.getByRole('dialog', { name: '앱 및 파일 검색' })).toHaveCount(0);
  const notes = page.getByRole('textbox', { name: '개인 메모' });
  await notes.fill('인계 기록을 연결한다.');
  await saveNoteAs(page, '인계.txt', '조사 기록');
  await open(page, '폴더');
  await expect(
    app(page, '폴더').getByRole('textbox', { name: '개인 메모', exact: true }),
  ).toHaveCount(0);
  await launcher.click();
  await search.fill('인계 기록');
  await expect(results.getByRole('option')).toHaveCount(1);
  await search.press('Enter');
  await expect(notes).toHaveValue('인계 기록을 연결한다.');
  await page.getByRole('button', { name: '메모장 닫기', exact: true }).click();
  await page.keyboard.press('Alt+5');
  await expect(notes).toHaveValue('');
  await openFolder(page, '조사 기록');
  await app(page, '폴더').getByRole('button', { name: '인계.txt', exact: true }).dblclick();
  await expect(notes).toHaveValue('인계 기록을 연결한다.');

  await command(page, 'resolve haeon.test');
  await command(page, 'scan 10.17.0.11');
  await command(page, 'connect 10.17.0.11 auditor MORA-1017');
  await command(page, 'collect /audit/revision.log');
  await launcher.click();
  await search.fill('revision.log');
  await expect(results.getByRole('option')).toHaveCount(1);
  await results.getByRole('option').click();
  await expect(app(page, '메모장').getByRole('textbox', { name: '개인 메모' })).toHaveValue(
    /operator.jm/,
  );
  await launcher.click();
  await search.press('ArrowDown');
  await expect(results.getByRole('option', { selected: true })).toContainText('브라우저');
  await search.press('Enter');
  await expect(app(page, '브라우저')).toBeVisible();
  await launcher.click();
  await search.press('Escape');
  await expect(launcher).toBeFocused();
  await expect(page.getByRole('button', { name: '진행 기록 펼치기' })).toHaveCount(0);
  await expect
    .poll(() => page.locator('.taskbar time').innerText())
    .toBe(
      await page.evaluate(() =>
        new Intl.DateTimeFormat('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()),
      ),
    );
});

test('빈 메모장 → 이름·폴더별 파일 저장 → 덮어쓰기 확인 → reload 후 폴더에서 다시 열기', async ({
  page,
}) => {
  await open(page, '메모장');
  const notes = page.getByRole('textbox', { name: '개인 메모' });
  await expect(app(page, '메모장').getByRole('heading')).toHaveCount(0);
  await expect(notes).toHaveValue('');
  await notes.fill('첫 번째 기록');
  await saveNoteAs(page, '조사.txt', '조사 기록/해온');
  await app(page, '메모장').getByRole('button', { name: '새 메모', exact: true }).click();
  await expect(notes).toHaveValue('');
  await notes.fill('다른 폴더의 기록');
  await saveNoteAs(page, '조사.txt', '메모');
  await app(page, '메모장').getByRole('button', { name: '새 메모', exact: true }).click();
  await notes.fill('갱신한 기록');
  await saveNoteAs(page, '조사.txt', '조사 기록/해온');
  await expect(page.getByRole('alert')).toContainText('같은 이름의 파일');
  await page.getByRole('button', { name: '덮어쓰기', exact: true }).click();
  expect((await snapshot(page)).noteFiles).toHaveLength(2);
  await page.reload();
  await openFolder(page, '조사 기록/해온');
  await app(page, '폴더').getByRole('button', { name: '조사.txt', exact: true }).dblclick();
  await expect(notes).toHaveValue('갱신한 기록');
  await page.getByRole('button', { name: '메모장 닫기', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: '작업 표시줄' })
      .getByRole('button', { name: '메모장', exact: true }),
  ).toHaveCount(0);
  await open(page, '메모장');
  await expect(notes).toHaveValue('');
  expect((await snapshot(page)).noteFiles).toHaveLength(2);
});

test('Finder 새 폴더·폴더 이동·파일 이름 변경과 이동·앱 연결·재시작 복구', async ({ page }) => {
  await openFolder(page, '');
  const finder = app(page, '폴더');
  await finder.getByRole('button', { name: '새 폴더', exact: true }).click();
  await page.getByLabel('폴더 이름', { exact: true }).fill('작업');
  await page.getByRole('button', { name: '만들기', exact: true }).click();
  await finder
    .locator('.finder-items')
    .getByRole('button', { name: '작업', exact: true })
    .dblclick();
  await finder.getByRole('button', { name: '폴더 뒤로', exact: true }).click();
  await finder.locator('.finder-items').getByRole('button', { name: '작업', exact: true }).click();
  await finder.getByRole('button', { name: '이름 변경', exact: true }).click();
  await page.getByLabel('새 이름', { exact: true }).fill('자료');
  await page.getByRole('button', { name: '변경', exact: true }).click();
  await expect(finder.getByRole('button', { name: '폴더 앞으로', exact: true })).toBeDisabled();
  await finder.locator('.finder-items').getByRole('button', { name: '자료', exact: true }).click();
  await finder.getByRole('button', { name: '이동', exact: true }).click();
  await page.getByLabel('이동할 폴더').selectOption('메모');
  await page.getByRole('button', { name: '여기로 이동', exact: true }).click();
  await openFolder(page, '메모/자료');
  await finder.getByRole('button', { name: '새 폴더', exact: true }).click();
  await page.getByLabel('폴더 이름', { exact: true }).fill('하위');
  await page.getByRole('button', { name: '만들기', exact: true }).click();
  await open(page, '메모장');
  await page.getByRole('textbox', { name: '개인 메모' }).fill('이동해도 남는 파일 내용');
  await app(page, '메모장').getByRole('button', { name: '저장하기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '메모 저장', exact: true });
  await expect(dialog.getByRole('heading', { name: '다른 이름으로 저장' })).toBeVisible();
  await dialog.getByLabel('파일 이름', { exact: true }).fill('기록.txt');
  await dialog.getByLabel('저장할 폴더', { exact: true }).fill('메모/자료');
  await dialog.getByLabel('저장할 폴더', { exact: true }).press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '새 폴더', exact: true }).click();
  await dialog.getByLabel('새 폴더 이름').fill('저장 위치');
  await dialog.getByRole('button', { name: '만들기', exact: true }).click();
  await expect(dialog.getByLabel('저장할 폴더', { exact: true })).toHaveValue(
    '메모/자료/저장 위치',
  );
  await dialog.getByRole('button', { name: '파일 저장', exact: true }).click();
  await openFolder(page, '메모/자료/저장 위치');
  await finder
    .locator('.finder-items')
    .getByRole('button', { name: '기록.txt', exact: true })
    .click();
  await finder.getByRole('button', { name: '이름 변경', exact: true }).click();
  await page.getByLabel('새 이름', { exact: true }).fill('새 기록.txt');
  await page.getByRole('button', { name: '변경', exact: true }).click();
  await finder
    .locator('.finder-items')
    .getByRole('button', { name: '새 기록.txt', exact: true })
    .click();
  await finder.getByRole('button', { name: '이동', exact: true }).click();
  await page.getByLabel('이동할 폴더').selectOption('조사 기록');
  await page.getByRole('button', { name: '여기로 이동', exact: true }).click();
  await page.reload();
  await openFolder(page, '조사 기록');
  await finder
    .locator('.finder-items')
    .getByRole('button', { name: '새 기록.txt', exact: true })
    .dblclick();
  await expect(app(page, '메모장').getByRole('textbox', { name: '개인 메모' })).toHaveValue(
    '이동해도 남는 파일 내용',
  );
  const state = await snapshot(page);
  expect(state.folders).toContain('메모/자료/하위');
  expect(state.folders).toContain('메모/자료/저장 위치');
  expect(state.noteFiles[0]).toMatchObject({ name: '새 기록.txt', folder: '조사 기록' });
});

test('리눅스 셸에서 만든 파일을 폴더에서 열고 가상 HTTP 설정을 복구한다', async ({ page }) => {
  for (const input of [
    "mkdir -p shell-demo && printf '%s\\n' ready > shell-demo/status.txt",
    'sudo su root',
    'ip addr add 192.168.50.10/24 dev eth0',
    'exit',
    'serve --bind 192.168.50.10 8080 shell-demo',
    'curl -fsS http://192.168.50.10:8080/status.txt | grep -n ready',
  ])
    await command(page, input);
  const output = app(page, '터미널').getByRole('log').locator('pre').last();
  await expect(output).toHaveText('1:ready');
  await openFolder(page, 'shell-demo');
  await app(page, '폴더').getByRole('button', { name: 'status.txt', exact: true }).dblclick();
  await expect(app(page, '메모장').getByRole('textbox', { name: '개인 메모' })).toHaveValue(
    'ready\n',
  );
  await page.reload();
  await command(page, 'ss -tuln');
  await expect(output).toContainText('192.168.50.10:8080');
  await command(page, 'curl -fsS http://192.168.50.10:8080/status.txt');
  await expect(output).toHaveText('ready');
});
