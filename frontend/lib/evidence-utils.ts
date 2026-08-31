import type { EvidenceMetric, ModelEvaluation } from './content-ops-types';

export const MODEL_WEIGHTS = {
  fact: 0.30,
  schema: 0.20,
  retrieval: 0.15,
  bilingual: 0.10,
  latency: 0.10,
  cost: 0.10,
  stability: 0.05,
} as const;

export function calculateWeightedModelScore(model: Pick<ModelEvaluation, 'dimensions'>) {
  return Number(Object.entries(MODEL_WEIGHTS)
    .reduce((total, [key, weight]) => total + model.dimensions[key as keyof typeof MODEL_WEIGHTS] * weight, 0)
    .toFixed(1));
}

export function verifyEvidenceMetric(metric: EvidenceMetric) {
  switch (metric.id) {
    case 'draft-time': return (150 - 30) / 150;
    case 'capacity': return (126 - 72) / 72;
    case 'first-pass': return 0.85 - 0.64;
    case 'conflict': return 46 / 50;
    case 'traceability': return 191 / 200;
    case 'uat': return 56 / 60;
    case 'review-time': return (40 - 20) / 40;
    case 'reuse': return 18 / 30;
    default: return null;
  }
}
