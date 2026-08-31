import { describe, expect, it } from 'vitest';
import { operationsSnapshot } from './workspace-data';
import { calculateWeightedModelScore, verifyOperationsMetric } from './operations-utils';

describe('operations snapshot', () => {
  it('reproduces weighted model scores from the governed matrix', () => {
    expect(operationsSnapshot.modelEvaluations.map(model => calculateWeightedModelScore(model))).toEqual([89.1, 88.8, 87.3]);
  });

  it('keeps operating metrics mathematically consistent', () => {
    const values = Object.fromEntries(operationsSnapshot.metrics.map(metric => [metric.id, verifyOperationsMetric(metric)]));
    expect(values['draft-time']).toBe(0.8);
    expect(values.capacity).toBe(0.75);
    expect(values.conflict).toBe(0.92);
    expect(values.traceability).toBe(0.955);
    expect(values.reuse).toBe(0.6);
  });

  it('freezes five prompt contracts in the operations snapshot', () => {
    expect(operationsSnapshot.promptContracts.map(item => item.promptVersion)).toEqual([
      'product-parser@2.3', 'seo-strategy@1.8', 'content-writer@3.1', 'visual-brief@1.4', 'quality-review@2.6',
    ]);
  });
});
