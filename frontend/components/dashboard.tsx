'use client';

import { ArrowUpRight, Box, CircleCheck, CircleGauge, FileText, FlaskConical, ShieldCheck, Sparkles, TimerReset } from 'lucide-react';
import { agentTemplates, evidenceSnapshot, findings, products } from '../lib/demo-data';
import { getAssetVersion } from '../lib/export-utils';
import { unresolvedFindings } from '../lib/content-ops-state';
import type { DemoState, View, WorkflowStatus } from '../lib/content-ops-types';
import { PageHeading, ProductVisual } from './shared';

const progressByStatus: Record<WorkflowStatus, number> = { idle: 0, queued: 5, analyzing: 18, strategizing: 36, writing: 58, visualizing: 74, reviewing: 90, needs_review: 100, approved: 100, failed: 58 };
const statusCopy: Record<WorkflowStatus, string> = {
  idle: '等待任务启动', queued: '任务已排队', analyzing: '正在解析产品、BOM 与范围', strategizing: '正在制定 B2B SEO 策略', writing: '正在生成英文采购指南', visualizing: '正在准备模拟视觉资产', reviewing: '正在执行四维审核', needs_review: '内容包等待人工审核', approved: 'V2 已批准并保存', failed: '任务失败，等待重试',
};

export function Dashboard({ state, navigate }: { state: DemoState; navigate: (view: View) => void }) {
  const run = state.run;
  const openFindings = run ? unresolvedFindings(run) : findings;
  const scores = state.assets.map(asset => getAssetVersion(asset));
  const avgQuality = scores.reduce((sum, version) => sum + version.scores.quality, 0) / scores.length;
  const metrics = [
    { label: '知识完整度', value: '97%', delta: '主数据 + BOM + 色板', icon: Box },
    { label: '待解决风险', value: String(openFindings.filter(item => item.severity === 'critical').length), delta: `${openFindings.length} 项人工判断`, icon: ShieldCheck },
    { label: '当前质量分', value: (run?.scores.quality ?? 82).toFixed(0), delta: `资产均值 ${avgQuality.toFixed(1)}`, icon: CircleCheck },
    { label: '当前 GEO', value: (run?.scores.geo ?? 76).toFixed(0), delta: 'LumaFlow 内部标尺', icon: CircleGauge },
  ];
  const stages = run?.stages || agentTemplates;
  const status = run?.status || 'idle';
  const progress = progressByStatus[status];

  return <>
    <PageHeading eyebrow="AI 内容运营工作台 · 固定面试案例" title="从五金知识到可交付内容" description="用一个可重复的吊灯五金 OEM 案例，展示 Agent 协作、治理门禁和资产沉淀。" action={<button className="primary-action" onClick={() => navigate(status === 'needs_review' ? 'review' : status === 'approved' ? 'assets' : 'studio')}><Sparkles size={17} />{status === 'needs_review' ? '继续审核' : status === 'approved' ? '查看 V2 资产' : '运行固定案例'}</button>} />
    <div className="metric-grid">{metrics.map(({ label, value, delta, icon: Icon }) => <article className="metric-card" key={label}><div className="metric-icon"><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{delta}</small></article>)}</div>
    <div className="main-grid">
      <article className="panel active-task">
        <div className="panel-heading"><div><span className="section-kicker">固定案例流程</span><h2>仿古黄铜吊灯五金套件内容任务</h2></div><button className="text-action" onClick={() => navigate(status === 'needs_review' ? 'review' : status === 'approved' ? 'assets' : 'studio')}>查看任务 <ArrowUpRight size={15} /></button></div>
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
      <article className="panel history-highlight"><div className="panel-heading"><div><span className="section-kicker">脱敏历史复盘</span><h2>效率与质量结果</h2></div><span className="period">非当前 Demo 实时数据</span></div><div className="history-kpis"><div><TimerReset size={17} /><strong>150 → 30 min</strong><span>初稿中位耗时 · ↓80%</span></div><div><FileText size={17} /><strong>72 → 126</strong><span>月均正式交付 · ↑75%</span></div><div><ShieldCheck size={17} /><strong>64% → 85%</strong><span>一次审核通过率</span></div><div><CircleCheck size={17} /><strong>191 / 200</strong><span>来源可追溯 · 95.5%</span></div></div></article>
      <article className="panel model-highlight"><div className="panel-heading"><div><span className="section-kicker">150 题评测快照</span><h2>分层模型路由</h2></div><FlaskConical size={19} /></div><div className="model-list">{evidenceSnapshot.modelEvaluations.map(item => <div key={item.id}><span>{item.model}<small>{item.routingRole}</small></span><strong>{item.score.toFixed(1)}</strong></div>)}</div><p>{evidenceSnapshot.evaluationSet}</p></article>
    </div>
    <details className="panel evidence-suite">
      <summary><span><b>项目证据台</b><small>展开查看 8 项指标口径、模型权重和三轮 UAT</small></span><ArrowUpRight size={17} /></summary>
      <div className="evidence-disclosure"><ShieldCheck size={16} /><span>{evidenceSnapshot.disclosure}</span></div>
      <div className="evidence-metric-grid">{evidenceSnapshot.metrics.map(metric => <article key={metric.id}><span>{metric.label}</span><div><b>{metric.before}</b><i>→</i><b>{metric.after}</b></div><strong>{metric.result}</strong><small>{metric.sample} · {metric.formula}</small></article>)}</div>
      <div className="evidence-lower"><div><h3>模型评测权重</h3><p>事实 30% · 结构化输出 20% · RAG/拒答 15% · 中英文 10% · 时延 10% · 成本 10% · 稳定性 5%</p></div><div><h3>三轮内部测试</h3>{evidenceSnapshot.uatRounds.map(round => <p key={round.id}><b>{round.round}</b> · {round.completed}/{round.total} · {round.focus} · {round.outcome}</p>)}</div></div>
    </details>
    <article className="panel activity-panel dashboard-assets"><div className="panel-heading"><div><span className="section-kicker">最近产出</span><h2>内容资产</h2></div><button className="text-action" onClick={() => navigate('assets')}>查看资产库</button></div>{state.assets.slice(0, 3).map(asset => { const version = getAssetVersion(asset); return <button className="asset-row" key={asset.id} onClick={() => navigate(asset.status === '审核中' ? 'review' : 'assets')}><div className="asset-file"><FileText size={17} /></div><div><strong>{asset.title}</strong><span>{asset.product} · {version.label}</span></div><span className={`asset-state ${asset.status === '审核中' ? 'pending' : ''}`}>{asset.status}</span><strong className="asset-score">{version.scores.geo}</strong></button>; })}</article>
  </>;
}
