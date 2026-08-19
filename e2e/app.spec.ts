import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const consoleErrors = new WeakMap<import('@playwright/test').Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto('/#/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '把时间记清楚' })).toBeVisible({ timeout: 10000 });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

async function addEntry(page: import('@playwright/test').Page, title: string, minutes = '45') {
  await page.getByRole('button', { name: '补录时间' }).first().click();
  await page.getByLabel('做了什么').fill(title);
  await page.getByLabel('净时长（分钟）').fill(minutes);
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('.entry-row').filter({ hasText: title })).toBeVisible();
}

test('first use, manual entry and IndexedDB reload', async ({ page }) => {
  await expect(page.getByText('还没有时间记录')).toBeVisible();
  await addEntry(page, '整理压剪试验数据');
  await page.reload();
  await expect(page.locator('.entry-row').filter({ hasText: '整理压剪试验数据' })).toBeVisible();
  await expect(page.getByLabel('今日汇总')).toContainText('45m');
});

test('many activity names never create shortcut chips or horizontal overflow', async ({ page }) => {
  for (const title of ['与大学同学相会', '西安旅游', '小说', '飞机', '实验数据整理', '论文写作']) {
    await addEntry(page, title, '5');
  }

  await expect(page.getByRole('group', { name: '最近活动' })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);
});

test('timer persists, pauses, resumes and completes', async ({ page }) => {
  await page.getByLabel('正在做什么').fill('VUMAT 调试');
  await page.getByRole('button', { name: '开始计时' }).click();
  await expect(page.getByText('正在计时')).toBeVisible();
  await page.waitForTimeout(1100);
  await page.reload();
  await expect(page.getByText('VUMAT 调试', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '暂停' }).click();
  await expect(page.getByText('计时已暂停')).toBeVisible();
  await page.getByRole('button', { name: '继续' }).click();
  await page.getByRole('button', { name: '完成记录' }).click();
  await expect(page.locator('.entry-row').filter({ hasText: 'VUMAT 调试' })).toBeVisible();
});

test('mini timer follows the user across record and statistics tabs', async ({ page }) => {
  await page.getByLabel('正在做什么').fill('机器学习本构训练');
  await page.getByRole('button', { name: '开始计时' }).click();
  await page.getByRole('link', { name: '记录' }).click();
  await expect(page.getByLabel('进行中的计时')).toContainText('机器学习本构训练');
  await page.getByRole('link', { name: '统计' }).click();
  await page.getByLabel('进行中的计时').getByRole('button', { name: '完成记录' }).click();
  await expect(page.getByLabel('进行中的计时')).toHaveCount(0);
});

test('edit, copy, soft delete and ten-second undo', async ({ page }) => {
  await addEntry(page, '原始实验记录', '30');
  const row = page.locator('.entry-row').filter({ hasText: '原始实验记录' });
  await row.getByRole('button', { name: /更多操作/ }).click();
  await row.getByRole('button', { name: '编辑' }).click();
  await page.getByLabel('做了什么').fill('修订后的实验记录');
  await page.getByRole('button', { name: '保存记录' }).click();
  const edited = page.locator('.entry-row').filter({ hasText: '修订后的实验记录' });
  await edited.getByRole('button', { name: /更多操作/ }).click();
  await edited.getByRole('button', { name: '复制' }).click();
  await expect(page.locator('.entry-row').filter({ hasText: '修订后的实验记录' })).toHaveCount(2);
  await edited
    .first()
    .getByRole('button', { name: /更多操作/ })
    .click();
  await edited.first().getByRole('button', { name: '删除' }).click();
  await expect(page.getByRole('status')).toContainText('已删除');
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.locator('.entry-row').filter({ hasText: '修订后的实验记录' })).toHaveCount(2);
});

test('statistics switch between day and week', async ({ page }) => {
  await addEntry(page, '论文写作', '120');
  await page.getByRole('link', { name: '统计' }).click();
  await expect(page.getByRole('heading', { name: '时间统计' })).toBeVisible();
  await expect(page.locator('.stats-hero')).toContainText('2h');
  await page.getByRole('tab', { name: '今日' }).click();
  await expect(page.locator('.category-stats')).toContainText('主要工作');
  await page.getByRole('tab', { name: '本周' }).click();
  await page.getByRole('button', { name: '上一周期' }).click();
  await expect(page.locator('.trend-chart > div')).toHaveCount(7);
  await expect(page.getByRole('tab', { name: '本月' })).toHaveCount(0);
});

test('JSON export and atomic import restore the ledger', async ({ page }) => {
  await addEntry(page, '待备份记录', '20');
  await page.getByRole('button', { name: '打开设置' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 备份' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^shiheng-v2-.*\.json$/);
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByRole('status')).toContainText('备份已导入');
});

test('Android back closes the active sheet before leaving the page', async ({ page }) => {
  await page.getByRole('button', { name: '补录时间' }).first().click();
  await expect(page.getByRole('dialog', { name: '补录净时间' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '把时间记清楚' })).toBeVisible();
});

test('installed application shell reloads offline', async ({ page, context }) => {
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '把时间记清楚' })).toBeVisible();
  await context.setOffline(false);
});

test('mobile pages have no serious accessibility violations', async ({ page }) => {
  for (const tab of ['今日', '记录', '统计']) {
    await page.getByRole('link', { name: tab }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual(
      []
    );
  }
});

test('captures the candidate mobile layout', async ({ page }, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath(`today-${testInfo.project.name}.png`), fullPage: true });
});
