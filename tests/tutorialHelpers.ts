import { expect, type Page } from '@playwright/test';

async function openApp(page: Page, name: string) {
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

export async function finishTutorial(page: Page, handle = 'nightowl') {
  await openApp(page, '메일');
  await page.getByLabel('메일 주소').fill(handle);
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
  const mailApp = page
    .getByRole('navigation', { name: '데스크톱 앱' })
    .getByRole('button', { name: /메일/ });
  await expect(mailApp.locator('.app-notification-badge')).toHaveText('1');
  await expect(
    page.getByRole('navigation', { name: '작업 표시줄' }).getByRole('button', { name: '메일' }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole('navigation', { name: '작업 표시줄' })
      .getByRole('button', { name: '메일' })
      .locator('small'),
  ).toHaveCount(0);
  await expect(page.getByRole('status', { name: '새 사건 메일 알림' })).toHaveCount(0);
  await mailApp.click();
  await expect(mailApp.locator('.app-notification-badge')).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: '메일 창', exact: true })
      .getByRole('heading', { name: '사라진 11분', exact: true }),
  ).toBeVisible();
}
