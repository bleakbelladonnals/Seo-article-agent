'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Assets } from '../components/assets';
import { Dashboard } from '../components/dashboard';
import { Knowledge } from '../components/knowledge';
import { Review } from '../components/review';
import { Sidebar, Toast, Topbar } from '../components/shared';
import { Studio } from '../components/studio';
import { products } from '../lib/demo-data';
import { createServices } from '../lib/content-ops-service';
import {
  createInitialRun,
  createInitialState,
  demoReducer,
  LEGACY_STORAGE_KEYS,
  migrateStoredState,
  serializeState,
  STORAGE_KEY,
  unresolvedFindings,
} from '../lib/content-ops-state';
import type { CreateRunOptions, DecisionKind, ExportFormat, View, WorkflowRun } from '../lib/content-ops-types';

export default function Home() {
  const [state, dispatch] = useReducer(demoReducer, undefined, createInitialState);
  const [toast, setToast] = useState('');
  const services = useMemo(() => createServices(), []);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const subscribedRunId = useRef<string | null>(null);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean) || null;
      const hydrated = migrateStoredState(current || legacy);
      services.demo.syncAssets(hydrated.assets);
      if (hydrated.run) services.demo.restoreRun(hydrated.run);
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
    services.demo.syncAssets(state.assets);
    if (state.run?.mode === 'demo') services.demo.syncRun(state.run);
  }, [services, state]);

  useEffect(() => {
    if (!services.live) return;
    dispatch({ type: 'SET_MODE', mode: 'live' });
    dispatch({ type: 'SET_LIVE_STATUS', status: 'checking', message: '正在检测本地 Live Lab…' });
    services.live.health()
      .then(health => dispatch({ type: 'SET_LIVE_STATUS', status: health.ok ? 'available' : 'unavailable', message: health.message }))
      .catch(error => dispatch({ type: 'SET_LIVE_STATUS', status: 'unavailable', message: error instanceof Error ? error.message : 'Live Lab 无法连接。' }));
  }, [services]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => unsubscribeRef.current?.(), []);

  const selectedProduct = products.find(product => product.id === state.selectedProductId) || products[0];
  const reviewBadge = unresolvedFindings(state.run).length;

  const subscribe = useCallback((run: WorkflowRun, quick = false) => {
    unsubscribeRef.current?.();
    subscribedRunId.current = run.id;
    const service = run.mode === 'live' ? services.live : services.demo;
    if (!service) return;
    unsubscribeRef.current = service.subscribeToRun(run.id, event => {
      dispatch({ type: 'RUN_EVENT', event });
      if (event.status === 'needs_review') {
        notify(quick ? '快速回放完成：已载入待审核内容' : '内容包已生成，进入人工审核环节');
        if (quick) dispatch({ type: 'NAVIGATE', view: 'review' });
        subscribedRunId.current = null;
      }
      if (event.status === 'failed') {
        notify('任务失败：可重试或切换到 Demo');
        subscribedRunId.current = null;
      }
    });
  }, [notify, services]);

  useEffect(() => {
    if (!state.hydrated || !state.run || subscribedRunId.current) return;
    if (!['queued', 'analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing'].includes(state.run.status)) return;
    if (state.run.mode === 'demo') {
      services.demo.restoreRun(state.run);
      subscribe(state.run);
    }
  }, [services.demo, state.hydrated, state.run, subscribe]);

  const start = async (options: CreateRunOptions = {}) => {
    if (!selectedProduct.workflowAvailable) {
      notify(selectedProduct.workflowNote);
      return;
    }
    const service = state.mode === 'live' ? services.live : services.demo;
    if (!service || (state.mode === 'live' && state.liveStatus !== 'available')) {
      dispatch({ type: 'SET_LIVE_STATUS', status: 'unavailable', message: state.liveMessage || 'Live Lab 未配置或无法连接。' });
      notify('Live Lab 不可用，请切换到 Demo');
      return;
    }
    try {
      const brief = { ...state.brief, productId: selectedProduct.id };
      const run = await service.createRun(brief, options);
      dispatch({ type: 'RUN_CREATED', run });
      subscribe(run, Boolean(options.quick));
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务启动失败');
    }
  };

  const navigate = (view: View) => {
    if (view === 'review' && !state.run) {
      const run = createInitialRun('demo', state.brief);
      run.status = 'needs_review';
      run.stages = run.stages.map(stage => ({ ...stage, status: 'completed' }));
      services.demo.restoreRun(run);
      dispatch({ type: 'RUN_CREATED', run });
    }
    dispatch({ type: 'NAVIGATE', view });
  };

  const decide = async (findingId: string, decision: DecisionKind) => {
    if (!state.run) return;
    const service = state.run.mode === 'live' ? services.live : services.demo;
    if (!service) return;
    try {
      if (state.run.mode === 'demo') services.demo.syncRun(state.run);
      const run = await service.decideFinding(state.run.id, findingId, decision);
      dispatch({ type: 'RUN_SYNC', run });
      notify(decision === 'accepted' ? '建议已应用并记录到审查轨迹' : '人工忽略决定已记录');
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法记录审查决定');
    }
  };

  const approve = async () => {
    if (!state.run) return;
    const service = state.run.mode === 'live' ? services.live : services.demo;
    if (!service) return;
    try {
      if (state.run.mode === 'demo') services.demo.syncRun(state.run);
      const asset = await service.approveRun(state.run.id);
      dispatch({ type: 'APPROVE', asset });
      notify('审核通过：V2 已保存为不可变资产版本');
    } catch (error) {
      notify(error instanceof Error ? error.message : '审批失败');
    }
  };

  const reset = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    subscribedRunId.current = null;
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    dispatch({ type: 'RESET' });
    services.demo.syncAssets(createInitialState().assets);
    notify('演示数据已完全重置');
  };

  const switchToDemo = () => {
    unsubscribeRef.current?.();
    subscribedRunId.current = null;
    dispatch({ type: 'SET_MODE', mode: 'demo' });
    notify('已切换到确定性 Demo；后续结果会明确标注来源');
  };

  const exportAsset = async (assetId: string, versionId: string, format: ExportFormat) => {
    const asset = state.assets.find(item => item.id === assetId);
    const version = asset?.versions.find(item => item.id === versionId);
    const service = version?.provenance.mode === 'live' && services.live ? services.live : services.demo;
    services.demo.syncAssets(state.assets);
    return service.exportAsset(assetId, versionId, format);
  };

  const page = state.view === 'dashboard'
    ? <Dashboard state={state} navigate={navigate} />
    : state.view === 'knowledge'
      ? <Knowledge selected={selectedProduct} sourceDetailId={state.sourceDetailId} setSelected={product => dispatch({ type: 'SELECT_PRODUCT', productId: product.id })} openSource={sourceId => dispatch({ type: 'OPEN_SOURCE', sourceId })} navigate={navigate} />
      : state.view === 'studio'
        ? <Studio state={state} selected={selectedProduct} onSelect={product => dispatch({ type: 'SELECT_PRODUCT', productId: product.id })} updateBrief={patch => dispatch({ type: 'UPDATE_BRIEF', patch })} start={start} switchToDemo={switchToDemo} navigate={navigate} />
        : state.view === 'review' && state.run
          ? <Review run={state.run} editing={state.editing} selectedFindingId={state.selectedFindingId} selectFinding={findingId => dispatch({ type: 'SELECT_FINDING', findingId })} setEditing={editing => dispatch({ type: 'SET_EDITING', editing })} editSection={(sectionId, text) => dispatch({ type: 'EDIT_SECTION', sectionId, text })} decide={decide} approve={approve} navigate={navigate} />
          : <Assets assets={state.assets} navigate={navigate} exportAsset={exportAsset} notify={notify} />;

  const statusText = state.mode === 'demo'
    ? '确定性模拟服务正常'
    : state.liveStatus === 'available' ? 'Live Lab 已连接' : state.liveStatus === 'checking' ? '正在检测 Live Lab' : 'Live Lab 不可用';

  if (!state.hydrated) {
    return <main className="app-loading" aria-busy="true"><div role="status" aria-live="polite"><span className="loading-mark" aria-hidden="true" /><strong>正在恢复演示工作区</strong><p>读取版本化任务、审核决定与资产快照…</p></div></main>;
  }

  return <main className="app-shell">
    <Sidebar view={state.view} badge={reviewBadge} mode={state.mode} onNavigate={navigate} onReset={reset} />
    <section className="workspace"><Topbar mode={state.mode} statusText={statusText} /><div className="page-content">{page}</div></section>
    {toast && <Toast message={toast} />}
  </main>;
}
