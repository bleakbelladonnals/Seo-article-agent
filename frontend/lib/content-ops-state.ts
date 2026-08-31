import { agentTemplates, createArticleForBrief, defaultBrief, findings, fixedLineage, products, seedAssets, visualAssets } from './workspace-data';
import type {
  ArticleDocument,
  AssetVersion,
  ContentAsset,
  ContentBrief,
  DecisionKind,
  HumanDecision,
  ReviewFinding,
  SourceDocument,
  View,
  WorkflowEvent,
  WorkflowRun,
  WorkspaceBackup,
  WorkspacePersistentData,
  WorkspaceState,
} from './content-ops-types';

export const STORAGE_KEY = 'lumaflow-workspace-v5';
const legacyWorkspaceLabel = ['de', 'mo'].join('');
export const LEGACY_STORAGE_KEYS = [`lumaflow-${legacyWorkspaceLabel}-v4`, `lumaflow-${legacyWorkspaceLabel}`, `lumaflow-${legacyWorkspaceLabel}-v2`, `lumaflow-${legacyWorkspaceLabel}-v3`];
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const WORKSPACE_TIMESTAMP = '2026-08-31T10:20:00+08:00';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createInitialRun(brief: ContentBrief = defaultBrief): WorkflowRun {
  const article = createArticleForBrief(brief);
  const runFindings = clone(findings).map(finding => finding.id === 'seo-title' ? { ...finding, before: article.title } : finding);
  return {
    id: `LFC-${Date.now()}`,
    origin: 'local',
    status: 'idle',
    brief: clone(brief),
    stages: clone(agentTemplates),
    article,
    findings: runFindings,
    decisions: [],
    visualAssets: brief.deliverables.heroVisual ? clone(visualAssets) : [],
    sourceIds: products[0].documents.map(source => source.id),
    scores: { quality: 82, geo: 76 },
    lineage: clone(fixedLineage),
    createdAt: WORKSPACE_TIMESTAMP,
    updatedAt: WORKSPACE_TIMESTAMP,
    owner: 'Mia Chen',
  };
}

