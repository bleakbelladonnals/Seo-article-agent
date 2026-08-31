'use client';

import { useEffect, useRef } from 'react';
import {
  Archive,
  BookOpenText,
  CheckCircle2,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Product, RunMode, View, VisualAsset } from '../lib/content-ops-types';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'knowledge', label: '产品知识', icon: BookOpenText },
  { id: 'studio', label: '内容生产', icon: Sparkles },
  { id: 'review', label: '审核中心', icon: ShieldCheck },
  { id: 'assets', label: '内容资产', icon: Archive },
];

export function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <div className={`product-visual ${large ? 'large' : ''}`} style={{ '--accent': product.accent } as React.CSSProperties} aria-label={`${product.name} 模拟产品图`}>
      {/* Generated local demo asset; a native image avoids runtime optimization and external requests. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.imageUrl} alt="" style={{ objectFit: 'cover', objectPosition: product.imagePosition || 'center' }} />
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

export function Sidebar({ view, badge, mode, onNavigate, onReset }: {
  view: View;
  badge: number;
  mode: RunMode;
  onNavigate: (view: View) => void;
  onReset: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>LumaFlow</strong><span>AI 内容运营中台</span></div></div>
      <nav className="side-nav" aria-label="主导航">
        <p className="nav-label">工作空间</p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-label={label} aria-current={view === id ? 'page' : undefined}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'review' && badge > 0 && <em aria-label={`${badge} 条未处理`}>{badge}</em>}
          </button>
        ))}
      </nav>
      <div className="demo-note"><span className="demo-pill">{mode === 'live' ? 'LIVE LAB' : '演示回放'}</span><p>{mode === 'live' ? '本地真实流水线' : '脱敏流程与确定性数据'}</p></div>
      <button className="nav-item settings" onClick={onReset} aria-label="重置演示"><RotateCcw size={18} /><span>重置演示</span></button>
    </aside>
  );
}

export function Topbar({ mode, statusText }: { mode: RunMode; statusText: string }) {
  return (
    <header className="topbar">
      <div className="context-breadcrumb"><span>固定案例</span><strong>Aurelia PHK-01</strong><small>吊灯五金 OEM 采购指南</small></div>
      <div className="top-actions"><span className={`system-status ${mode}`}><i /> {statusText}</span><span className="avatar" aria-label="演示用户">BL</span></div>
    </header>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Drawer({ title, label, onClose, children }: { title: string; label: string; onClose: () => void; children: React.ReactNode }) {
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
      <section ref={dialogRef} className="asset-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <button ref={closeRef} className="close-button" onClick={onClose} aria-label="关闭详情"><X size={18} /></button>
        <span className="section-kicker">{label}</span>
        <h2 id="drawer-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={17} />{message}</div>;
}
