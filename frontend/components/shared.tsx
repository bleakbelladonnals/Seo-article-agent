'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  BookOpenText,
  CheckCircle2,
  Download,
  FileUp,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Trash2,
  Workflow,
  X,
} from 'lucide-react';
import type { Product, View, VisualAsset } from '../lib/content-ops-types';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'knowledge', label: '产品知识', icon: BookOpenText },
  { id: 'studio', label: '内容生产', icon: Workflow },
  { id: 'review', label: '审核中心', icon: ShieldCheck },
  { id: 'assets', label: '内容资产', icon: Archive },
];

export function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <div className={`product-visual ${large ? 'large' : ''}`} style={{ '--accent': product.accent } as React.CSSProperties} aria-label={`${product.name} 产品图`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.imageUrl} alt="" />
      <span>{product.model}</span>
    </div>
  );
}

export function VisualPreview({ asset, compact = false }: { asset: VisualAsset; compact?: boolean }) {
  return (
    <figure className={`visual-preview visual-${asset.motif} ${compact ? 'compact' : ''}`} style={{ '--visual-accent': asset.accent } as React.CSSProperties} aria-label={asset.alt}>
      {asset.imageUrl
        ? /* eslint-disable-next-line @next/next/no-img-element */
          <img className="visual-photo" src={asset.imageUrl} alt="" />
        : asset.motif === 'bom'
          ? <div className="bom-mini" aria-hidden="true"><b>PHK-01</b><span>吸顶盘组件</span><span>吊链组件</span><span>管件 / 套环</span><span>包装与标签</span></div>
          : asset.motif === 'finish'
            ? <div className="finish-mini" aria-hidden="true"><span /><span /><span /><b>STEEL + AB-07</b></div>
            : <div className="lineage-mini" aria-hidden="true"><span>KNOWLEDGE</span><i>→</i><span>PROMPTS</span><i>→</i><span>REVIEW</span><i>→</i><span>V2</span></div>}
      <figcaption><span>{asset.label}</span><strong>{asset.title}</strong>{!compact && <small>{asset.caption}</small>}</figcaption>
    </figure>
  );
}

export function Sidebar({ view, badge, onNavigate, onSettings }: {
  view: View;
  badge: number;
  onNavigate: (view: View) => void;
  onSettings: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Workflow size={18} /></div><div><strong>LumaFlow</strong><span>AI 内容运营中台</span></div></div>
      <nav className="side-nav" aria-label="主导航">
        <p className="nav-label">工作空间</p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-label={label} aria-current={view === id ? 'page' : undefined}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'review' && badge > 0 && <em aria-label={`${badge} 条未处理`}>{badge}</em>}
          </button>
        ))}
      </nav>
      <div className="workspace-note"><span>本地工作区</span><p>业务数据已在当前浏览器自动保存</p></div>
      <button className="nav-item settings" onClick={onSettings} aria-label="工作区设置"><Settings size={18} /><span>工作区设置</span></button>
    </aside>
  );
}

export function Topbar({ statusText }: { statusText: string }) {
  return (
    <header className="topbar">
      <div className="context-breadcrumb"><span>当前项目</span><strong>Aurelia PHK-01</strong><small>吊灯五金 OEM 采购指南</small></div>
      <div className="top-actions"><span className="system-status local"><i /> {statusText}</span><span className="avatar" aria-label="当前用户">MC</span></div>
    </header>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Drawer({ title, label, onClose, children, className = '' }: { title: string; label: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`asset-drawer ${className}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <button ref={closeRef} className="close-button" onClick={onClose} aria-label="关闭详情"><X size={18} /></button>
        <span className="section-kicker">{label}</span>
        <h2 id="drawer-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function WorkspaceSettings({ onClose, onExport, onImport, onClear, lastRestoredAt }: {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  lastRestoredAt: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  return <Drawer title="工作区设置" label="数据管理" onClose={onClose} className="settings-drawer">
    <p>当前工作区在浏览器中自动保存。可导出 JSON 备份并在同一或另一浏览器中恢复。</p>
    {lastRestoredAt && <div className="restore-status"><CheckCircle2 size={16} /><span>最近恢复：{lastRestoredAt}</span></div>}
    <div className="settings-actions">
      <button className="settings-action" onClick={onExport}><Download size={18} /><span><strong>导出工作区备份</strong><small>保存产品选择、Brief、任务、审核决定与资产</small></span></button>
      <button className="settings-action" onClick={() => inputRef.current?.click()}><FileUp size={18} /><span><strong>恢复工作区备份</strong><small>支持 v5 与可迁移的 v4 JSON 文件，最大 5 MB</small></span></button>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden aria-label="选择工作区备份文件" onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ''; }} />
    </div>
    <div className="danger-zone">
      <strong>清除当前工作区</strong>
      <p>将移除当前任务、审核决定和已保存资产，并恢复初始业务数据。</p>
      {!confirmClear
        ? <button className="danger-button" onClick={() => setConfirmClear(true)}><Trash2 size={16} />清除工作区</button>
        : <div className="confirm-clear" role="alert"><span>确认清除全部本地工作数据？</span><div><button onClick={() => setConfirmClear(false)}>取消</button><button className="danger-button" onClick={onClear}>确认清除</button></div></div>}
    </div>
  </Drawer>;
}

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={17} />{message}</div>;
}
