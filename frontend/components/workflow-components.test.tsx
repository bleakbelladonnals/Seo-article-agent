import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Assets } from './assets';
import { Knowledge } from './knowledge';
import { WorkspaceSettings } from './shared';
import { Studio } from './studio';
import { createInitialState } from '../lib/content-ops-state';
import { products, seedAssets } from '../lib/workspace-data';

const noop = () => undefined;

describe('workflow-facing components', () => {
  it('keeps non-ready products browsable and prevents task creation', () => {
    const state = { ...createInitialState(), selectedProductId: 'ch-08', hydrated: true };
    render(<Studio state={state} selected={products[2]} onSelect={noop} updateBrief={noop} start={noop} navigate={noop} />);

    expect(screen.getAllByText('表面耐久字段仍待质量团队确认，暂不可进入内容生产。').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /重新运行|创建任务/ })).toBeDisabled();
    expect(screen.getByText('1 个知识来源 · 2 个已批准字段')).toBeInTheDocument();
  });

  it('shows source ownership, approval time and exact citation location', () => {
    render(<Knowledge selected={products[0]} sourceDetailId="source-phk-master" setSelected={noop} openSource={noop} navigate={noop} />);

    const dialog = screen.getByRole('dialog', { name: 'PHK-01_Product_Master_v4.xlsx' });
    expect(dialog).toHaveTextContent('Nina Zhou · 产品工程');
    expect(dialog).toHaveTextContent('2026-08-18');
    expect(dialog).toHaveTextContent('Material & delivery scope · Rows 18–31');
    expect(dialog).toHaveTextContent(/stamped steel with approved antique-brass/);
  });

  it('requires a second confirmation before clearing the workspace', async () => {
    const clear = vi.fn();
    render(<WorkspaceSettings onClose={noop} onExport={noop} onImport={noop} onClear={clear} lastRestoredAt="" />);
    await userEvent.click(screen.getByRole('button', { name: '清除工作区' }));
    expect(clear).not.toHaveBeenCalled();
    expect(screen.getByText('确认清除全部本地工作数据？')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '确认清除' }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it('shows the full V1–V3 history for a selected asset', async () => {
    render(<Assets assets={seedAssets} navigate={noop} exportAsset={vi.fn()} notify={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /How to Specify Custom Ceiling Canopy/ }));

    expect(screen.getByRole('dialog', { name: 'How to Specify Custom Ceiling Canopy Assemblies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V3 当前版本/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V2 历史版本/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V1 历史版本/ })).toBeInTheDocument();
  });
});