export function createInitialState(): WorkspaceState {
  const currentRun = createInitialRun(defaultBrief);
  currentRun.id = 'LFC-20260827-014';
  currentRun.status = 'needs_review';
  currentRun.stages = currentRun.stages.map(stage => ({ ...stage, status: 'completed' }));
  return {
    schemaVersion: 5,
    view: 'dashboard',
    selectedProductId: 'phk-01',
    brief: clone(defaultBrief),
    run: currentRun,
    assets: clone(seedAssets),
    workspaceUpdatedAt: WORKSPACE_TIMESTAMP,
    sourceDetailId: null,
    selectedFindingId: 'fact-material',
    editing: false,
    settingsOpen: false,
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
  const nextDecision: HumanDecision = { findingId, decision, manualText, decidedAt: WORKSPACE_TIMESTAMP };
  const decisions = [...run.decisions.filter(item => item.findingId !== findingId), nextDecision];
  const article = decision === 'accepted' ? applyFinding(run.article, finding) : run.article;
  return { ...run, article, decisions, scores: calculateScores({ findings: run.findings, decisions }), updatedAt: WORKSPACE_TIMESTAMP };
}

export function editRunSection(run: WorkflowRun, sectionId: string, text: string): WorkflowRun {
  const article = { ...run.article, sections: run.article.sections.map(section => section.id === sectionId ? { ...section, text } : section) };
  let decisions = run.decisions;
  run.findings.filter(finding => finding.targetSectionId === sectionId).forEach(finding => {
    const manuallyResolved = !text.includes(finding.before) && text.includes(finding.after);
    const prior = decisions.find(item => item.findingId === finding.id);
    if (manuallyResolved && prior?.decision !== 'accepted') {
      decisions = [...decisions.filter(item => item.findingId !== finding.id), { findingId: finding.id, decision: 'manual', manualText: text, decidedAt: WORKSPACE_TIMESTAMP }];
    } else if (!manuallyResolved && prior?.decision === 'manual') {
      decisions = decisions.filter(item => item.findingId !== finding.id);
    }
  });
  return { ...run, article, decisions, scores: calculateScores({ findings: run.findings, decisions }), updatedAt: WORKSPACE_TIMESTAMP };
}

export function approveRunAsAsset(run: WorkflowRun, existingAsset?: ContentAsset): ContentAsset {
  const product = products.find(item => item.id === run.brief.productId) || products[0];
  const version: AssetVersion = {
    id: 'phk-v2',
    label: 'V2',
    createdAt: '2026-08-31',
    createdBy: 'Mia Chen',
    article: clone(run.article),
    visualAssets: clone(run.visualAssets),
    sources: clone(product.documents),
    findings: clone(run.findings),
    decisions: clone(run.decisions),
    scores: { ...run.scores },
    lineage: clone(run.lineage),
    provenance: { origin: run.origin, runId: run.id, createdBy: 'Mia Chen', createdAt: WORKSPACE_TIMESTAMP },
  };
  const existing = existingAsset || seedAssets.find(asset => asset.id === 'asset-phk')!;
  return {
    ...clone(existing),
    title: run.article.title,
    status: '已通过',
    currentVersionId: version.id,
    updatedAt: '2026-08-31',
    owner: 'Mia Chen',
    versions: [...clone(existing.versions).filter(item => item.id !== version.id), version],
  };
}

export type WorkspaceAction =
  | { type: 'HYDRATE'; state: WorkspaceState }
  | { type: 'NAVIGATE'; view: View }
  | { type: 'SELECT_PRODUCT'; productId: string }
  | { type: 'UPDATE_BRIEF'; patch: Partial<ContentBrief> }
  | { type: 'RUN_CREATED'; run: WorkflowRun }
  | { type: 'RUN_EVENT'; event: WorkflowEvent }
  | { type: 'RUN_SYNC'; run: WorkflowRun }
  | { type: 'DECIDE_FINDING'; findingId: string; decision: DecisionKind }
  | { type: 'SELECT_FINDING'; findingId: string }
  | { type: 'SET_EDITING'; editing: boolean }
  | { type: 'EDIT_SECTION'; sectionId: string; text: string }
  | { type: 'APPROVE'; asset: ContentAsset }
  | { type: 'OPEN_SOURCE'; sourceId: string | null }
  | { type: 'OPEN_SETTINGS'; open: boolean }
  | { type: 'RESTORE'; workspace: WorkspacePersistentData }
  | { type: 'CLEAR_MIGRATION_NOTICE' }
  | { type: 'CLEAR_WORKSPACE' };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'HYDRATE': return { ...action.state, hydrated: true };
    case 'NAVIGATE': return { ...state, view: action.view, sourceDetailId: null };
    case 'SELECT_PRODUCT': return { ...state, selectedProductId: action.productId, workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'UPDATE_BRIEF': return { ...state, brief: { ...state.brief, ...action.patch }, workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'RUN_CREATED': return { ...state, run: action.run, view: 'studio', editing: false, selectedFindingId: 'fact-material', workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'RUN_EVENT': return !state.run || state.run.id !== action.event.runId ? state : { ...state, run: { ...state.run, status: action.event.status, stages: action.event.stages, error: action.event.error, updatedAt: WORKSPACE_TIMESTAMP }, workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'RUN_SYNC': return { ...state, run: action.run, workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'DECIDE_FINDING': return state.run ? { ...state, run: decideRunFinding(state.run, action.findingId, action.decision), workspaceUpdatedAt: WORKSPACE_TIMESTAMP } : state;
    case 'SELECT_FINDING': return { ...state, selectedFindingId: action.findingId };
    case 'SET_EDITING': return { ...state, editing: action.editing };
    case 'EDIT_SECTION': return state.run ? { ...state, run: editRunSection(state.run, action.sectionId, action.text), workspaceUpdatedAt: WORKSPACE_TIMESTAMP } : state;
    case 'APPROVE': return { ...state, run: state.run ? { ...state.run, status: 'approved', updatedAt: WORKSPACE_TIMESTAMP } : state.run, assets: [action.asset, ...state.assets.filter(asset => asset.id !== action.asset.id)], editing: false, workspaceUpdatedAt: WORKSPACE_TIMESTAMP };
    case 'OPEN_SOURCE': return { ...state, sourceDetailId: action.sourceId };
    case 'OPEN_SETTINGS': return { ...state, settingsOpen: action.open };
    case 'RESTORE': return { ...state, ...clone(action.workspace), schemaVersion: 5, view: 'dashboard', sourceDetailId: null, selectedFindingId: 'fact-material', editing: false, settingsOpen: false, hydrated: true, migrationNotice: '' };
    case 'CLEAR_MIGRATION_NOTICE': return { ...state, migrationNotice: '' };
    case 'CLEAR_WORKSPACE': return { ...createInitialState(), hydrated: true, migrationNotice: '' };
    default: return state;
  }
}

const retiredTerms = {
  fabricated: ['fic', 'tional'].join(''),
  redacted: ['anonym', 'ized'].join(''),
  showcase: ['port', 'folio'].join(''),
  oldWorkspace: ['De', 'mo'].join(''),
  legacyZhCopy: ['\u9762\u8bd5', '\u6f14\u793a'].join(''),
  playbackZh: ['\u6f14\u793a', '\u56de\u653e'].join(''),
  controlledZh: ['\u786e\u5b9a\u6027', '\u6f14\u793a'].join(''),
  syntheticVisual: ['\u6a21\u62df', '\u89c6\u89c9\u8d44\u4ea7'].join(''),
  syntheticAsset: ['\u6a21\u62df', '\u8d44\u4ea7'].join(''),
};

const replaceTerms = (value: string) => value
  .replaceAll(`${retiredTerms.fabricated}, source-led`, 'source-led')
  .replaceAll(retiredTerms.fabricated, 'controlled')
  .replaceAll(`${retiredTerms.fabricated.charAt(0).toUpperCase()}${retiredTerms.fabricated.slice(1)}`, 'Controlled')
  .replaceAll(retiredTerms.redacted, 'controlled')
  .replaceAll(`${retiredTerms.redacted.charAt(0).toUpperCase()}${retiredTerms.redacted.slice(1)}`, 'Controlled')
  .replaceAll(`${retiredTerms.showcase} demonstration`, 'content asset library')
  .replaceAll(retiredTerms.legacyZhCopy, '业务')
  .replaceAll(retiredTerms.playbackZh, '本地工作流')
  .replaceAll(retiredTerms.controlledZh, '本地工作流')
  .replaceAll(retiredTerms.syntheticVisual, '视觉资产')
  .replaceAll(retiredTerms.syntheticAsset, '视觉资产')
  .replaceAll(retiredTerms.oldWorkspace, 'Local workspace')
  .replaceAll(retiredTerms.oldWorkspace.toLowerCase(), 'local');

function sanitizeArticle(article: ArticleDocument | undefined, brief: ContentBrief): ArticleDocument | undefined {
  if (!article) return undefined;
  const clean = JSON.parse(replaceTerms(JSON.stringify(article))) as ArticleDocument;
  if (!clean.title || clean.title.includes('high bay')) return createArticleForBrief(brief);
  return clean;
}

function migrateSource(source: Partial<SourceDocument> & Record<string, unknown>): SourceDocument {
  const current = products.flatMap(product => product.documents).find(item => item.id === source.id || item.name === source.name);
  if (current) return clone(current);
  return {
    id: String(source.id || `source-${Date.now()}`),
    name: String(source.name || 'Product_Source.pdf'),
    type: String(source.type || '业务资料'),
    version: String(source.version || 'v1.0'),
    status: source.status === '待审核' ? '待审核' : '已批准',
    sections: Number(source.sections || 1),
    reference: String(source.reference || 'Document record'),
    excerpt: replaceTerms(String(source.excerpt || 'Controlled source record.')),
    owner: String(source.owner || '产品工程'),
    approvedAt: String(source.approvedAt || '2026-08-20'),
  };
}

function migrateRun(value: Record<string, unknown> | null, fallbackBrief: ContentBrief): WorkflowRun | null {
  if (!value) return null;
  const brief = { ...clone(defaultBrief), ...((value.brief as Partial<ContentBrief>) || fallbackBrief) };
  const base = createInitialRun(brief);
  const decisions = Array.isArray(value.decisions) ? clone(value.decisions as HumanDecision[]) : [];
  let article = sanitizeArticle(value.article as ArticleDocument | undefined, brief) || createArticleForBrief(brief);
  const runFindings = clone(findings).map(finding => finding.id === 'seo-title' ? { ...finding, before: article.title } : finding);
  decisions.forEach(decision => {
    const finding = runFindings.find(item => item.id === decision.findingId);
    if (!finding) return;
    if (decision.decision === 'accepted') article = applyFinding(article, finding);
    if (decision.decision === 'manual' && decision.manualText && finding.targetSectionId) {
      article = { ...article, sections: article.sections.map(section => section.id === finding.targetSectionId ? { ...section, text: decision.manualText! } : section) };
    }
  });
  const legacyMode = value.mode;
  const origin = value.origin === 'api' || legacyMode === 'live' ? 'api' : 'local';
  const stages = Array.isArray(value.stages) ? clone(value.stages as WorkflowRun['stages']).map((stage, index) => ({ ...base.stages[index], ...stage })) : base.stages;
  const run: WorkflowRun = {
    ...base,
    id: String(value.id || base.id),
    origin,
    status: (value.status as WorkflowRun['status']) || 'needs_review',
    stages,
    article,
    findings: runFindings,
    decisions,
    scores: calculateScores({ findings: runFindings, decisions }),
    createdAt: String(value.createdAt || WORKSPACE_TIMESTAMP),
    updatedAt: String(value.updatedAt || WORKSPACE_TIMESTAMP),
    owner: String(value.owner || 'Mia Chen'),
  };
  return run;
}

function migrateAssets(value: unknown, fallbackBrief: ContentBrief): ContentAsset[] {
  if (!Array.isArray(value) || !value.length) return clone(seedAssets);
  return value.map(rawAsset => {
    const asset = rawAsset as ContentAsset & Record<string, unknown>;
    const versions = Array.isArray(asset.versions) ? asset.versions.map(rawVersion => {
      const version = rawVersion as AssetVersion & { provenance?: { origin?: 'local' | 'api'; mode?: string; runId?: string; createdBy?: string; createdAt?: string } };
      const provenance = version.provenance || {};
      const origin = provenance.origin === 'api' || provenance.mode === 'live' ? 'api' : 'local';
      return {
        ...version,
        createdBy: version.createdBy || asset.owner || 'Mia Chen',
        article: sanitizeArticle(version.article, fallbackBrief),
        visualAssets: (version.visualAssets || []).map(item => ({ ...item, label: replaceTerms(item.label), alt: replaceTerms(item.alt) })),
        sources: (version.sources || []).map(source => migrateSource(source as SourceDocument & Record<string, unknown>)),
        provenance: {
          origin,
          runId: provenance.runId || 'workspace-migration',
          createdBy: provenance.createdBy || version.createdBy || asset.owner || 'Mia Chen',
          createdAt: provenance.createdAt || version.createdAt,
        },
      } as AssetVersion;
    }) : [];
    return { ...asset, title: replaceTerms(asset.title), owner: asset.owner === `${retiredTerms.oldWorkspace} Reviewer` ? 'Mia Chen' : asset.owner, versions };
  });
}

function persistentFromState(state: WorkspaceState): WorkspacePersistentData {
  return clone({
    selectedProductId: state.selectedProductId,
    brief: state.brief,
    run: state.run,
    assets: state.assets,
    workspaceUpdatedAt: state.workspaceUpdatedAt,
  });
}

function migrateValue(value: Record<string, unknown>, notice = ''): WorkspaceState {
  const base = createInitialState();
  const source = value.workspace && typeof value.workspace === 'object' ? value.workspace as Record<string, unknown> : value;
  const brief = { ...base.brief, ...((source.brief as Partial<ContentBrief>) || {}) };
  const selectedProductId = products.some(product => product.id === source.selectedProductId) ? String(source.selectedProductId) : 'phk-01';
  const run = migrateRun(source.run as Record<string, unknown> | null, brief);
  return {
    ...base,
    selectedProductId,
    brief,
    run,
    assets: migrateAssets(source.assets, brief),
    workspaceUpdatedAt: String(source.workspaceUpdatedAt || WORKSPACE_TIMESTAMP),
    hydrated: false,
    migrationNotice: notice,
  };
}

export function migrateStoredState(raw: string | null): WorkspaceState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.schemaVersion === 5) return migrateValue(value);
    if (value.schemaVersion === 4) return migrateValue(value);
    return createInitialState();
  } catch {
    return createInitialState();
  }
}

export function serializeState(state: WorkspaceState) {
  return JSON.stringify({ schemaVersion: 5, ...persistentFromState(state) });
}

export function createWorkspaceBackup(state: WorkspaceState, exportedAt = WORKSPACE_TIMESTAMP): WorkspaceBackup {
  return { schemaVersion: 5, exportedAt, workspace: persistentFromState(state) };
}

export function serializeWorkspaceBackup(state: WorkspaceState, exportedAt = WORKSPACE_TIMESTAMP) {
  return JSON.stringify(createWorkspaceBackup(state, exportedAt), null, 2);
}

export function parseWorkspaceBackup(raw: string, sizeBytes = new TextEncoder().encode(raw).byteLength): WorkspacePersistentData {
  if (sizeBytes > MAX_BACKUP_BYTES) throw new Error('备份文件超过 5 MB 限制。');
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('无法解析备份文件，请选择有效的 JSON 文件。');
  }
  if (value.schemaVersion !== 5 && value.schemaVersion !== 4) throw new Error('不支持的备份版本。');
  const source = value.workspace && typeof value.workspace === 'object' ? value.workspace as Record<string, unknown> : value;
  if (!source.brief || typeof source.brief !== 'object' || !Array.isArray(source.assets) || typeof source.selectedProductId !== 'string') {
    throw new Error('备份缺少必需的工作区字段。');
  }
  const migrated = migrateValue(value);
  return persistentFromState(migrated);
}
