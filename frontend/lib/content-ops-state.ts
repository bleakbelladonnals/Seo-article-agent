import { agentTemplates, defaultBrief, findings, fixedLineage, initialArticle, products, seedAssets, visualAssets } from './demo-data';
import type {
  ArticleDocument,
  ContentAsset,
  ContentBrief,
  DecisionKind,
  DemoState,
  HumanDecision,
  ReviewFinding,
  RunMode,
  View,
  WorkflowEvent,
  WorkflowRun,
} from './content-ops-types';

export const STORAGE_KEY = 'lumaflow-demo-v4';
export const LEGACY_STORAGE_KEYS = ['lumaflow-demo', 'lumaflow-demo-v2', 'lumaflow-demo-v3'];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createInitialRun(mode: RunMode = 'demo', brief: ContentBrief = defaultBrief): WorkflowRun {
  return {
    id: `demo-${Date.now()}`,
    mode,
    status: 'idle',
    brief: clone(brief),
    stages: clone(agentTemplates),
    article: clone(initialArticle),
    findings: clone(findings),
    decisions: [],
    visualAssets: clone(visualAssets),
    sourceIds: products[0].documents.map(source => source.id),
    scores: { quality: 82, geo: 76 },
    lineage: clone(fixedLineage),
    createdAt: '2026-08-27T09:30:00+08:00',
  };
}

export function createInitialState(): DemoState {
  const liveConfigured = Boolean(process.env.NEXT_PUBLIC_CONTENT_OPS_API_BASE);
  return {
    schemaVersion: 4,
    view: 'dashboard',
    mode: liveConfigured ? 'live' : 'demo',
    liveStatus: liveConfigured ? 'checking' : 'not_configured',
    liveMessage: liveConfigured ? '正在检测本地 Live Lab…' : '公开演示未配置 Live 后端。',
    selectedProductId: 'phk-01',
    brief: clone(defaultBrief),
    run: null,
    assets: clone(seedAssets),
    sourceDetailId: null,
    selectedFindingId: 'fact-material',
    editing: false,
    hydrated: false,
    migrationNotice: '',
  };
}

export function applyFinding(article: ArticleDocument, finding: ReviewFinding): ArticleDocument {
  return {
    title: article.title.replace(finding.before, finding.after),
    dek: article.dek.replace(finding.before, finding.after),
    sections: article.sections.map(section => ({
      ...section,
      text: section.text.replace(finding.before, finding.after),
      items: section.items?.map(item => item.replace(finding.before, finding.after)),
      rows: section.rows?.map(row => ({
        label: row.label.replace(finding.before, finding.after),
        value: row.value.replace(finding.before, finding.after),
        implication: row.implication.replace(finding.before, finding.after),
      })),
      faqs: section.faqs?.map(faq => ({
        question: faq.question.replace(finding.before, finding.after),
        answer: faq.answer.replace(finding.before, finding.after),
      })),
    })),
  };
}

export function calculateScores(run: Pick<WorkflowRun, 'findings' | 'decisions'>) {
  return run.decisions.reduce(
    (scores, decision) => {
      if (decision.decision === 'ignored') return scores;
      const finding = run.findings.find(item => item.id === decision.findingId);
      if (!finding) return scores;
      return {
        quality: Math.min(100, scores.quality + (finding.scoreImpact.quality || 0)),
        geo: Math.min(100, scores.geo + (finding.scoreImpact.geo || 0)),
      };
    },
    { quality: 82, geo: 76 },
  );
}

export function findingDecision(run: WorkflowRun | null, findingId: string) {
  return run?.decisions.find(item => item.findingId === findingId);
}

export function isFindingHandled(run: WorkflowRun | null, finding: ReviewFinding) {
  const decision = findingDecision(run, finding.id);
  if (!decision) return false;
  return finding.severity === 'critical' ? decision.decision === 'accepted' || decision.decision === 'manual' : true;
}

export function unresolvedFindings(run: WorkflowRun | null) {
  if (!run) return findings;
  return run.findings.filter(finding => !isFindingHandled(run, finding));
}

export function hasUnresolvedCritical(run: WorkflowRun | null) {
  return unresolvedFindings(run).some(finding => finding.severity === 'critical');
}

export function decideRunFinding(run: WorkflowRun, findingId: string, decision: DecisionKind, manualText?: string): WorkflowRun {
  const finding = run.findings.find(item => item.id === findingId);
  if (!finding || (finding.severity === 'critical' && decision === 'ignored')) return run;
  const nextDecision: HumanDecision = { findingId, decision, manualText, decidedAt: '2026-08-27T10:16:00+08:00' };
  const decisions = [...run.decisions.filter(item => item.findingId !== findingId), nextDecision];
  const article = decision === 'accepted' ? applyFinding(run.article, finding) : run.article;
  return { ...run, article, decisions, scores: calculateScores({ findings: run.findings, decisions }) };
}

export function editRunSection(run: WorkflowRun, sectionId: string, text: string): WorkflowRun {
  const article = { ...run.article, sections: run.article.sections.map(section => section.id === sectionId ? { ...section, text } : section) };
  let decisions = run.decisions;
  run.findings.filter(finding => finding.targetSectionId === sectionId).forEach(finding => {
    const manuallyResolved = !text.includes(finding.before) && text.includes(finding.after);
    const prior = decisions.find(item => item.findingId === finding.id);
    if (manuallyResolved && prior?.decision !== 'accepted') {
      decisions = [...decisions.filter(item => item.findingId !== finding.id), { findingId: finding.id, decision: 'manual', manualText: text, decidedAt: '2026-08-27T10:16:00+08:00' }];
    } else if (!manuallyResolved && prior?.decision === 'manual') {
      decisions = decisions.filter(item => item.findingId !== finding.id);
    }
  });
  return { ...run, article, decisions, scores: calculateScores({ findings: run.findings, decisions }) };
}

