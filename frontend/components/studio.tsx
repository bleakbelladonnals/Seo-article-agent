'use client';

import { AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, Code2, FileSearch, Play, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { agentTemplates, products } from '../lib/workspace-data';
import type { ContentBrief, Product, View, WorkspaceState } from '../lib/content-ops-types';
import { PageHeading, ProductVisual, VisualPreview } from './shared';

const marketOptions: { value: ContentBrief['market']; label: string }[] = [
  { value: 'global', label: '全球 B2B OEM' },
  { value: 'north-america', label: '北美市场' },
  { value: 'europe', label: '欧洲市场' },
];

export function Studio({ state, selected, onSelect, updateBrief, start, navigate }: {
  state: WorkspaceState;
  selected: Product;
  onSelect: (product: Product) => void;
  updateBrief: (patch: Partial<ContentBrief>) => void;
  start: () => void;
  navigate: (view: View) => void;
}) {
  const run = state.run?.brief.productId === selected.id ? state.run : null;
  const stages = run?.stages || agentTemplates;
  const active = Boolean(run && !['idle', 'needs_review', 'approved', 'failed'].includes(run.status));
  const complete = run?.status === 'needs_review' || run?.status === 'approved';
  const runnable = selected.workflowAvailable;
  const verifiedCount = selected.specs.filter(spec => spec.verified).length;

  return <>
    <PageHeading
      eyebrow="内容生产"
      title="创建内容任务"
      description="用受控产品知识、Prompt 契约和分层模型策略执行可追溯内容生产。"
      action={complete ? <button className="primary-action" onClick={() => navigate(run?.status === 'approved' ? 'assets' : 'review')}><ShieldCheck size={17} />{run?.status === 'approved' ? '查看 V2 资产' : '进入审核中心'}</button> : undefined}
    />
    <div className="studio-layout">
      <aside className="brief-panel panel">
        <div className="form-head"><span className="step-tag">01</span><div><h2>任务 Brief</h2><p>选择已批准的业务字段与交付内容。</p></div></div>
        <label>选择产品<select value={selected.id} onChange={event => { const product = products.find(item => item.id === event.target.value) || products[0]; onSelect(product); updateBrief({ productId: product.id, keyword: product.keywords[0]?.keyword || '' }); }}>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.status}</option>)}</select></label>
        <label>内容类型<input value="B2B SEO 采购指南" readOnly aria-readonly="true" /></label>
        <label>目标关键词<select aria-label="目标关键词" value={state.brief.keyword} onChange={event => updateBrief({ keyword: event.target.value })} disabled={!selected.keywords.length}>{selected.keywords.map(keyword => <option key={keyword.keyword} value={keyword.keyword}>{keyword.keyword}</option>)}</select></label>
        <div className="field-pair"><label>目标市场<select value={state.brief.market} onChange={event => updateBrief({ market: event.target.value as ContentBrief['market'] })}>{marketOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>文章语言<input value="英语" readOnly aria-readonly="true" /></label></div>
        <label>目标读者<select value={state.brief.audience} onChange={event => updateBrief({ audience: event.target.value })}><option value="海外灯具品牌与采购经理">海外灯具品牌与采购经理</option><option value="灯具产品经理与供应链团队">灯具产品经理与供应链团队</option><option value="OEM 项目采购与质量负责人">OEM 项目采购与质量负责人</option></select></label>
        <div className="deliverables"><span>交付内容</span><label><input type="checkbox" checked={state.brief.deliverables.article} disabled /> SEO 长篇文章</label><label><input type="checkbox" checked={state.brief.deliverables.heroVisual} onChange={event => updateBrief({ deliverables: { ...state.brief.deliverables, heroVisual: event.target.checked } })} /> 产品视觉与信息图</label><label><input type="checkbox" checked={state.brief.deliverables.faq} onChange={event => updateBrief({ deliverables: { ...state.brief.deliverables, faq: event.target.checked } })} /> 常见问题</label></div>
        {!runnable && <div className="product-blocker" role="note"><AlertTriangle size={16} /><span><strong>无法创建任务</strong>{selected.workflowNote}</span></div>}
        <div className="form-actions"><button className="primary-action full" onClick={start} disabled={!runnable || active}>{run ? <RefreshCw size={16} /> : <Play size={16} />}{active ? '运行中…' : run ? '重新运行' : '创建任务'}</button></div>
      </aside>
      <section className="agent-canvas panel">
        <div className="panel-heading"><div><span className="section-kicker">工作流编排</span><h2>5-Agent 协作流程</h2></div><span className={`run-state ${complete ? 'complete' : active ? 'running' : run?.status === 'failed' ? 'failed' : ''}`}>{run?.status === 'approved' ? '已批准' : complete ? '等待人工审核' : active ? '运行中' : run?.status === 'failed' ? '运行失败' : '尚未开始'}</span></div>
        <div className="context-strip"><ProductVisual product={selected} /><div><strong>{selected.name}</strong><span>{selected.documents.length} 个知识来源 · {verifiedCount} 个已批准字段</span>{run && <small>任务 {run.id}</small>}</div><div><small>内容目标</small><strong>{runnable ? state.brief.keyword : selected.status}</strong></div></div>
        <div className="routing-strip"><Route size={16} /><div><b>模型路由策略</b><span>Qwen-Plus 负责抽取/规划 · DeepSeek 负责长文 · GPT-4.1 负责高风险审核</span></div><em>150 题业务评测</em></div>
        <div className="agent-timeline" aria-live="polite">{stages.map((agent, index) => <div className={`agent-step ${agent.status}`} key={agent.id}><div className="agent-node">{agent.status === 'completed' ? <Check size={17} /> : agent.status === 'running' ? <Bot size={17} /> : agent.status === 'failed' ? <AlertTriangle size={17} /> : index + 1}</div><div className="agent-main"><div><strong>{agent.name}</strong><span>{agent.role} · {agent.promptVersion}</span></div><p>{agent.status === 'waiting' ? '等待上游结果' : agent.status === 'failed' ? '当前步骤未完成' : agent.summary}</p>{agent.status !== 'waiting' && <small><FileSearch size={12} />{agent.evidence}</small>}<details className="agent-contract"><summary><Code2 size={12} />查看输入与输出契约</summary><div><span>输入</span><p>{agent.inputSummary}</p><span>输出 Schema</span><p>{agent.outputSchema} · {agent.schemaVersion}</p><span>模型策略</span><p>{agent.modelRoute}</p></div></details></div><span className="agent-duration">{agent.status === 'completed' ? agent.durationLabel : agent.status === 'running' ? '运行中' : agent.status === 'failed' ? '失败' : '—'}</span></div>)}</div>
        {!run && <div className="start-placeholder"><Bot size={24} /><strong>{runnable ? '等待任务启动' : '产品资料未就绪'}</strong><span>{runnable ? '工作流仅展示任务状态、输入证据和结构化输出契约，不展示内部推理过程。' : selected.workflowNote}</span></div>}
        {run?.status === 'failed' && <div className="error-state" role="alert"><AlertTriangle size={22} /><div><strong>内容任务没有完成</strong><span>{run.error}</span></div><button className="primary-action" onClick={start}><RefreshCw size={15} />重新运行</button></div>}
        {complete && <>
          <div className="output-ready"><CheckCircle2 size={19} /><div><strong>内容包已生成，发现 {run!.findings.length} 项需要判断的问题</strong><span>长篇文章 · {run!.article.sections.length} 个内容模块 · {run!.visualAssets.length} 项视觉资产</span></div><button onClick={() => navigate(run?.status === 'approved' ? 'assets' : 'review')}>{run?.status === 'approved' ? '查看资产' : '开始审核'} <ArrowRight size={15} /></button></div>
          {run!.visualAssets.length > 0 && <div className="visual-output"><div className="panel-heading"><div><span className="section-kicker">关联视觉资产</span><h3>内容包预览</h3></div><span className="record-label">{run!.lineage.knowledgeVersion}</span></div><div className="visual-grid">{run!.visualAssets.map(asset => <VisualPreview key={asset.id} asset={asset} compact />)}</div></div>}
        </>}
      </section>
    </div>
  </>;
}
