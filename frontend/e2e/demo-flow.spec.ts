import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('completes the PHK-01 knowledge-to-V2 flow and persists the approved version', async ({ page }) => {
  await page.getByRole('button', { name: '产品知识', exact: true }).click();
  await expect(page.getByRole('heading', { name: '产品与知识来源' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /套件 BOM/ })).toBeVisible();
  await expect(page.getByText('灯头与电线', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /PHK-01_Assembly_BOM_v3/ }).click();
  await expect(page.getByRole('dialog', { name: 'PHK-01_Assembly_BOM_v3.pdf' })).toContainText('Electrical components are not part of this BOM');
  await page.getByRole('button', { name: '关闭详情' }).click();
  await page.getByRole('button', { name: /Antique_Brass_Finish_AB-07/ }).click();
  await expect(page.getByRole('dialog', { name: 'Antique_Brass_Finish_AB-07.pdf' })).toContainText('does not change the base material into solid brass');
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await page.getByRole('button', { name: '快速回放', exact: true }).click();
  await expect(page.getByRole('heading', { name: '内容审核工作台' })).toBeVisible();

  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await expect(page.getByText('product-parser@2.3')).toBeVisible();
  await page.locator('.agent-contract').first().getByText('查看输入与输出契约').click();
  await expect(page.locator('.agent-contract').first()).toContainText('ProductEvidenceBundle');
  await page.getByRole('button', { name: '审核中心', exact: true }).click();

  const approve = page.getByRole('button', { name: '审核通过', exact: true });
  await expect(approve).toBeDisabled();
  await page.getByRole('button', { name: /接受修改/ }).click();
  await page.locator('.finding-card').filter({ hasText: '交付范围越过非电气边界' }).click();
  await page.getByRole('button', { name: /接受修改/ }).click();
  await expect(approve).toBeEnabled();
  await expect(page.locator('.score-pills')).toContainText('90');

  await page.getByRole('tab', { name: /^GEO/ }).click();
  await page.getByRole('button', { name: /接受修改/ }).click();
  await page.locator('.finding-card').filter({ hasText: '补充 BOM 来源标记' }).click();
  await page.getByRole('button', { name: /接受修改/ }).click();
  await expect(page.locator('.geo-ring strong')).toHaveText('86');

  await approve.click();
  await expect(page.getByText('V2 已进入内容资产库')).toBeVisible();
  await page.getByRole('button', { name: '查看资产', exact: true }).click();
  await expect(page.getByRole('heading', { name: '内容资产' })).toBeVisible();

  const phkRow = page.locator('.library-row').filter({ hasText: 'Antique Brass Pendant Light Hardware Kit Manufacturer' });
  await expect(phkRow).toContainText('V2');
  await expect(phkRow).toContainText('86');
  await phkRow.click();
  const drawer = page.getByRole('dialog', { name: /Antique Brass Pendant Light/ });
  await expect(drawer).toContainText('PKG-PHK-01@4.0');
  await expect(drawer).toContainText('product-parser@2.3');

  for (const [label, fileName] of [['Markdown', 'phk-01-v2.md'], ['HTML', 'phk-01-v2.html'], ['JSON', 'phk-01-v2.json']] as const) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect((await download).suggestedFilename()).toBe(fileName);
  }

  await page.getByRole('button', { name: '关闭详情' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '内容资产' })).toBeVisible();
  await expect(page.locator('.library-row').filter({ hasText: 'Antique Brass Pendant Light Hardware Kit Manufacturer' })).toContainText('V2');
});

test('keeps browse-only hardware products out of the fixed generation workflow', async ({ page }) => {
  await page.getByRole('button', { name: '产品知识', exact: true }).click();
  await page.locator('.product-card').filter({ hasText: 'Linea CH-08' }).click();
  await expect(page.getByRole('button', { name: '暂无演示工作流' })).toBeDisabled();
  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始生成', exact: true })).toBeDisabled();
  await expect(page.getByText('表面耐久字段仍待质量团队确认，暂不可进入内容生产。')).toBeVisible();
  await expect(page.locator('.context-strip')).toContainText('1 个知识来源 · 2 个已验证字段');
});

test('upgrades incompatible v3 browser state to the lighting-hardware case', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lumaflow-demo-v3', JSON.stringify({ schemaVersion: 3, selectedProductId: 'hb-200' }));
  });
  await page.reload();
  await expect(page.getByText(/案例已升级为灯饰五金 OEM/)).toBeVisible();
  await expect(page.getByText('Aurelia PHK-01', { exact: true }).first()).toBeVisible();
});

test('exposes named mobile navigation and reset controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only accessibility check');
  for (const label of ['工作台', '产品知识', '内容生产', '审核中心', '内容资产', '重置演示']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBeLessThanOrEqual(390);
});
