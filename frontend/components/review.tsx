'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, CircleAlert, FileSearch, FileText, Lightbulb, Pencil, ShieldCheck } from 'lucide-react';
import { articleWordCount } from '../lib/export-utils';
import { findingDecision, hasUnresolvedCritical, isFindingHandled, unresolvedFindings } from '../lib/content-ops-state';
import type { ArticleSection, DecisionKind, ReviewFinding, View, WorkflowRun } from '../lib/content-ops-types';
import { PageHeading, ProductVisual } from './shared';
import { products } from '../lib/workspace-data';

function ArticleSectionView({ section, finding, editing, onEdit }: { section: ArticleSection; finding?: ReviewFinding; editing: boolean; onEdit: (text: string) => void }) {
  const isHit = Boolean(finding && section.text.includes(finding.before));
  const segments = isHit && finding ? section.text.split(finding.before) : [];
  return <section id={`article-${section.id}`} className={`${isHit ? 'highlighted-section ' : ''}article-section article-section-${section.kind}`}>
    {section.heading && <h2>{section.heading}</h2>}
    {editing ? <textarea value={section.text} onChange={event => onEdit(event.target.value)} aria-label={`编辑 ${section.heading || '开头'}`} /> : <p>{isHit && finding ? <>{segments[0]}<mark>{finding.before}</mark>{segments.slice(1).join(finding.before)}</> : section.text}</p>}
    {section.rows?.length ? <div className="article-table-wrap"><table className="article-table"><thead><tr><th>Controlled field</th><th>Verified value</th><th>Procurement implication</th></tr></thead><tbody>{section.rows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.value}</td><td>{row.implication}</td></tr>)}</tbody></table></div> : null}
    {section.items?.length ? (section.kind === 'steps' ? <ol className="article-steps">{section.items.map(item => <li key={item}>{item}</li>)}</ol> : <ul className="article-checklist">{section.items.map(item => <li key={item}>{item}</li>)}</ul>) : null}
    {section.faqs?.length ? <div className="article-faqs">{section.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div> : null}
  </section>;
}

