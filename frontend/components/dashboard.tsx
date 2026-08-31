'use client';

import { ArrowUpRight, CircleCheck, FilePlus2, FileText, FlaskConical, ShieldCheck, TimerReset } from 'lucide-react';
import { agentTemplates, findings, operationsSnapshot, products } from '../lib/workspace-data';
import { getAssetVersion } from '../lib/export-utils';
import { unresolvedFindings } from '../lib/content-ops-state';
import type { View, WorkflowStatus, WorkspaceState } from '../lib/content-ops-types';
import { PageHeading, ProductVisual } from './shared';

const progressByStatus: Record<WorkflowStatus, number> = { idle: 0, queued: 5, analyzing: 18, strategizing: 36, writing: 58, visualizing: 74, reviewing: 90, needs_review: 100, approved: 100, failed: 58 };
const statusCopy: Record<WorkflowStatus, string> = {
  idle: '等待任务启动', queued: '任务已排队', analyzing: '正在解析产品、BOM 与范围', strategizing: '正在制定 B2B SEO 策略', writing: '正在生成英文采购指南', visualizing: '正在准备视觉资产', reviewing: '正在执行四维审核', needs_review: '内容包等待人工审核', approved: 'V2 已批准并保存', failed: '任务失败，等待重试',
};

export function Dashboard({ state, navigate }: { state: WorkspaceState; navigate: (view: View) => void }) {
  const run = state.run;
  const openFindings = run ? unresolvedFindings(run) : findings;
  const metrics = [
    { label: '本月正式交付', value: '126', delta: '较基准期 +75%', icon: FileText },
    { label: '待审核事项', value: String(openFindings.length), delta: '需要人工处理', icon: CircleCheck },
    { label: '关键风险', value: String(openFindings.filter(item => item.severity === 'critical').length), delta: '处理后方可批准', icon: ShieldCheck },
    { label: '一次审核通过率', value: '85%', delta: '最近 100 篇内容', icon: CircleCheck },
  ];
  const stages = run?.stages || agentTemplates;
  const status = run?.status || 'idle';
  const progress = progressByStatus[status];

  return <>
    <PageHeading eyebrow="WORKBENCH" title="内容运营工作台" description="统一管理产品知识、内容任务、质量审核与版本资产。" action={<button className="primary-action" onClick={() => navigate('studio')}><FilePlus2 size={17} />新建内容任务</button>} />
    <div className="metric-grid">{metrics.map(({ label, value, delta, icon: Icon }) => <article className="metric-card" key={label}><div className="metric-icon"><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{delta}</small></article>)}</div>
    <div className="main-grid">
      <article className="panel active-task">
        <div className="panel-heading"><div><span className="section-kicker">进行中的任务</span><h2>PHK-01 吊灯五金套件内容生产</h2></div><button className="text-action" onClick={() => navigate(status === 'needs_review' ? 'review' : status === 'approved' ? 'assets' : 'studio')}>查看任务 <ArrowUpRight size={15} /></button></div>
        <div className="task-summary"><ProductVisual product={products[0]} /><div><strong>Aurelia PHK-01</strong><span>全球 B2B OEM · 英文采购指南 · 非电气五金</span></div><div className="progress-copy"><strong>{progress}%</strong><span>{statusCopy[status]}</span></div></div>
        <div className="task-progress" aria-label={`工作流进度 ${progress}%`}><i style={{ width: `${progress}%` }} /></div>
        <div className="workflow-list">{stages.map((item, index) => <div className={`workflow-row ${item.status}`} key={item.id}><div className="step-node">{item.status === 'completed' ? <CircleCheck size={16} /> : index + 1}</div><div><strong>{item.name}</strong><span>{item.role} · {item.promptVersion}</span></div><span className="state-label">{item.status === 'completed' ? '已完成' : item.status === 'running' ? '运行中' : item.status === 'failed' ? '失败' : '等待中'}</span></div>)}</div>
      </article>
      <article className="panel attention-panel">
        <div className="panel-heading"><div><span className="section-kicker amber">审批门禁</span><h2>待你判断</h2></div><span className="count-badge">{openFindings.length}</span></div>
        {openFindings.slice(0, 4).map(finding => <button className="review-item" key={finding.id} onClick={() => navigate('review')}><span className={`review-icon ${finding.type}`}>{finding.type === 'geo' ? 'G' : finding.severity === 'critical' ? '!' : '•'}</span><span><strong>{finding.title}</strong><small>{finding.detail}</small></span><ArrowUpRight size={16} /></button>)}
        {!openFindings.length && <div className="all-clear"><CircleCheck size={24} /><strong>当前任务已处理完成</strong><span>V2 已进入内容资产库。</span></div>}
      </article>
    </div>
    <div className="bottom-grid evidence-overview">
      <article className="panel history-highlight"><div className="panel-heading"><div><span className="section-kicker">近 90 天运营表现</span><h2>效率与质量趋势</h2></div><span className="period">2026.06–08</span></div><div className="history-kpis"><div><TimerReset size={17} /><strong>30 min</strong><span>初稿中位耗时 · ↓80%</span></div><div><FileText size={17} /><strong>126 / 月</strong><span>正式内容交付 · ↑75%</span></div><div><ShieldCheck size={17} /><strong>85%</strong><span>一次审核通过率 · +21pp</span></div><div><CircleCheck size={17} /><strong>95.5%</strong><span>关键事实来源可追溯</span></div></div></article>
      <article className="panel model-highlight"><div className="panel-heading"><div><span className="section-kicker">模型治理</span><h2>模型运行策略</h2></div><FlaskConical size={19} /></div><div className="model-list">{operationsSnapshot.modelEvaluations.map(item => <div key={item.id}><span>{item.model}<small>{item.routingRole}</small></span><strong>{item.score.toFixed(1)}</strong></div>)}</div><p>150 题业务评测 · 事实、结构化输出、检索、语言、时延、成本与稳定性综合评分</p></article>
    </div>
    <article className="panel activity-panel dashboard-assets"><div className="panel-heading"><div><span className="section-kicker">最近产出</span><h2>内容资产</h2></div><button className="text-action" onClick={() => navigate('assets')}>查看资产库</button></div>{state.assets.slice(0, 3).map(asset => { const version = getAssetVersion(asset); return <button className="asset-row" key={asset.id} onClick={() => navigate(asset.status === '审核中' ? 'review' : 'assets')}><div className="asset-file"><FileText size={17} /></div><div><strong>{asset.title}</strong><span>{asset.product} · {version.label}</span></div><span className={`asset-state ${asset.status === '审核中' ? 'pending' : ''}`}>{asset.status}</span><strong className="asset-score">{version.scores.geo}</strong></button>; })}</article>
  </>;
}
