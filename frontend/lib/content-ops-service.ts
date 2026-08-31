import { agentTemplates, findings, fixedLineage, initialArticle, products, seedAssets, visualAssets } from './demo-data';
import { approveRunAsAsset, calculateScores, decideRunFinding, hasUnresolvedCritical } from './content-ops-state';
import { exportAssetVersion } from './export-utils';
import type {
  ContentAsset,
  ContentBrief,
  CreateRunOptions,
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
  createRun(brief: ContentBrief, options?: CreateRunOptions): Promise<WorkflowRun>;
  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void): () => void;
  getRun(runId: string): Promise<WorkflowRun>;
  decideFinding(runId: string, findingId: string, decision: DecisionKind, manualText?: string): Promise<WorkflowRun>;
  approveRun(runId: string): Promise<ContentAsset>;
  exportAsset(assetId: string, versionId: string, format: ExportFormat): Promise<ExportResult>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const stageStatuses: WorkflowStatus[] = ['analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing'];

type StoredRun = {
  run: WorkflowRun;
  options: CreateRunOptions;
};

export class MockContentOpsService implements ContentOpsService {
  private runs = new Map<string, StoredRun>();
  private assets = clone(seedAssets);
  private nextId = 1;

  async health(): Promise<ServiceHealth> {
    return {
      ok: true,
      mode: 'demo',
      message: '确定性模拟服务可用',
      capabilities: ['workflow-events', 'review-decisions', 'versioned-assets', 'exports'],
    };
  }

  syncAssets(assets: ContentAsset[]) {
    this.assets = clone(assets);
  }

  syncRun(run: WorkflowRun) {
    const stored = this.runs.get(run.id);
    if (stored) stored.run = clone(run);
    else this.runs.set(run.id, { run: clone(run), options: {} });
  }

  restoreRun(run: WorkflowRun) {
    this.runs.set(run.id, { run: clone(run), options: {} });
  }

  async createRun(brief: ContentBrief, options: CreateRunOptions = {}): Promise<WorkflowRun> {
    if (brief.productId !== 'phk-01') throw new Error('本轮只有 Aurelia PHK-01 配置了完整工作流。');
    const run: WorkflowRun = {
      id: `demo-run-${this.nextId++}`,
      mode: 'demo',
      status: 'queued',
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
    this.runs.set(run.id, { run, options });
    return clone(run);
  }

  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void) {
    const stored = this.runs.get(runId);
    if (!stored) throw new Error(`Unknown run: ${runId}`);
    let cancelled = false;
    let stageIndex = stored.run.stages.filter(stage => stage.status === 'completed').length;
    const delay = stored.options.quick ? 90 : 720;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const emit = (event: WorkflowEvent) => {
      if (!cancelled) onEvent(clone(event));
    };

    const advance = () => {
      if (cancelled) return;
      if (stored.options.failOnce && stageIndex === 2) {
        const stages = stored.run.stages.map((stage, index) => ({
          ...stage,
          status: index < stageIndex ? 'completed' as const : index === stageIndex ? 'failed' as const : 'waiting' as const,
        }));
        stored.run = { ...stored.run, status: 'failed', stages, error: '模拟模型网关暂时不可用。此次失败用于验证重试、异常说明与 Demo 兜底。' };
        emit({ runId, status: 'failed', stages, detail: '生成失败', error: stored.run.error });
        return;
      }
      if (stageIndex >= stored.run.stages.length) {
        const stages = stored.run.stages.map(stage => ({ ...stage, status: 'completed' as const }));
        stored.run = { ...stored.run, status: 'needs_review', stages, error: undefined };
        emit({ runId, status: 'needs_review', stages, detail: '内容包已生成，等待人工审核。' });
        return;
      }
      const status = stageStatuses[stageIndex];
      const stages = stored.run.stages.map((stage, index) => ({
        ...stage,
        status: index < stageIndex ? 'completed' as const : index === stageIndex ? 'running' as const : 'waiting' as const,
      }));
      stored.run = { ...stored.run, status, stages, error: undefined };
      emit({ runId, status, stages, detail: stages[stageIndex].summary });
      stageIndex += 1;
      timers.push(setTimeout(advance, delay));
    };

    emit({ runId, status: stored.run.status, stages: stored.run.stages, detail: '任务已进入确定性模拟队列。' });
    timers.push(setTimeout(advance, stored.options.quick ? 20 : 240));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }

  async getRun(runId: string): Promise<WorkflowRun> {
    const stored = this.runs.get(runId);
    if (!stored) throw new Error(`Unknown run: ${runId}`);
    return clone(stored.run);
  }

  async decideFinding(runId: string, findingId: string, decision: DecisionKind, manualText?: string): Promise<WorkflowRun> {
    const stored = this.runs.get(runId);
    if (!stored) throw new Error(`Unknown run: ${runId}`);
    stored.run = decideRunFinding(stored.run, findingId, decision, manualText);
    stored.run.scores = calculateScores(stored.run);
    return clone(stored.run);
  }

  async approveRun(runId: string): Promise<ContentAsset> {
    const stored = this.runs.get(runId);
    if (!stored) throw new Error(`Unknown run: ${runId}`);
    if (hasUnresolvedCritical(stored.run)) throw new Error('关键事实冲突尚未解决。');
    stored.run = { ...stored.run, status: 'approved' };
    const asset = approveRunAsAsset(stored.run);
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
    if (!response.ok) throw new Error(`Live Lab returned ${response.status}.`);
    return response.json() as Promise<T>;
  }

  async health() {
    return this.json<ServiceHealth>('/api/v2/health');
  }

  async createRun(brief: ContentBrief, options: CreateRunOptions = {}) {
    return this.json<WorkflowRun>('/api/v2/content-runs', { method: 'POST', body: JSON.stringify({ brief, options }) });
  }

  subscribeToRun(runId: string, onEvent: (event: WorkflowEvent) => void) {
    const events = new EventSource(this.url(`/api/v2/content-runs/${encodeURIComponent(runId)}/events`));
    events.onmessage = message => onEvent(JSON.parse(message.data) as WorkflowEvent);
    events.onerror = () => {
      onEvent({ runId, status: 'failed', stages: [], detail: 'Live Lab 事件流已断开。', error: '无法继续接收任务进度。' });
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
    if (!response.ok) throw new Error(`Live Lab export returned ${response.status}.`);
    return {
      fileName: response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || `${assetId}.${format}`,
      mimeType: response.headers.get('content-type') || 'application/octet-stream',
      content: await response.blob(),
    };
  }
}

export function createServices() {
  const demo = new MockContentOpsService();
  const baseUrl = process.env.NEXT_PUBLIC_CONTENT_OPS_API_BASE || '';
  return { demo, live: baseUrl ? new HttpContentOpsService(baseUrl) : null };
}