export function Review({ run, editing, selectedFindingId, selectFinding, setEditing, editSection, decide, approve, navigate }: {
  run: WorkflowRun;
  editing: boolean;
  selectedFindingId: string;
  selectFinding: (findingId: string) => void;
  setEditing: (editing: boolean) => void;
  editSection: (sectionId: string, text: string) => void;
  decide: (findingId: string, decision: DecisionKind) => void;
  approve: () => void;
  navigate: (view: View) => void;
}) {
  const selectedFinding = run.findings.find(finding => finding.id === selectedFindingId) || run.findings[0];
  const [tab, setTab] = useState<ReviewFinding['type']>(selectedFinding.type);
  const visibleSelected = selectedFinding.type === tab ? selectedFinding : run.findings.find(finding => finding.type === tab);
  const unresolvedCritical = hasUnresolvedCritical(run);
  const open = unresolvedFindings(run);
  const criticalCount = open.filter(finding => finding.severity === 'critical').length;

  useEffect(() => {
    if (visibleSelected?.targetSectionId) document.getElementById(`article-${visibleSelected.targetSectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [visibleSelected?.id, visibleSelected?.targetSectionId]);

  return <>
    <PageHeading eyebrow="人机协作审核" title="内容审核工作台" description="在内容进入资产库前，完成事实、SEO、GEO 与品牌判断。" action={<div className="heading-actions"><button className="secondary-action" onClick={() => setEditing(!editing)}><Pencil size={15} />{editing ? '完成编辑' : '手动编辑'}</button><button className="primary-action" onClick={approve} disabled={unresolvedCritical || run.status === 'approved'}><Check size={16} />{run.status === 'approved' ? '已审核通过' : '审核通过'}</button></div>} />
    <div className="review-toolbar panel"><div className="review-title"><ProductVisual product={products[0]} /><div><strong>{run.article.title}</strong><span>任务 {run.id} · Aurelia PHK-01 · {run.status === 'approved' ? 'V2' : 'V1'}</span></div></div><div className="score-pills"><span><small>质量</small><strong>{run.scores.quality}</strong></span><span className="geo"><small>GEO</small><strong>{run.scores.geo}</strong></span><span className={unresolvedCritical ? 'risk' : 'ok'}><small>关键风险</small><strong>{criticalCount}</strong></span></div></div>
    <div className="review-layout">
      <article className="article-panel panel">
        <div className="document-meta"><span><FileText size={14} />文章草稿 · {articleWordCount(run.article).toLocaleString()} 个英文词 · {run.article.sections.length} 个内容模块</span><em>{run.owner} · {new Date(run.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</em></div>
        <h1>{run.article.title}</h1><p className="article-dek">{run.article.dek}</p>
        <div className="article-toc"><strong>In this guide</strong><div>{run.article.sections.filter(section => section.heading).map(section => <span key={section.id}>{section.heading}</span>)}</div></div>
        {run.article.sections.map(section => <ArticleSectionView key={section.id} section={section} finding={visibleSelected} editing={editing} onEdit={text => editSection(section.id, text)} />)}
      </article>
      <aside className="inspection-panel panel">
        <div className="inspection-head"><div><span className="section-kicker">质量审查</span><h2>审查报告</h2></div><span>{open.length} 未处理</span></div>
        <div className="review-tabs" role="tablist" aria-label="审查维度">{(['fact', 'seo', 'geo', 'brand'] as const).map(type => <button role="tab" aria-selected={tab === type} className={tab === type ? 'active' : ''} key={type} onClick={() => { setTab(type); const first = run.findings.find(finding => finding.type === type && !isFindingHandled(run, finding)) || run.findings.find(finding => finding.type === type); if (first) selectFinding(first.id); }}>{type === 'fact' ? '事实' : type === 'brand' ? '品牌' : type.toUpperCase()}<em>{run.findings.filter(finding => finding.type === type && !isFindingHandled(run, finding)).length}</em></button>)}</div>
        {tab === 'geo' && <div className="geo-summary"><div className="geo-ring" style={{ '--score': `${run.scores.geo * 3.6}deg` } as React.CSSProperties}><strong>{run.scores.geo}</strong><span>/100</span></div><div><strong>GEO 内容准备度</strong><p>LumaFlow 内部评估规则，非行业或搜索平台官方标准。</p></div></div>}
        <div className="finding-list">{run.findings.filter(finding => finding.type === tab).map(finding => { const decision = findingDecision(run, finding.id); const handled = isFindingHandled(run, finding); return <button className={`finding-card ${finding.severity} ${selectedFindingId === finding.id ? 'selected' : ''} ${handled ? 'resolved' : ''}`} key={finding.id} onClick={() => selectFinding(finding.id)}><div className="finding-top"><span>{decision?.decision === 'accepted' ? <CheckCircle2 size={14} /> : decision?.decision === 'manual' ? <Pencil size={14} /> : finding.severity === 'critical' ? <CircleAlert size={14} /> : <Lightbulb size={14} />} {decision?.decision === 'accepted' ? '已接受' : decision?.decision === 'manual' ? '手动修正' : decision?.decision === 'ignored' ? '已忽略' : finding.severity === 'critical' ? '高风险' : finding.severity === 'warning' ? '需确认' : '建议'}</span><em>{finding.scoreImpact.geo ? `GEO +${finding.scoreImpact.geo}` : `质量 +${finding.scoreImpact.quality || 0}`}</em></div><strong>{finding.title}</strong><p>{finding.detail}</p>{finding.source && <small><FileSearch size={12} />{finding.source}</small>}</button>; })}</div>
        {visibleSelected && <div className="finding-detail"><div className="compare-copy"><span>当前表述</span><p>{visibleSelected.before}</p><span>建议表述</span><p className="suggested">{visibleSelected.after}</p></div><div className="finding-actions">{visibleSelected.severity === 'critical' ? <span className="critical-note"><ShieldCheck size={13} />关键事实不可忽略</span> : <button className="secondary-action" onClick={() => decide(visibleSelected.id, 'ignored')} disabled={Boolean(findingDecision(run, visibleSelected.id))}>忽略</button>}<button className="primary-action" onClick={() => decide(visibleSelected.id, 'accepted')} disabled={['accepted', 'manual'].includes(findingDecision(run, visibleSelected.id)?.decision || '')}>{findingDecision(run, visibleSelected.id)?.decision === 'ignored' ? <>改为接受修改 <ArrowRight size={15} /></> : findingDecision(run, visibleSelected.id) ? <><Check size={15} />已记录</> : <>接受修改 <ArrowRight size={15} /></>}</button></div></div>}
        {run.status === 'approved' && <div className="approval-success"><CheckCircle2 size={20} /><div><strong>V2 已进入内容资产库</strong><span>文章、视觉、来源与人工决定已保存为不可变版本。</span></div><button onClick={() => navigate('assets')}>查看资产</button></div>}
      </aside>
    </div>
  </>;
}
