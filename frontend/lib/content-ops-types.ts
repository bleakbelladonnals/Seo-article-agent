export type View = 'dashboard' | 'knowledge' | 'studio' | 'review' | 'assets';
export type ExecutionOrigin = 'local' | 'api';
export type WorkflowStatus = 'idle' | 'queued' | 'analyzing' | 'strategizing' | 'writing' | 'visualizing' | 'reviewing' | 'needs_review' | 'approved' | 'failed';
export type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed';
export type ProductReadiness = '生产就绪' | '待补资料' | '待质量审核';

export type SourceDocument = {
  id: string;
  name: string;
  type: string;
  version: string;
  status: '已批准' | '待审核';
  sections: number;
  reference: string;
  excerpt: string;
  owner: string;
  approvedAt: string;
};

export type BomNode = {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  level: 'kit' | 'assembly' | 'component' | 'packaging';
  material: string;
  finish: string;
  source: string;
  children?: BomNode[];
};

export type ProcessStep = {
  id: string;
  order: number;
  name: string;
  mode: '内部' | '合作' | '内部/合作';
  boundary: string;
  output: string;
};

export type ProductKnowledgeRecord = {
  knowledgeVersion: string;
  bomVersion: string;
  finishSample: string;
  verifiedAt: string;
  owner: string;
  bom: BomNode[];
  processRoute: ProcessStep[];
  includedScope: string[];
  excludedScope: string[];
  gaps: string[];
};

export type Product = {
  id: string;
  name: string;
  model: string;
  category: string;
  status: ProductReadiness;
  completeness: number;
  market: string;
  description: string;
  accent: string;
  imageUrl: string;
  imagePosition?: string;
  workflowAvailable: boolean;
  workflowNote: string;
  specs: { label: string; value: string; verified: boolean; source: string }[];
  applications: string[];
  keywords: { keyword: string; intent: string; priority: '高' | '中' }[];
  documents: SourceDocument[];
  knowledge: ProductKnowledgeRecord;
};

export type ContentBrief = {
  productId: string;
  contentType: 'sourcing-guide';
  keyword: string;
  market: 'global' | 'north-america' | 'europe';
  language: 'en';
  audience: string;
  deliverables: { article: boolean; heroVisual: boolean; faq: boolean };
};

export type ArticleSection = {
  id: string;
  heading: string;
  kind: 'lead' | 'paragraph' | 'takeaways' | 'comparison' | 'steps' | 'checklist' | 'faq' | 'cta';
  text: string;
  items?: string[];
  rows?: { label: string; value: string; implication: string }[];
  faqs?: { question: string; answer: string }[];
};

export type ArticleDocument = { title: string; dek: string; sections: ArticleSection[] };
export type ScoreImpact = { quality?: number; geo?: number };

export type ReviewFinding = {
  id: string;
  type: 'fact' | 'seo' | 'geo' | 'brand';
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  detail: string;
  source?: string;
  targetSectionId?: string;
  before: string;
  after: string;
  scoreImpact: ScoreImpact;
};

export type DecisionKind = 'accepted' | 'ignored' | 'manual';
export type HumanDecision = { findingId: string; decision: DecisionKind; decidedAt: string; manualText?: string };

export type VisualAsset = {
  id: string;
  title: string;
  format: 'hero' | 'diagram' | 'swatch' | 'flow';
  label: string;
  alt: string;
  caption: string;
  accent: string;
  motif: 'product' | 'bom' | 'finish' | 'lineage';
  imageUrl?: string;
};

export type PromptContract = {
  agentId: string;
  promptVersion: string;
  schemaVersion: string;
  inputSummary: string;
  outputSchema: string;
  modelRoute: string;
};

export type AgentRun = PromptContract & {
  id: string;
  name: string;
  role: string;
  durationLabel: string;
  summary: string;
  evidence: string;
  status: AgentStatus;
};

export type ModelEvaluation = {
  id: string;
  model: string;
  score: number;
  routingRole: string;
  dimensions: { fact: number; schema: number; retrieval: number; bilingual: number; latency: number; cost: number; stability: number };
};

export type OperationsMetric = { id: string; label: string; before: string; after: string; result: string; sample: string; formula: string };

export type OperationsSnapshot = {
  label: string;
  evaluationSet: string;
  metrics: OperationsMetric[];
  modelEvaluations: ModelEvaluation[];
  promptContracts: PromptContract[];
};

export type RunLineage = {
  knowledgeVersion: string;
  bomVersion: string;
  finishSample: string;
  sourceIds: string[];
  promptContracts: PromptContract[];
  modelRoutes: string[];
  evaluationSnapshot: string;
};

export type ScoreSummary = { quality: number; geo: number };

export type WorkflowRun = {
  id: string;
  origin: ExecutionOrigin;
  status: WorkflowStatus;
  brief: ContentBrief;
  stages: AgentRun[];
  article: ArticleDocument;
  findings: ReviewFinding[];
  decisions: HumanDecision[];
  visualAssets: VisualAsset[];
  sourceIds: string[];
  scores: ScoreSummary;
  lineage: RunLineage;
  createdAt: string;
  updatedAt: string;
  owner: string;
  error?: string;
};

export type WorkflowEvent = { runId: string; status: WorkflowStatus; stages: AgentRun[]; detail: string; error?: string };

export type AssetVersion = {
  id: string;
  label: string;
  createdAt: string;
  createdBy: string;
  article?: ArticleDocument;
  visualAssets: VisualAsset[];
  sources: SourceDocument[];
  findings: ReviewFinding[];
  decisions: HumanDecision[];
  scores: ScoreSummary;
  lineage: RunLineage;
  provenance: { origin: ExecutionOrigin; runId: string; createdBy: string; createdAt: string };
};

export type ContentAsset = {
  id: string;
  productId: string;
  product: string;
  title: string;
  type: 'article' | 'visual';
  typeLabel: string;
  status: '已通过' | '审核中' | '草稿';
  currentVersionId: string;
  updatedAt: string;
  owner: string;
  color: string;
  versions: AssetVersion[];
};

export type WorkspaceState = {
  schemaVersion: 5;
  view: View;
  selectedProductId: string;
  brief: ContentBrief;
  run: WorkflowRun | null;
  assets: ContentAsset[];
  workspaceUpdatedAt: string;
  sourceDetailId: string | null;
  selectedFindingId: string;
  editing: boolean;
  settingsOpen: boolean;
  hydrated: boolean;
  migrationNotice: string;
};

export type WorkspacePersistentData = Pick<WorkspaceState, 'selectedProductId' | 'brief' | 'run' | 'assets' | 'workspaceUpdatedAt'>;
export type WorkspaceBackup = { schemaVersion: 5; exportedAt: string; workspace: WorkspacePersistentData };

export type ExportFormat = 'markdown' | 'html' | 'json';
export type ExportResult = { fileName: string; mimeType: string; content: string | Blob };
export type ServiceHealth = { ok: boolean; origin: ExecutionOrigin; message: string; capabilities: string[] };
