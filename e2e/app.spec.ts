import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.error(`pageerror: ${error.message}`));
  await page.goto('/#/today', { waitUntil: 'domcontentloaded' });
  const onboarding = page.getByRole('dialog', { name: /让时间成为/ });
  const heading = page.getByRole('heading', { name: '今日时间账本' });
  await Promise.race([onboarding.waitFor({ state: 'visible' }), heading.waitFor({ state: 'visible' })]);
  if (await onboarding.isVisible()) await page.getByRole('button', { name: '从空白项目开始' }).click();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('manual entry survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: '补录时间' }).click();
  await page.getByLabel('做了什么').fill('整理压剪试验数据');
  await page.getByLabel('净时长（分钟）').fill('45');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('整理压剪试验数据')).toBeVisible();
  await page.reload();
  await expect(page.getByText('整理压剪试验数据')).toBeVisible();
});

test('timer can start, pause and complete', async ({ page }) => {
  await page.getByLabel('当前活动').fill('VUMAT 调试');
  await page.getByRole('button', { name: '开始计时' }).click();
  await expect(page.getByText('正在计时')).toBeVisible();
  await page.getByRole('button', { name: '暂停' }).click();
  await expect(page.getByText('已暂停')).toBeVisible();
  await page.getByRole('button', { name: '完成并记录' }).click();
  await expect(page.getByText('VUMAT 调试')).toBeVisible();
});

test('an edited and deleted entry can be restored from a JSON backup', async ({ page }) => {
  await page.getByRole('button', { name: '补录时间' }).click();
  await page.getByLabel('做了什么').fill('原始实验记录');
  await page.getByLabel('净时长（分钟）').fill('30');
  await page.getByRole('button', { name: '保存记录' }).click();
  await page.getByRole('button', { name: '编辑记录' }).click();
  await page.getByLabel('做了什么').fill('修订后的实验记录');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('修订后的实验记录')).toBeVisible();

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  const backupPath = await (await downloadPromise).path();
  expect(backupPath).toBeTruthy();

  await page.goto('/#/today');
  await page.getByRole('button', { name: '移入回收站' }).click();
  await expect(page.getByText('修订后的实验记录')).toHaveCount(0);
  await page.goto('/#/settings');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByRole('status')).toContainText('备份导入成功');
  await page.goto('/#/today');
  await expect(page.getByText('修订后的实验记录')).toBeVisible();
});

test('plans and structured reviews survive reloads', async ({ page }) => {
  await page.goto('/#/review');
  await page.getByLabel('目标投入（小时）').fill('2');
  await page.getByLabel('计划说明').fill('完成一轮模型标定');
  await page.getByRole('button', { name: '保存计划' }).click();
  await expect(page.getByRole('article').getByText('完成一轮模型标定')).toBeVisible();

  await page.getByLabel('完成了什么').fill('完成数据清洗');
  await page.getByLabel('偏差与原因').fill('高应变率数据不足');
  await page.getByLabel('下一周期调整').fill('补充 Hopkinson 杆试验');
  await page.getByRole('button', { name: '保存复盘' }).click();
  await expect(page.getByRole('status')).toContainText('复盘已保存');
  await page.reload();
  await expect(page.getByLabel('完成了什么')).toHaveValue('完成数据清洗');
  await expect(page.getByLabel('下一周期调整')).toHaveValue('补充 Hopkinson 杆试验');
});

test('today page has no serious accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual(
    []
  );
});

test('all primary pages render and data can be exported', async ({ page }) => {
  for (const [path, heading] of [
    ['timeline', '时间轴'],
    ['insights', '时间洞察'],
    ['review', '计划与复盘'],
    ['settings', '设置']
  ]) {
    await page.goto(`/#/${path}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.getByPlaceholder('新项目名称').fill('机器学习本构');
  await page.getByRole('button', { name: '添加项目' }).click();
  await expect(page.locator('.management-list strong').filter({ hasText: '机器学习本构' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  expect((await download).suggestedFilename()).toMatch(/^shiheng-backup-.*\.json$/);
});

test('installed app shell reloads while offline', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '今日时间账本' })).toBeVisible();
  await context.setOffline(false);
});

test('captures the responsive today view', async ({ page }, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath(`today-${testInfo.project.name}.png`), fullPage: true });
});
