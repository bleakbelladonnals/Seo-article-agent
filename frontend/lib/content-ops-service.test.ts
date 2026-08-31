import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultBrief } from './demo-data';
import { MockContentOpsService } from './content-ops-service';
import type { WorkflowEvent } from './content-ops-types';

describe('MockContentOpsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('drives quick demo through the same workflow event contract', async () => {
    const service = new MockContentOpsService();
    const run = await service.createRun(defaultBrief, { quick: true });
    const events: WorkflowEvent[] = [];
    service.subscribeToRun(run.id, event => events.push(event));

    await vi.advanceTimersByTimeAsync(800);

    expect(events.map(event => event.status)).toEqual(expect.arrayContaining(['queued', 'analyzing', 'strategizing', 'writing', 'visualizing', 'reviewing', 'needs_review']));
    expect((await service.getRun(run.id)).status).toBe('needs_review');
  });

  it('provides a deterministic failure that can be retried with a new run', async () => {
    const service = new MockContentOpsService();
    const failedRun = await service.createRun(defaultBrief, { quick: true, failOnce: true });
    service.subscribeToRun(failedRun.id, () => undefined);
    await vi.advanceTimersByTimeAsync(400);
    expect((await service.getRun(failedRun.id)).status).toBe('failed');

    const retry = await service.createRun(defaultBrief, { quick: true });
    service.subscribeToRun(retry.id, () => undefined);
    await vi.advanceTimersByTimeAsync(800);
    expect((await service.getRun(retry.id)).status).toBe('needs_review');
  });
});
