import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('completes the PHK-01 knowledge-to-V2 flow and persists all three exports', async ({ page }) => {
  await page.getByRole('button', { name: '产品知识', exact: true }).click();
  await expect(page.getByRole('heading', { name: '产品与知识来源' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /套件 BOM/ })).toBeVisible();
  await expect(page.getByText('灯头与电线', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /PHK-01_Assembly_BOM_v3/ }).click();
  const bomDialog = page.getByRole('dialog', { name: 'PHK-01_Assembly_BOM_v3.pdf' });
  await expect(bomDialog).toContainText('Electrical components are not part of this BOM');
  await expect(bomDialog).toContainText('Leo Wang · 工艺工程');
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await page.getByRole('combobox', { name: '目标关键词' }).selectOption('custom pendant light hardware kit supplier');
  await page.getByLabel('目标市场').selectOption('europe');
  await page.getByRole('button', { name: '重新运行', exact: true }).click();
  await expect(page.getByRole('button', { name: '进入审核中心' })).toBeVisible();
  await expect(page.getByText('product-parser@2.3')).toBeVisible();
  await page.locator('.agent-contract').first().getByText('查看输入与输出契约').click();
  await expect(page.locator('.agent-contract').first()).toContainText('ProductEvidenceBundle');
  await page.getByRole('button', { name: '进入审核中心' }).click();

  await expect(page.getByRole('heading', { name: '内容审核工作台' })).toBeVisible();
  await expect(page.locator('.article-panel h1')).toContainText('Custom Pendant Light Hardware Kit Supplier');
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
  const phkRow = page.locator('.library-row').filter({ hasText: 'Aurelia PHK-01' });
  await expect(phkRow).toContainText('V2');
  await expect(phkRow).toContainText('86');
  await phkRow.click();
  const drawer = page.getByRole('dialog', { name: /Custom Pendant Light Hardware Kit Supplier/ });
  await expect(drawer).toContainText('PKG-PHK-01@4.0');
  await expect(drawer).toContainText('product-parser@2.3');
  await expect(drawer).toContainText(/LFC-20260831/);

  for (const [label, fileName] of [['Markdown', 'phk-01-v2.md'], ['HTML', 'phk-01-v2.html'], ['JSON', 'phk-01-v2.json']] as const) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect((await download).suggestedFilename()).toBe(fileName);
  }

  await page.getByRole('button', { name: '关闭详情' }).click();
  await page.reload();
  await page.getByRole('button', { name: '内容资产', exact: true }).click();
  await expect(page.locator('.library-row').filter({ hasText: 'Aurelia PHK-01' })).toContainText('V2');
});

test('blocks non-ready products and lists the exact knowledge gaps', async ({ page }) => {
  await page.getByRole('button', { name: '产品知识', exact: true }).click();
  await page.locator('.product-card').filter({ hasText: 'Linea CH-08' }).click();
  await expect(page.getByRole('button', { name: '创建内容任务' })).toBeDisabled();
  await expect(page.getByText('BOM 尚未批准')).toBeVisible();
  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await expect(page.getByRole('button', { name: '创建任务', exact: true })).toBeDisabled();
  await expect(page.getByText('表面耐久字段仍待质量团队确认，暂不可进入内容生产。').first()).toBeVisible();
});

test('backs up, clears and restores the workspace without overwriting on invalid input', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await page.getByRole('combobox', { name: '目标关键词' }).selectOption('non electrical pendant hardware OEM');
  await page.getByRole('button', { name: '重新运行', exact: true }).click();
  await expect(page.getByRole('button', { name: '进入审核中心' })).toBeVisible();

  await page.getByRole('button', { name: '工作区设置', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /导出工作区备份/ }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('lumaflow-workspace-v5.json');
  await download.saveAs(backupPath);

  await page.getByRole('button', { name: '清除工作区', exact: true }).click();
  await expect(page.getByText('确认清除全部本地工作数据？')).toBeVisible();
  await page.getByRole('button', { name: '确认清除' }).click();
  await expect(page.getByRole('heading', { name: '内容运营工作台' })).toBeVisible();

  await page.getByRole('button', { name: '工作区设置', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await expect(page.getByText(/工作区已恢复/)).toBeVisible();
  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '目标关键词' })).toHaveValue('non electrical pendant hardware OEM');
  await expect(page.getByText(/LFC-20260831/).first()).toBeVisible();

  await page.getByRole('button', { name: '工作区设置', exact: true }).click();
  const invalidPath = testInfo.outputPath('invalid.json');
  await import('node:fs/promises').then(fs => fs.writeFile(invalidPath, '{invalid'));
  await page.locator('input[type="file"]').setInputFiles(invalidPath);
  await expect(page.getByText(/无法解析备份文件/)).toBeVisible();
  await page.getByRole('button', { name: '关闭详情' }).click();
  await page.getByRole('button', { name: '内容生产', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '目标关键词' })).toHaveValue('non electrical pendant hardware OEM');
});

test('migrates a v4 workspace and preserves the current business case', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(['lumaflow', 'demo', 'v4'].join('-'), JSON.stringify({ schemaVersion: 4, selectedProductId: 'phk-01', brief: { productId: 'phk-01', contentType: 'sourcing-guide', keyword: 'antique brass pendant light hardware kit manufacturer', market: 'global', language: 'en', audience: '海外灯具品牌与采购经理', deliverables: { article: true, heroVisual: true, faq: true } }, assets: [] }));
  });
  await page.reload();
  await expect(page.getByText('Aurelia PHK-01', { exact: true }).first()).toBeVisible();
  await expect(page.evaluate(() => JSON.parse(localStorage.getItem('lumaflow-workspace-v5') || '{}').schemaVersion)).resolves.toBe(5);
});

test('keeps 390px navigation, settings and keyboard focus accessible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile viewport check');
  for (const label of ['工作台', '产品知识', '内容生产', '审核中心', '内容资产', '工作区设置']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBeLessThanOrEqual(390);
});
