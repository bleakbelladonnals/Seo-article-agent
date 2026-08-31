'use client';

import { AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, Code2, FileSearch, Play, RotateCcw, Route, ShieldCheck } from 'lucide-react';
import { agentTemplates, products } from '../lib/demo-data';
import type { ContentBrief, CreateRunOptions, DemoState, Product, View } from '../lib/content-ops-types';
import { PageHeading, ProductVisual, VisualPreview } from './shared';

export function Studio({ state, selected, onSelect, updateBrief, start, switchToDemo, navigate }: {
  state: DemoState;
  selected: Product;
  onSelect: (product: Product) => void;
  updateBrief: (patch: Partial<ContentBrief>) => void;
  start: (options?: CreateRunOptions) => void;
  switchToDemo: () => void;
  navigate: (view: View) => void;
}) {
  const run = state.run;
  const stages = run?.stages || agentTemplates;
  const active = Boolean(run && !['idle', 'needs_review', 'approved', 'failed'].includes(run.status));
  const complete = run?.status === 'needs_review' || run?.status === 'approved';
  const runnable = selected.workflowAvailable;
  const verifiedCount = selected.specs.filter(spec => spec.verified).length;

  return <>
    <PageHeading
      eyebrow="AI 内容生产"
      title="创建内容任务"
      description="用受控知识、Prompt 版本和分层模型路由驱动可追溯内容生产。"
      action={complete ? <button className="primary-action" onClick={() => navigate(run?.status === 'approved' ? 'assets' : 'review')}><ShieldCheck size={17} />{run?.status === 'approved' ? '查看 V2 资产' : '进入审核中心'}</button> : undefined}
    />
    {state.mode === 'live' && state.liveStatus !== 'available' && <div className="service-alert" role="alert"><AlertTriangle size={19} /><div><strong>Live Lab 当前不可用</strong><span>{state.liveMessage}</span></div><button className="secondary-action" onClick={switchToDemo}>切换到 Demo</button></div>}
    <div className="studio-layout">
      <aside className="brief-panel panel">
        <div className="form-head"><span className="step-tag">01</span><div><h2>任务配置</h2><p>固定 PHK-01 面试场景；字段来自受控 Brief。</p></div></div>
        <label>选择产品<select value={selected.id} onChange={event => { const product = products.find(item => item.id === event.target.value) || products[0]; onSelect(product); updateBrief({ productId: product.id }); }}>{products.map(product => <option key={product.id} value={product.id}>{product.name}{product.workflowAvailable ? '' : '（仅知识）'}</option>)}</select></label>
        <label>内容类型<input value="B2B SEO 采购指南" readOnly aria-readonly="true" /></label>
        <label>目标关键词<input value={state.brief.keyword} readOnly aria-readonly="true" /></label>
        <div className="field-pair"><label>目标市场<input value="全球 B2B OEM" readOnly aria-readonly="true" /></label><label>文章语言<input value="英语" readOnly aria-readonly="true" /></label></div>
        <label>目标读者<input value={state.brief.audience} readOnly aria-readonly="true" /></label>
        <div className="deliverables"><span>固定输出内容</span><label><input type="checkbox" checked={state.brief.deliverables.article} readOnly /> SEO 长篇文章</label><label><input type="checkbox" checked={state.brief.deliverables.heroVisual} readOnly /> 模拟视觉方案</label><label><input type="checkbox" checked={state.brief.deliverables.faq} readOnly /> 常见问题</label></div>
        {!runnable && <div className="product-blocker" role="note"><AlertTriangle size={16} /><span>{selected.workflowNote}</span></div>}
        <div className="form-actions">
          <button className="primary-action full" onClick={() => start()} disabled={!runnable || active}><Play size={16} />{active ? '生成中…' : run?.status === 'failed' ? '重新运行' : complete ? '重新运行' : '开始生成'}</button>
          <button className="secondary-action full" onClick={() => start({ quick: true })} disabled={!runnable || active}>快速回放</button>
          <button className="quiet-action full" onClick={() => start({ failOnce: true })} disabled={!runnable || active}>演示失败一次</button>
        </div>
      </aside>
      <section className="agent-canvas panel">
        <div className="panel-heading"><div><span className="section-kicker">AGENT 流程编排</span><h2>Agent 协作流程</h2></div><span className={`run-state ${complete ? 'complete' : active ? 'running' : run?.status === 'failed' ? 'failed' : ''}`}>{run?.status === 'approved' ? '已批准' : complete ? '等待人工审核' : active ? `${state.mode === 'live' ? 'Live' : 'Demo'} 运行中` : run?.status === 'failed' ? '运行失败' : '尚未开始'}</span></div>
        <div className="context-strip"><ProductVisual product={selected} /><div><strong>{selected.name}</strong><span>{selected.documents.length} 个知识来源 · {verifiedCount} 个已验证字段</span></div><div><small>内容目标</small><strong>{runnable ? '吊灯五金 OEM 采购指南' : '未配置演示内容包'}</strong></div></div>
        <div className="routing-strip"><Route size={16} /><div><b>分层路由</b><span>Qwen-Plus 负责抽取/规划 · DeepSeek 负责长文 · GPT-4.1 负责高风险审核</span></div><em>150 题评测快照</em></div>
        <div className="agent-timeline" aria-live="polite">{stages.map((agent, index) => <div className={`agent-step ${agent.status}`} key={agent.id}><div className="agent-node">{agent.status === 'completed' ? <Check size={17} /> : agent.status === 'running' ? <Bot size={17} /> : agent.status === 'failed' ? <AlertTriangle size={17} /> : index + 1}</div><div className="agent-main"><div><strong>{agent.name}</strong><span>{agent.role} · {agent.promptVersion}</span></div><p>{agent.status === 'waiting' ? '等待上游结果' : agent.status === 'failed' ? '模拟网关未返回结果' : agent.summary}</p>{agent.status !== 'waiting' && <small><FileSearch size={12} />{agent.evidence}</small>}<details className="agent-contract"><summary><Code2 size={12} />查看输入与输出契约</summary><div><span>输入</span><p>{agent.inputSummary}</p><span>输出 Schema</span><p>{agent.outputSchema} · {agent.schemaVersion}</p><span>模型路由</span><p>{agent.modelRoute}</p></div></details></div><span className="agent-duration">{agent.status === 'completed' ? agent.durationLabel : agent.status === 'running' ? '运行中' : agent.status === 'failed' ? '失败' : '—'}</span></div>)}</div>
        {!run && <div className="start-placeholder"><Bot size={24} /><strong>等待任务启动</strong><span>运行、快速回放和失败场景使用同一 typed mock service；不展示隐藏模型推理。</span></div>}
        {run?.status === 'failed' && <div className="error-state" role="alert"><AlertTriangle size={22} /><div><strong>内容任务没有完成</strong><span>{run.error}</span></div><button className="primary-action" onClick={() => start()}><RotateCcw size={15} />重试正常流程</button>{state.mode === 'live' && <button className="secondary-action" onClick={switchToDemo}>切换到 Demo</button>}</div>}
        {complete && <>
          <div className="output-ready"><CheckCircle2 size={19} /><div><strong>内容包已生成，发现 {run!.findings.length} 项需要判断的问题</strong><span>长篇文章 · {run!.article.sections.length} 个内容模块 · {run!.visualAssets.length} 项模拟视觉资产</span></div><button onClick={() => navigate(run?.status === 'approved' ? 'assets' : 'review')}>{run?.status === 'approved' ? '查看资产' : '开始审核'} <ArrowRight size={15} /></button></div>
          <div className="visual-output"><div className="panel-heading"><div><span className="section-kicker">模拟视觉资产</span><h3>内容包预览</h3></div><span className="demo-data-label">非实时生图</span></div><div className="visual-grid">{run!.visualAssets.map(asset => <VisualPreview key={asset.id} asset={asset} compact />)}</div></div>
        </>}
      </section>
    </div>
  </>;
}
