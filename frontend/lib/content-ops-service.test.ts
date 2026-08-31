import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultBrief } from './workspace-data';
import { LocalContentOpsService } from './content-ops-service';
import type { WorkflowEvent } from './content-ops-types';

describe('LocalContentOpsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('executes five agents in order through the workflow event contract', async () => {
    const service = new LocalContentOpsService();
    const run = await service.createRun(defaultBrief);
    const events: WorkflowEvent[] = [];
    service.subscribeToRun(run.id, event => events.push(event));

    await vi.advanceTimersByTimeAsync(2_000);

    expect(events.map(event => event.status)).toEqual(['queued', 'analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing', 'needs_review']);
    expect((await service.getRun(run.id)).stages.every(stage => stage.status === 'completed')).toBe(true);
  });

  it('uses Brief fields in each new task and keeps product facts fixed', async () => {
    const service = new LocalContentOpsService();
    const run = await service.createRun({ ...defaultBrief, keyword: 'non electrical pendant hardware OEM', market: 'north-america' });
    expect(run.article.title).toContain('Non Electrical Pendant Hardware OEM');
    expect(run.article.dek).toContain('North American');
    expect(run.lineage.bomVersion).toBe('BOM-PHK-01@3.0');
  });

  it('blocks products whose knowledge record is not production ready', async () => {
    const service = new LocalContentOpsService();
    await expect(service.createRun({ ...defaultBrief, productId: 'ch-08' })).rejects.toThrow(/尚未达到生产就绪/);
  });
});