export function approveRunAsAsset(run: WorkflowRun): ContentAsset {
  const product = products.find(item => item.id === run.brief.productId) || products[0];
  const version = {
    id: 'phk-v2',
    label: 'V2',
    createdAt: '2026-08-27',
    article: clone(run.article),
    visualAssets: clone(run.visualAssets),
    sources: clone(product.documents),
    findings: clone(run.findings),
    decisions: clone(run.decisions),
    scores: { ...run.scores },
    lineage: clone(run.lineage),
    provenance: {
      mode: run.mode,
      runId: run.id,
      disclosure: run.mode === 'demo' ? '确定性演示输出；不是实时模型结果或真实业务绩效。' : '本地 Live Lab 输出；需结合运行日志和来源快照复核。',
    },
  } as const;
  const existing = seedAssets.find(asset => asset.id === 'asset-phk')!;
  return {
    ...clone(existing),
    title: run.article.title,
    status: '已通过',
    currentVersionId: version.id,
    updatedAt: '2026-08-27',
    owner: 'Demo Reviewer',
    versions: [...clone(existing.versions).filter(item => item.id !== version.id), version],
  };
}

export type DemoAction =
  | { type: 'HYDRATE'; state: DemoState }
  | { type: 'NAVIGATE'; view: View }
  | { type: 'SELECT_PRODUCT'; productId: string }
  | { type: 'UPDATE_BRIEF'; patch: Partial<ContentBrief> }
  | { type: 'SET_MODE'; mode: RunMode }
  | { type: 'SET_LIVE_STATUS'; status: DemoState['liveStatus']; message: string }
  | { type: 'RUN_CREATED'; run: WorkflowRun }
  | { type: 'RUN_EVENT'; event: WorkflowEvent }
  | { type: 'RUN_SYNC'; run: WorkflowRun }
  | { type: 'DECIDE_FINDING'; findingId: string; decision: DecisionKind }
  | { type: 'SELECT_FINDING'; findingId: string }
  | { type: 'SET_EDITING'; editing: boolean }
  | { type: 'EDIT_SECTION'; sectionId: string; text: string }
  | { type: 'APPROVE'; asset: ContentAsset }
  | { type: 'OPEN_SOURCE'; sourceId: string | null }
  | { type: 'CLEAR_MIGRATION_NOTICE' }
  | { type: 'RESET' };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'HYDRATE': return { ...action.state, hydrated: true };
    case 'NAVIGATE': return { ...state, view: action.view, sourceDetailId: null };
    case 'SELECT_PRODUCT': return { ...state, selectedProductId: action.productId };
    case 'UPDATE_BRIEF': return { ...state, brief: { ...state.brief, ...action.patch } };
    case 'SET_MODE': return { ...state, mode: action.mode };
    case 'SET_LIVE_STATUS': return { ...state, liveStatus: action.status, liveMessage: action.message };
    case 'RUN_CREATED': return { ...state, run: action.run, view: 'studio', editing: false, selectedFindingId: 'fact-material' };
    case 'RUN_EVENT': return !state.run || state.run.id !== action.event.runId ? state : { ...state, run: { ...state.run, status: action.event.status, stages: action.event.stages, error: action.event.error } };
    case 'RUN_SYNC': return { ...state, run: action.run };
    case 'DECIDE_FINDING': return state.run ? { ...state, run: decideRunFinding(state.run, action.findingId, action.decision) } : state;
    case 'SELECT_FINDING': return { ...state, selectedFindingId: action.findingId };
    case 'SET_EDITING': return { ...state, editing: action.editing };
    case 'EDIT_SECTION': return state.run ? { ...state, run: editRunSection(state.run, action.sectionId, action.text) } : state;
    case 'APPROVE': return { ...state, run: state.run ? { ...state.run, status: 'approved' } : state.run, assets: [action.asset, ...state.assets.filter(asset => asset.id !== action.asset.id)], editing: false };
    case 'OPEN_SOURCE': return { ...state, sourceDetailId: action.sourceId };
    case 'CLEAR_MIGRATION_NOTICE': return { ...state, migrationNotice: '' };
    case 'RESET': return { ...createInitialState(), hydrated: true };
    default: return state;
  }
}

export function migrateStoredState(raw: string | null): DemoState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as Partial<DemoState> & Record<string, unknown>;
    if (value.schemaVersion !== 4) {
      return { ...createInitialState(), migrationNotice: '案例已升级为灯饰五金 OEM，旧演示状态已安全重置。' };
    }
    const base = createInitialState();
    const selectedProductId = products.some(product => product.id === value.selectedProductId) ? value.selectedProductId! : 'phk-01';
    const savedMode = value.mode === 'live' && process.env.NEXT_PUBLIC_CONTENT_OPS_API_BASE ? 'live' : 'demo';
    return {
      ...base,
      ...value,
      schemaVersion: 4,
      mode: savedMode,
      selectedProductId,
      brief: { ...base.brief, ...(value.brief || {}) },
      assets: Array.isArray(value.assets) && value.assets.length ? value.assets : base.assets,
      sourceDetailId: null,
      editing: false,
      hydrated: false,
      migrationNotice: '',
    };
  } catch {
    return createInitialState();
  }
}

export function serializeState(state: DemoState) {
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    view: state.view,
    mode: state.mode,
    liveStatus: state.liveStatus,
    liveMessage: state.liveMessage,
    selectedProductId: state.selectedProductId,
    brief: state.brief,
    run: state.run,
    assets: state.assets,
    selectedFindingId: state.selectedFindingId,
  });
}
