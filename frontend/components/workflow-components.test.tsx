import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Assets } from './assets';
import { Knowledge } from './knowledge';
import { Studio } from './studio';
import { createInitialRun, createInitialState } from '../lib/content-ops-state';
import { products, seedAssets } from '../lib/demo-data';

const noop = () => undefined;

describe('workflow-facing components', () => {
  it('keeps non-PHK products browsable but prevents generation', () => {
    const state = { ...createInitialState(), selectedProductId: 'ch-08', hydrated: true };
    render(<Studio state={state} selected={products[2]} onSelect={noop} updateBrief={noop} start={noop} switchToDemo={noop} navigate={noop} />);

    expect(screen.getByText('表面耐久字段仍待质量团队确认，暂不可进入内容生产。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始生成' })).toBeDisabled();
    expect(screen.getByText('1 个知识来源 · 2 个已验证字段')).toBeInTheDocument();
  });

  it('shows traceable source excerpts in an accessible drawer', () => {
    render(<Knowledge selected={products[0]} sourceDetailId="source-phk-master" setSelected={noop} openSource={noop} navigate={noop} />);

    expect(screen.getByRole('dialog', { name: 'PHK-01_Product_Master_v4.xlsx' })).toBeInTheDocument();
    expect(screen.getByText(/stamped steel with approved antique-brass/)).toBeInTheDocument();
    expect(screen.getByText(/不代表真实企业文件/)).toBeInTheDocument();
  });

  it('renders deterministic failure, retry and Live-to-Demo fallback controls', async () => {
    const retry = vi.fn();
    const switchToDemo = vi.fn();
    const run = createInitialRun('live');
    run.status = 'failed';
    run.error = '模型网关暂时不可用';
    const state = { ...createInitialState(), mode: 'live' as const, liveStatus: 'unavailable' as const, liveMessage: '无法连接本地服务', run, hydrated: true };
    render(<Studio state={state} selected={products[0]} onSelect={noop} updateBrief={noop} start={retry} switchToDemo={switchToDemo} navigate={noop} />);

    await userEvent.click(screen.getAllByRole('button', { name: /切换到 Demo/ })[0]);
    await userEvent.click(screen.getByRole('button', { name: /重试正常流程/ }));

    expect(switchToDemo).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText('模型网关暂时不可用')).toBeInTheDocument();
  });

  it('shows the real V1–V3 history for a selected seed asset', async () => {
    render(<Assets assets={seedAssets} navigate={noop} exportAsset={vi.fn()} notify={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /How to Specify Custom Ceiling Canopy/ }));

    expect(screen.getByRole('dialog', { name: 'How to Specify Custom Ceiling Canopy Assemblies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V3 当前版本/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V2 历史版本/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /V1 历史版本/ })).toBeInTheDocument();
  });
});
