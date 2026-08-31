'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FilePlus2, Inbox } from 'lucide-react';
import { Assets } from '../components/assets';
import { Dashboard } from '../components/dashboard';
import { Knowledge } from '../components/knowledge';
import { Review } from '../components/review';
import { PageHeading, Sidebar, Toast, Topbar, WorkspaceSettings } from '../components/shared';
import { Studio } from '../components/studio';
import { products } from '../lib/workspace-data';
import { createServices } from '../lib/content-ops-service';
import {
  createInitialState,
  LEGACY_STORAGE_KEYS,
  migrateStoredState,
  parseWorkspaceBackup,
  serializeState,
  serializeWorkspaceBackup,
  STORAGE_KEY,
  unresolvedFindings,
  workspaceReducer,
} from '../lib/content-ops-state';
import type { DecisionKind, ExportFormat, View, WorkflowRun } from '../lib/content-ops-types';

export default function Home() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createInitialState);
  const [toast, setToast] = useState('');
  const [lastRestoredAt, setLastRestoredAt] = useState('');
  const services = useMemo(() => createServices(), []);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const subscribedRunId = useRef<string | null>(null);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean) || null;
      const hydrated = migrateStoredState(current || legacy);
      services.local.syncAssets(hydrated.assets);
      if (hydrated.run) services.local.restoreRun(hydrated.run);
      dispatch({ type: 'HYDRATE', state: hydrated });
      if (hydrated.migrationNotice) {
        setTimeout(() => {
          setToast(hydrated.migrationNotice);
          dispatch({ type: 'CLEAR_MIGRATION_NOTICE' });
        }, 0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [services]);

  useEffect(() => {
    if (!state.hydrated) return;
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    services.local.syncAssets(state.assets);
    if (state.run) services.local.syncRun(state.run);
  }, [services, state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => unsubscribeRef.current?.(), []);

  const selectedProduct = products.find(product => product.id === state.selectedProductId) || products[0];
  const reviewBadge = unresolvedFindings(state.run).length;

  const subscribe = useCallback((run: WorkflowRun) => {
    unsubscribeRef.current?.();
    subscribedRunId.current = run.id;
    unsubscribeRef.current = services.local.subscribeToRun(run.id, event => {
      dispatch({ type: 'RUN_EVENT', event });
      if (event.status === 'needs_review') {
        notify('内容包已生成，进入人工审核环节');
        subscribedRunId.current = null;
      }
      if (event.status === 'failed') {
        notify('任务未完成，可重新运行');
        subscribedRunId.current = null;
      }
    });
  }, [notify, services]);

  useEffect(() => {
    if (!state.hydrated || !state.run || subscribedRunId.current) return;
    if (!['queued', 'analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing'].includes(state.run.status)) return;
    services.local.restoreRun(state.run);
    subscribe(state.run);
  }, [services, state.hydrated, state.run, subscribe]);

  const start = async () => {
    if (!selectedProduct.workflowAvailable) {
      notify(selectedProduct.workflowNote);
      return;
    }
    try {
      const brief = { ...state.brief, productId: selectedProduct.id };
      const run = await services.local.createRun(brief);
      dispatch({ type: 'RUN_CREATED', run });
      subscribe(run);
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务启动失败');
    }
  };

  const navigate = (view: View) => dispatch({ type: 'NAVIGATE', view });

  const decide = async (findingId: string, decision: DecisionKind) => {
    if (!state.run) return;
    try {
      services.local.syncRun(state.run);
      const run = await services.local.decideFinding(state.run.id, findingId, decision);
      dispatch({ type: 'RUN_SYNC', run });
      notify(decision === 'accepted' ? '建议已应用并记录到审核轨迹' : '人工决定已记录');
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法记录审核决定');
    }
  };

  const approve = async () => {
    if (!state.run) return;
    try {
      services.local.syncRun(state.run);
      services.local.syncAssets(state.assets);
      const asset = await services.local.approveRun(state.run.id);
      dispatch({ type: 'APPROVE', asset });
      notify('审核通过：V2 已保存为不可变资产版本');
    } catch (error) {
      notify(error instanceof Error ? error.message : '审批失败');
    }
  };

  const exportWorkspace = () => {
    const content = serializeWorkspaceBackup(state, new Date().toISOString());
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lumaflow-workspace-v5.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify('工作区备份已导出');
  };

  const importWorkspace = async (file: File) => {
    try {
      const content = await file.text();
      const workspace = parseWorkspaceBackup(content, file.size);
      dispatch({ type: 'RESTORE', workspace });
      services.local.syncAssets(workspace.assets);
      if (workspace.run) services.local.restoreRun(workspace.run);
      const restoredAt = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
      setLastRestoredAt(restoredAt);
      notify(`工作区已恢复 · ${restoredAt}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '工作区恢复失败');
    }
  };

  const clearWorkspace = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    subscribedRunId.current = null;
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    dispatch({ type: 'CLEAR_WORKSPACE' });
    services.local.syncAssets(createInitialState().assets);
    notify('工作区已清除并恢复初始数据');
  };

  const exportAsset = async (assetId: string, versionId: string, format: ExportFormat) => {
    services.local.syncAssets(state.assets);
    return services.local.exportAsset(assetId, versionId, format);
  };

  const page = state.view === 'dashboard'
    ? <Dashboard state={state} navigate={navigate} />
    : state.view === 'knowledge'
      ? <Knowledge selected={selectedProduct} sourceDetailId={state.sourceDetailId} setSelected={product => dispatch({ type: 'SELECT_PRODUCT', productId: product.id })} openSource={sourceId => dispatch({ type: 'OPEN_SOURCE', sourceId })} navigate={navigate} />
      : state.view === 'studio'
        ? <Studio state={state} selected={selectedProduct} onSelect={product => dispatch({ type: 'SELECT_PRODUCT', productId: product.id })} updateBrief={patch => dispatch({ type: 'UPDATE_BRIEF', patch })} start={start} navigate={navigate} />
        : state.view === 'review'
          ? state.run
            ? <Review run={state.run} editing={state.editing} selectedFindingId={state.selectedFindingId} selectFinding={findingId => dispatch({ type: 'SELECT_FINDING', findingId })} setEditing={editing => dispatch({ type: 'SET_EDITING', editing })} editSection={(sectionId, text) => dispatch({ type: 'EDIT_SECTION', sectionId, text })} decide={decide} approve={approve} navigate={navigate} />
            : <><PageHeading eyebrow="审核中心" title="待审核内容" description="完成内容任务后，事实、SEO、GEO 与品牌问题会进入此处。" action={<button className="primary-action" onClick={() => navigate('studio')}><FilePlus2 size={16} />新建内容任务</button>} /><div className="panel empty-state review-empty"><Inbox size={30} /><strong>当前没有待审核任务</strong><span>从内容生产模块创建并完成任务后再进行审核。</span></div></>
          : <Assets assets={state.assets} navigate={navigate} exportAsset={exportAsset} notify={notify} />;

  if (!state.hydrated) {
    return <main className="app-loading" aria-busy="true"><div role="status" aria-live="polite"><span className="loading-mark" aria-hidden="true" /><strong>正在恢复工作区</strong><p>读取任务、审核决定与资产版本…</p></div></main>;
  }

  return <main className="app-shell">
    <Sidebar view={state.view} badge={reviewBadge} onNavigate={navigate} onSettings={() => dispatch({ type: 'OPEN_SETTINGS', open: true })} />
    <section className="workspace"><Topbar statusText="本地工作流服务正常" /><div className="page-content">{page}</div></section>
    {state.settingsOpen && <WorkspaceSettings onClose={() => dispatch({ type: 'OPEN_SETTINGS', open: false })} onExport={exportWorkspace} onImport={importWorkspace} onClear={clearWorkspace} lastRestoredAt={lastRestoredAt} />}
    {toast && <Toast message={toast} />}
  </main>;
}
