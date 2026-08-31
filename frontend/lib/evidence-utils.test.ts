import { describe, expect, it } from 'vitest';
import { evidenceSnapshot } from './demo-data';
import { calculateWeightedModelScore, verifyEvidenceMetric } from './evidence-utils';

describe('historical evidence snapshot', () => {
  it('reproduces the weighted model scores from the disclosed matrix', () => {
    expect(evidenceSnapshot.modelEvaluations.map(model => calculateWeightedModelScore(model))).toEqual([89.1, 88.8, 87.3]);
  });

  it('keeps the resume metrics mathematically consistent', () => {
    const values = Object.fromEntries(evidenceSnapshot.metrics.map(metric => [metric.id, verifyEvidenceMetric(metric)]));
    expect(values['draft-time']).toBe(0.8);
    expect(values.capacity).toBe(0.75);
    expect(values.conflict).toBe(0.92);
    expect(values.traceability).toBe(0.955);
    expect(values.uat).toBeCloseTo(0.933, 3);
    expect(values.reuse).toBe(0.6);
  });

  it('freezes five prompt contracts in the evidence snapshot', () => {
    expect(evidenceSnapshot.promptContracts.map(item => item.promptVersion)).toEqual([
      'product-parser@2.3', 'seo-strategy@1.8', 'content-writer@3.1', 'visual-brief@1.4', 'quality-review@2.6',
    ]);
  });
});
