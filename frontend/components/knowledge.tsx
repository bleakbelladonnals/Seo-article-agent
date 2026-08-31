'use client';

import { useState } from 'react';
import { Ban, Boxes, Check, CheckCircle2, CircleAlert, FileSearch, FileText, Search, ShieldCheck, Sparkles, Target, Workflow } from 'lucide-react';
import { demoDisclosure, products } from '../lib/demo-data';
import type { Product, View } from '../lib/content-ops-types';
import { Drawer, PageHeading, ProductVisual } from './shared';

export function Knowledge({ selected, sourceDetailId, setSelected, openSource, navigate }: {
  selected: Product;
  sourceDetailId: string | null;
  setSelected: (product: Product) => void;
  openSource: (sourceId: string | null) => void;
  navigate: (view: View) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'全部' | '可运行' | '待验证'>('全部');
  const visible = products.filter(product => {
    const matchesQuery = `${product.name} ${product.model} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === '全部' || (status === '可运行' ? product.workflowAvailable : product.status === '待审核');
    return matchesQuery && matchesStatus;
  });
  const source = products.flatMap(product => product.documents).find(item => item.id === sourceDetailId);

  return <>
    <PageHeading
      eyebrow="产品知识库"
      title="产品与知识来源"
      description="让每一条内容都能回到已确认的产品事实与虚构来源快照。"
      action={<button className="primary-action" onClick={() => navigate('studio')} disabled={!selected.workflowAvailable} title={!selected.workflowAvailable ? selected.workflowNote : undefined}><Sparkles size={17} />{selected.workflowAvailable ? '基于此产品生成' : '暂无演示工作流'}</button>}
    />
    <div className="knowledge-layout">
      <aside className="product-browser panel">
        <div className="compact-search"><Search size={15} /><input aria-label="搜索产品" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索产品或型号" /></div>
        <div className="knowledge-filters" aria-label="产品状态筛选">{(['全部', '可运行', '待验证'] as const).map(option => <button key={option} className={status === option ? 'active' : ''} onClick={() => setStatus(option)}>{option}</button>)}</div>
        <div className="browser-caption"><span>{visible.length} 个产品</span><small>仅 PHK-01 可运行固定流程</small></div>
        <div className="product-list">{visible.map(product => <button className={`product-card ${selected.id === product.id ? 'selected' : ''}`} key={product.id} onClick={() => setSelected(product)}><ProductVisual product={product} /><div><strong>{product.name}</strong><span>{product.category}</span><small>{product.workflowAvailable ? '演示流程已配置' : '仅知识样本'}</small></div><em className={product.status === '可用' ? 'ready' : 'needs'}>{product.completeness}%</em></button>)}</div>
        {!visible.length && <div className="empty-state compact"><FileSearch size={24} /><strong>没有匹配产品</strong><span>调整关键词或状态筛选。</span></div>}
      </aside>
      <section className="knowledge-detail">
        <article className="product-hero panel"><ProductVisual product={selected} large /><div className="product-copy"><div className="status-line"><span className={selected.workflowAvailable ? 'verified-pill' : 'sample-pill'}>{selected.workflowAvailable ? <><Check size={12} />工作流可用</> : <><CircleAlert size={12} />仅知识样本</>}</span><span>{selected.market}</span></div><h2>{selected.name}</h2><p>{selected.description}</p><div className="app-tags">{selected.applications.map(application => <span key={application}>{application}</span>)}</div><small className="workflow-note">{selected.workflowNote}</small></div><div className="knowledge-score"><strong>{selected.completeness}%</strong><span>知识完整度</span><div><i style={{ width: `${selected.completeness}%` }} /></div></div></article>
        <article className="panel"><div className="panel-heading"><div><span className="section-kicker">已验证事实</span><h2>产品事实</h2></div><span className="verified-count"><ShieldCheck size={14} />{selected.specs.filter(spec => spec.verified).length} 已验证</span></div><div className="spec-grid">{selected.specs.map(spec => <div className={`spec-cell ${!spec.verified ? 'unverified' : ''}`} key={spec.label}><span>{spec.label}</span><strong>{spec.value}</strong><small>{spec.verified ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />} {spec.source}</small></div>)}</div></article>
        {selected.knowledge.bom.length > 0 && <div className="knowledge-operations">
          <article className="panel bom-panel"><div className="panel-heading"><div><span className="section-kicker">{selected.knowledge.bomVersion}</span><h2><Boxes size={16} />套件 BOM</h2></div><span className="demo-data-label">已发布版本</span></div><div className="bom-tree"><div className="bom-root"><b>PHK-01</b><span>非电气吊灯五金套件</span></div>{selected.knowledge.bom.map(node => <div className="bom-branch" key={node.id}><div><b>{node.name}</b><span>{node.partNumber} · ×{node.quantity}</span><small>{node.material} · {node.finish}</small></div>{node.children?.map(child => <div className="bom-child" key={child.id}><b>{child.name}</b><span>{child.partNumber} · ×{child.quantity}</span><small>{child.material} · {child.finish}</small></div>)}</div>)}</div></article>
          <article className="panel process-panel"><div className="panel-heading"><div><span className="section-kicker">受控工艺路线</span><h2><Workflow size={16} />从毛坯到齐套</h2></div></div><div className="process-route">{selected.knowledge.processRoute.map(step => <div key={step.id}><i>{step.order}</i><span><b>{step.name}</b><small>{step.mode} · {step.boundary}</small><em>{step.output}</em></span></div>)}</div></article>
        </div>}
        <article className="panel scope-panel"><div className="panel-heading"><div><span className="section-kicker">业务范围门禁</span><h2>交付包含与明确排除</h2></div><span className="verified-count"><ShieldCheck size={14} />非电气范围</span></div><div className="scope-grid"><div><h3><CheckCircle2 size={15} />本套件包含</h3>{selected.knowledge.includedScope.map(item => <span key={item}><Check size={13} />{item}</span>)}</div><div className="excluded"><h3><Ban size={15} />明确不包含</h3>{selected.knowledge.excludedScope.map(item => <span key={item}><Ban size={13} />{item}</span>)}</div></div></article>
        <div className="knowledge-bottom">
          <article className="panel"><div className="panel-heading"><div><span className="section-kicker">知识来源</span><h2>关联资料</h2></div><span className="demo-data-label">匿名化演示</span></div>{selected.documents.map(document => <button className="doc-row" key={document.id} onClick={() => openSource(document.id)}><div className="doc-icon"><FileText size={16} /></div><div><strong>{document.name}</strong><span>{document.type} · {document.version} · {document.reference}</span></div><span className={document.status === '已验证' ? 'source-ok' : 'source-warn'}>{document.status}</span></button>)}</article>
          <article className="panel"><div className="panel-heading"><div><span className="section-kicker">SEO 上下文</span><h2>目标关键词</h2></div></div>{selected.keywords.map(keyword => <div className="keyword-row" key={keyword.keyword}><Target size={15} /><div><strong>{keyword.keyword}</strong><span>{keyword.intent}意图</span></div><em>{keyword.priority}优先级</em></div>)}</article>
        </div>
      </section>
    </div>
    {source && <Drawer title={source.name} label="来源快照" onClose={() => openSource(null)}>
      <p>{source.type} · {source.version} · {source.status}</p>
      <div className="source-reference"><FileText size={17} /><div><span>定位</span><strong>{source.reference}</strong></div></div>
      <blockquote>{source.excerpt}</blockquote>
      <div className="disclosure-card"><ShieldCheck size={17} /><div><strong>演示资料声明</strong><span>{source.disclosure || demoDisclosure}</span></div></div>
    </Drawer>}
  </>;
}
