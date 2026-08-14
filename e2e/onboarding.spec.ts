import { expect, test } from '@playwright/test';

test('the optional research template is created only after confirmation', async ({ page }) => {
  await page.goto('/#/today');
  const dialog = page.getByRole('dialog', { name: '让时间成为可验证的研究数据' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '使用科研模板开始' }).click();
  await expect(page.getByRole('heading', { name: '今日时间账本' })).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.locator('.management-list strong').filter({ hasText: 'Ti6Al4V 实验' })).toBeVisible();
  await expect(page.locator('.management-list strong').filter({ hasText: 'VUMAT 工程实现' })).toBeVisible();
});
