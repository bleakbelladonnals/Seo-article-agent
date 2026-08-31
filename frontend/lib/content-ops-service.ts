import { seedAssets } from './workspace-data';
import { approveRunAsAsset, createInitialRun, decideRunFinding, hasUnresolvedCritical } from './content-ops-state';
import { exportAssetVersion } from './export-utils';
import type {
  ContentAsset,
  ContentBrief,
  DecisionKind,
  ExportFormat,
  ExportResult,
  ServiceHealth,
  WorkflowEvent,
  WorkflowRun,
  WorkflowStatus,
} from './content-ops-types';

export interface ContentOpsService {
  health(): Promise<ServiceHealth>;
  createRun(brief: ContentBrief): Promise<WorkflowRun>;
  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void): () => void;
  getRun(runId: string): Promise<WorkflowRun>;
  decideFinding(runId: string, findingId: string, decision: DecisionKind, manualText?: string): Promise<WorkflowRun>;
  approveRun(runId: string): Promise<ContentAsset>;
  exportAsset(assetId: string, versionId: string, format: ExportFormat): Promise<ExportResult>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const stageStatuses: WorkflowStatus[] = ['analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing'];

export class LocalContentOpsService implements ContentOpsService {
  private runs = new Map<string, WorkflowRun>();
  private assets = clone(seedAssets);
  private nextId = 15;

  async health(): Promise<ServiceHealth> {
    return {
      ok: true,
      origin: 'local',
      message: '本地工作流服务正常',
      capabilities: ['workflow-events', 'review-decisions', 'versioned-assets', 'exports'],
    };
  }

  syncAssets(assets: ContentAsset[]) {
    this.assets = clone(assets);
  }

  syncRun(run: WorkflowRun) {
    this.runs.set(run.id, clone(run));
  }

  restoreRun(run: WorkflowRun) {
    this.runs.set(run.id, clone(run));
  }

  async createRun(brief: ContentBrief): Promise<WorkflowRun> {
    if (brief.productId !== 'phk-01') throw new Error('当前产品资料尚未达到生产就绪状态。');
    const run = createInitialRun(brief);
    run.id = `LFC-20260831-${String(this.nextId++).padStart(3, '0')}`;
    run.status = 'queued';
    this.runs.set(run.id, clone(run));
    return clone(run);
  }

  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void) {
    const initial = this.runs.get(runId);
    if (!initial) throw new Error(`Unknown run: ${runId}`);
    let cancelled = false;
    let stageIndex = initial.stages.filter(stage => stage.status === 'completed').length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const emit = (event: WorkflowEvent) => {
      if (!cancelled) onEvent(clone(event));
    };

    const advance = () => {
      if (cancelled) return;
      const stored = this.runs.get(runId);
      if (!stored) return;
      if (stageIndex >= stored.stages.length) {
        const stages = stored.stages.map(stage => ({ ...stage, status: 'completed' as const }));
        const next = { ...stored, status: 'needs_review' as const, stages, error: undefined };
        this.runs.set(runId, next);
        emit({ runId, status: 'needs_review', stages, detail: '内容包已生成，等待人工审核。' });
        return;
      }
      const status = stageStatuses[stageIndex];
      const stages = stored.stages.map((stage, index) => ({
        ...stage,
        status: index < stageIndex ? 'completed' as const : index === stageIndex ? 'running' as const : 'waiting' as const,
      }));
      this.runs.set(runId, { ...stored, status, stages, error: undefined });
      emit({ runId, status, stages, detail: stages[stageIndex].summary });
      stageIndex += 1;
      timers.push(setTimeout(advance, 260));
    };

    emit({ runId, status: initial.status, stages: initial.stages, detail: '任务已进入本地工作流队列。' });
    timers.push(setTimeout(advance, 120));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }

  async getRun(runId: string): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    return clone(run);
  }

  async decideFinding(runId: string, findingId: string, decision: DecisionKind, manualText?: string): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    const next = decideRunFinding(run, findingId, decision, manualText);
    this.runs.set(runId, next);
    return clone(next);
  }

  async approveRun(runId: string): Promise<ContentAsset> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    if (hasUnresolvedCritical(run)) throw new Error('仍有关键事实问题未处理，无法批准。');
    const approved = { ...run, status: 'approved' as const };
    this.runs.set(runId, approved);
    const existing = this.assets.find(item => item.id === 'asset-phk');
    const asset = approveRunAsAsset(approved, existing);
    this.assets = [asset, ...this.assets.filter(item => item.id !== asset.id)];
    return clone(asset);
  }

  async exportAsset(assetId: string, versionId: string, format: ExportFormat): Promise<ExportResult> {
    const asset = this.assets.find(item => item.id === assetId);
    if (!asset) throw new Error(`Unknown asset: ${assetId}`);
    return exportAssetVersion(asset, versionId, format);
  }
}

export class HttpContentOpsService implements ContentOpsService {
  constructor(private readonly baseUrl: string) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(this.url(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    if (!response.ok) throw new Error(`Content Ops API returned ${response.status}.`);
    return response.json() as Promise<T>;
  }

  async health() {
    return this.json<ServiceHealth>('/api/v2/health');
  }

  async createRun(brief: ContentBrief) {
    return this.json<WorkflowRun>('/api/v2/content-runs', { method: 'POST', body: JSON.stringify({ brief }) });
  }

  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void) {
    const events = new EventSource(this.url(`/api/v2/content-runs/${encodeURIComponent(runId)}/events`));
    events.onmessage = message => onEvent(JSON.parse(message.data) as WorkflowEvent);
    events.onerror = () => {
      onEvent({ runId, status: 'failed', stages: [], detail: '任务事件流已断开。', error: '无法继续接收任务进度。' });
      events.close();
    };
    return () => events.close();
  }

  async getRun(runId: string) {
    return this.json<WorkflowRun>(`/api/v2/content-runs/${encodeURIComponent(runId)}`);
  }

  async decideFinding(runId: string, findingId: string, decision: DecisionKind, manualText?: string) {
    return this.json<WorkflowRun>(`/api/v2/content-runs/${encodeURIComponent(runId)}/findings/${encodeURIComponent(findingId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, manualText }),
    });
  }

  async approveRun(runId: string) {
    return this.json<ContentAsset>(`/api/v2/content-runs/${encodeURIComponent(runId)}/approve`, { method: 'POST' });
  }

  async exportAsset(assetId: string, versionId: string, format: ExportFormat): Promise<ExportResult> {
    const response = await fetch(this.url(`/api/v2/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/export?format=${format}`));
    if (!response.ok) throw new Error(`Content Ops API export returned ${response.status}.`);
    return {
      fileName: response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || `${assetId}.${format}`,
      mimeType: response.headers.get('content-type') || 'application/octet-stream',
      content: await response.blob(),
    };
  }
}

export function createServices() {
  const local = new LocalContentOpsService();
  const baseUrl = process.env.NEXT_PUBLIC_CONTENT_OPS_API_BASE || '';
  return { local, api: baseUrl ? new HttpContentOpsService(baseUrl) : null };
}
