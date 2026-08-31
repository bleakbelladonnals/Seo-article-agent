'use client';

import { useMemo, useState } from 'react';
import { Archive, ArrowUpRight, Download, FileImage, FileSearch, FileText, History, ShieldCheck, Sparkles } from 'lucide-react';
import { getAssetVersion, triggerDownload } from '../lib/export-utils';
import type { ContentAsset, ExportFormat, ExportResult, View } from '../lib/content-ops-types';
import { Drawer, PageHeading, VisualPreview } from './shared';

function assetStatusClass(status: ContentAsset['status']) {
  return status === '已通过' ? 'approved' : status === '审核中' ? 'in-review' : 'draft';
}

export function Assets({ assets, navigate, exportAsset, notify }: {
  assets: ContentAsset[];
  navigate: (view: View) => void;
  exportAsset: (assetId: string, versionId: string, format: ExportFormat) => Promise<ExportResult>;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'全部' | ContentAsset['status']>('全部');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const visible = assets.filter(asset => (status === '全部' || asset.status === status) && `${asset.title} ${asset.product} ${asset.typeLabel}`.toLowerCase().includes(query.toLowerCase()));
  const selected = assets.find(asset => asset.id === selectedAssetId) || null;
  const version = selected ? getAssetVersion(selected, selectedVersionId || selected.currentVersionId) : null;
  const averages = useMemo(() => {
    const versions = assets.map(asset => getAssetVersion(asset));
    return {
      quality: versions.reduce((sum, item) => sum + item.scores.quality, 0) / versions.length,
      geo: versions.reduce((sum, item) => sum + item.scores.geo, 0) / versions.length,
    };
  }, [assets]);

  const openAsset = (asset: ContentAsset) => {
    setSelectedAssetId(asset.id);
    setSelectedVersionId(asset.currentVersionId);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!selected || !version) return;
    try {
      const result = await exportAsset(selected.id, version.id, format);
      triggerDownload(result);
      notify(`${version.label} 已导出为 ${format.toUpperCase()}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '导出失败');
    }
  };

  return <>
    <PageHeading eyebrow="内容资产库" title="内容资产" description="统一管理文章、模拟视觉、来源快照、人工决定与不可变版本。" action={<button className="primary-action" onClick={() => navigate('studio')}><Sparkles size={16} />创建内容任务</button>} />
    <div className="asset-overview"><div><strong>{assets.length}</strong><span>全部资产</span></div><div><strong>{assets.filter(asset => asset.status === '已通过').length}</strong><span>已通过</span></div><div><strong>{assets.filter(asset => asset.status === '审核中').length}</strong><span>审核中</span></div><div><strong>{averages.geo.toFixed(1)}</strong><span>平均 GEO · 内部标尺</span></div></div>
    <article className="panel asset-library">
      <div className="library-tools"><div className="compact-search"><FileSearch size={15} /><input aria-label="搜索内容资产" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、产品或类型" /></div><div className="status-filters" aria-label="资产状态筛选">{(['全部', '已通过', '审核中', '草稿'] as const).map(filter => <button className={status === filter ? 'active' : ''} key={filter} onClick={() => setStatus(filter)}>{filter}</button>)}</div></div>
      <div className="asset-table-head"><span>资产</span><span>状态</span><span>质量 / GEO</span><span>版本</span><span>更新</span><span /></div>
      {visible.map(asset => { const current = getAssetVersion(asset); return <button className="library-row" key={asset.id} onClick={() => openAsset(asset)}><div className="library-asset"><div className="asset-thumb" style={{ '--accent': asset.color } as React.CSSProperties}>{asset.type === 'visual' ? <FileImage size={20} /> : <FileText size={20} />}</div><div><strong>{asset.title}</strong><span>{asset.product} · {asset.typeLabel}</span></div></div><span className={`library-status ${assetStatusClass(asset.status)}`}>{asset.status}</span><span className="dual-score"><b>{current.scores.quality}</b><i /><b>{current.scores.geo}</b></span><strong>{current.label}</strong><span>{asset.updatedAt}</span><ArrowUpRight size={16} /></button>; })}
      {!visible.length && <div className="empty-state"><Archive size={28} /><strong>没有匹配的资产</strong><span>调整搜索词或状态筛选。</span></div>}
    </article>
    {selected && version && <Drawer title={selected.title} label="资产详情" onClose={() => setSelectedAssetId(null)}>
      <p>{selected.product} · {selected.typeLabel} · {selected.status}</p>
      {version.visualAssets.length ? <VisualPreview asset={version.visualAssets[0]} /> : <div className="drawer-preview"><FileText size={26} /><strong>{version.label}</strong><span>{selected.status}</span></div>}
      <div className="drawer-grid"><div><span>质量分</span><strong>{version.scores.quality}</strong></div><div><span>GEO 分</span><strong>{version.scores.geo}</strong></div><div><span>负责人</span><strong>{selected.owner}</strong></div><div><span>更新日期</span><strong>{version.createdAt}</strong></div></div>
      <h3><History size={15} />版本记录</h3>
      <div className="version-list">{[...selected.versions].reverse().map(item => <button key={item.id} className={`version-item ${item.id === version.id ? 'current' : ''}`} onClick={() => setSelectedVersionId(item.id)}><b>{item.label}</b><div><strong>{item.id === selected.currentVersionId ? '当前版本' : '历史版本'}</strong><span>{item.createdAt} · {item.provenance.mode === 'demo' ? '确定性演示' : 'Live Lab'}</span></div></button>)}</div>
      {version.visualAssets.length > 1 && <><h3><FileImage size={15} />关联模拟视觉</h3><div className="drawer-visual-grid">{version.visualAssets.map(asset => <VisualPreview key={asset.id} asset={asset} compact />)}</div></>}
      <h3><ShieldCheck size={15} />来源与审查血缘</h3>
      <div className="lineage-summary"><span>{version.sources.length} 个来源快照</span><span>{version.findings.length} 条审查发现</span><span>{version.decisions.length} 个人工决定</span></div>
      <div className="lineage-detail"><div><span>知识版本</span><strong>{version.lineage.knowledgeVersion}</strong></div><div><span>BOM / 色板</span><strong>{version.lineage.bomVersion} · {version.lineage.finishSample}</strong></div><div><span>Prompt 快照</span><strong>{version.lineage.promptContracts.map(item => item.promptVersion).join(' · ')}</strong></div><div><span>模型路由</span><strong>{version.lineage.modelRoutes.join(' · ')}</strong></div></div>
      <p className="provenance-note">{version.provenance.disclosure}</p>
      <h3><Download size={15} />导出当前版本</h3>
      <div className="export-actions">{version.article && <button onClick={() => handleExport('markdown')}>Markdown</button>}{version.article && <button onClick={() => handleExport('html')}>HTML</button>}<button onClick={() => handleExport('json')}>JSON</button></div>
    </Drawer>}
  </>;
}
