'use client';

import { useState } from 'react';
import { Ban, Boxes, Check, CheckCircle2, CircleAlert, FilePlus2, FileSearch, FileText, Search, ShieldCheck, Target, Workflow } from 'lucide-react';
import { products } from '../lib/workspace-data';
import type { Product, ProductReadiness, View } from '../lib/content-ops-types';
import { Drawer, PageHeading, ProductVisual } from './shared';

export function Knowledge({ selected, sourceDetailId, setSelected, openSource, navigate }: {
  selected: Product;
  sourceDetailId: string | null;
  setSelected: (product: Product) => void;
  openSource: (sourceId: string | null) => void;
  navigate: (view: View) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'全部' | ProductReadiness>('全部');
  const visible = products.filter(product => {
    const matchesQuery = `${product.name} ${product.model} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === '全部' || product.status === status);
  });
  const source = products.flatMap(product => product.documents).find(item => item.id === sourceDetailId);

  return <>
    <PageHeading
      eyebrow="产品知识"
      title="产品与知识来源"
      description="集中管理产品主数据、BOM、工艺、色板、交付范围与来源版本。"
      action={<button className="primary-action" onClick={() => navigate('studio')} disabled={!selected.workflowAvailable} title={!selected.workflowAvailable ? selected.workflowNote : undefined}><FilePlus2 size={17} />创建内容任务</button>}
    />
    <div className="knowledge-layout">
      <aside className="product-browser panel">
        <div className="compact-search"><Search size={15} /><input aria-label="搜索产品" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索产品或型号" /></div>
        <div className="knowledge-filters" aria-label="产品状态筛选">{(['全部', '生产就绪', '待补资料', '待质量审核'] as const).map(option => <button key={option} className={status === option ? 'active' : ''} onClick={() => setStatus(option)}>{option}</button>)}</div>
        <div className="browser-caption"><span>{visible.length} 个产品</span><small>按知识就绪状态管理</small></div>
        <div className="product-list">{visible.map(product => <button className={`product-card ${selected.id === product.id ? 'selected' : ''}`} key={product.id} onClick={() => setSelected(product)}><ProductVisual product={product} /><div><strong>{product.name}</strong><span>{product.category}</span><small>{product.status}</small></div><em className={product.status === '生产就绪' ? 'ready' : 'needs'}>{product.completeness}%</em></button>)}</div>
        {!visible.length && <div className="empty-state compact"><FileSearch size={24} /><strong>没有匹配产品</strong><span>调整关键词或状态筛选。</span></div>}
      </aside>
      <section className="knowledge-detail">
        <article className="product-hero panel"><ProductVisual product={selected} large /><div className="product-copy"><div className="status-line"><span className={selected.workflowAvailable ? 'verified-pill' : 'sample-pill'}>{selected.workflowAvailable ? <><Check size={12} />生产就绪</> : <><CircleAlert size={12} />{selected.status}</>}</span><span>{selected.market}</span></div><h2>{selected.name}</h2><p>{selected.description}</p><div className="app-tags">{selected.applications.map(application => <span key={application}>{application}</span>)}</div><small className="workflow-note">{selected.workflowNote}</small>{selected.knowledge.gaps.length > 0 && <div className="knowledge-gaps"><strong>待补项</strong>{selected.knowledge.gaps.map(gap => <span key={gap}><CircleAlert size={12} />{gap}</span>)}</div>}</div><div className="knowledge-score"><strong>{selected.completeness}%</strong><span>知识完整度</span><div><i style={{ width: `${selected.completeness}%` }} /></div></div></article>
        <article className="panel"><div className="panel-heading"><div><span className="section-kicker">受控字段</span><h2>产品事实</h2></div><span className="verified-count"><ShieldCheck size={14} />{selected.specs.filter(spec => spec.verified).length} 已批准</span></div><div className="spec-grid">{selected.specs.map(spec => <div className={`spec-cell ${!spec.verified ? 'unverified' : ''}`} key={spec.label}><span>{spec.label}</span><strong>{spec.value}</strong><small>{spec.verified ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />} {spec.source}</small></div>)}</div></article>
        {selected.knowledge.bom.length > 0 && <div className="knowledge-operations">
          <article className="panel bom-panel"><div className="panel-heading"><div><span className="section-kicker">{selected.knowledge.bomVersion}</span><h2><Boxes size={16} />套件 BOM</h2></div><span className="record-label">已发布版本</span></div><div className="bom-tree"><div className="bom-root"><b>PHK-01</b><span>非电气吊灯五金套件</span></div>{selected.knowledge.bom.map(node => <div className="bom-branch" key={node.id}><div><b>{node.name}</b><span>{node.partNumber} · ×{node.quantity}</span><small>{node.material} · {node.finish}</small></div>{node.children?.map(child => <div className="bom-child" key={child.id}><b>{child.name}</b><span>{child.partNumber} · ×{child.quantity}</span><small>{child.material} · {child.finish}</small></div>)}</div>)}</div></article>
          <article className="panel process-panel"><div className="panel-heading"><div><span className="section-kicker">受控工艺路线</span><h2><Workflow size={16} />从毛坯到齐套</h2></div></div><div className="process-route">{selected.knowledge.processRoute.map(step => <div key={step.id}><i>{step.order}</i><span><b>{step.name}</b><small>{step.mode} · {step.boundary}</small><em>{step.output}</em></span></div>)}</div></article>
        </div>}
        <article className="panel scope-panel"><div className="panel-heading"><div><span className="section-kicker">业务范围门禁</span><h2>交付包含与明确排除</h2></div><span className="verified-count"><ShieldCheck size={14} />非电气范围</span></div><div className="scope-grid"><div><h3><CheckCircle2 size={15} />本套件包含</h3>{selected.knowledge.includedScope.map(item => <span key={item}><Check size={13} />{item}</span>)}</div><div className="excluded"><h3><Ban size={15} />明确不包含</h3>{selected.knowledge.excludedScope.map(item => <span key={item}><Ban size={13} />{item}</span>)}</div></div></article>
        <div className="knowledge-bottom">
          <article className="panel"><div className="panel-heading"><div><span className="section-kicker">知识来源</span><h2>关联资料</h2></div><span className="record-label">{selected.knowledge.knowledgeVersion}</span></div>{selected.documents.map(document => <button className="doc-row" key={document.id} onClick={() => openSource(document.id)}><div className="doc-icon"><FileText size={16} /></div><div><strong>{document.name}</strong><span>{document.type} · {document.version} · {document.reference}</span></div><span className={document.status === '已批准' ? 'source-ok' : 'source-warn'}>{document.status}</span></button>)}</article>
          <article className="panel"><div className="panel-heading"><div><span className="section-kicker">SEO 上下文</span><h2>已批准关键词</h2></div></div>{selected.keywords.map(keyword => <div className="keyword-row" key={keyword.keyword}><Target size={15} /><div><strong>{keyword.keyword}</strong><span>{keyword.intent}意图</span></div><em>{keyword.priority}优先级</em></div>)}</article>
        </div>
      </section>
    </div>
    {source && <Drawer title={source.name} label="来源详情" onClose={() => openSource(null)}>
      <p>{source.type} · {source.version} · {source.status}</p>
      <div className="source-metadata"><div><span>责任人</span><strong>{source.owner}</strong></div><div><span>批准时间</span><strong>{source.approvedAt}</strong></div><div><span>引用位置</span><strong>{source.reference}</strong></div></div>
      <blockquote>{source.excerpt}</blockquote>
    </Drawer>}
  </>;
}
