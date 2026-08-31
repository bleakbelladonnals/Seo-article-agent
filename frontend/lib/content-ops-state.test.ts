import { describe, expect, it } from 'vitest';
import { defaultBrief, findings } from './demo-data';
import {
  approveRunAsAsset,
  createInitialRun,
  createInitialState,
  decideRunFinding,
  demoReducer,
  editRunSection,
  findingDecision,
  hasUnresolvedCritical,
  migrateStoredState,
} from './content-ops-state';

describe('content operations state v4', () => {
  it('resolves both critical findings and raises GEO from two accepted recommendations', () => {
    let run = createInitialRun('demo', defaultBrief);
    run = decideRunFinding(run, 'fact-material', 'accepted');
    run = decideRunFinding(run, 'fact-scope', 'accepted');
    run = decideRunFinding(run, 'geo-answer', 'accepted');
    run = decideRunFinding(run, 'geo-source', 'accepted');

    expect(run.scores).toEqual({ quality: 90, geo: 86 });
    expect(hasUnresolvedCritical(run)).toBe(false);
    expect(run.article.sections.find(section => section.id === 'materials')?.text).toContain('stamped-steel construction');
    expect(run.article.sections.find(section => section.id === 'scope')?.text).toContain('non-electrical pendant light hardware kit');
  });

  it('does not allow either critical finding to be ignored', () => {
    const run = decideRunFinding(createInitialRun(), 'fact-material', 'ignored');
    expect(run.decisions).toEqual([]);
    expect(hasUnresolvedCritical(run)).toBe(true);
  });

  it('recognizes a source-aligned manual correction without resolving unrelated critical risks', () => {
    const run = createInitialRun();
    const materialFinding = findings.find(item => item.id === 'fact-material')!;
    const original = run.article.sections.find(section => section.id === 'materials')!.text;
    const edited = original.replace(materialFinding.before, materialFinding.after);
    let next = editRunSection(run, 'materials', edited);

    expect(findingDecision(next, 'fact-material')).toEqual(expect.objectContaining({ decision: 'manual' }));
    expect(next.scores.quality).toBe(86);
    expect(hasUnresolvedCritical(next)).toBe(true);
    next = decideRunFinding(next, 'fact-scope', 'accepted');
    expect(hasUnresolvedCritical(next)).toBe(false);
  });

  it('updates the PHK asset with an immutable V2 and complete lineage', () => {
    let run = decideRunFinding(createInitialRun(), 'fact-material', 'accepted');
    run = decideRunFinding(run, 'fact-scope', 'accepted');
    const asset = approveRunAsAsset(run);

    expect(asset.id).toBe('asset-phk');
    expect(asset.currentVersionId).toBe('phk-v2');
    expect(asset.versions.map(version => version.label)).toEqual(['V1', 'V2']);
    expect(asset.versions[0].article?.sections.find(section => section.id === 'materials')?.text).toContain('solid-brass');
    expect(asset.versions[1].article?.sections.find(section => section.id === 'materials')?.text).toContain('stamped-steel');
    expect(asset.versions[1].lineage.promptContracts).toHaveLength(5);
  });

  it('resets incompatible v3 browser state and explains the case upgrade', () => {
    const migrated = migrateStoredState(JSON.stringify({ schemaVersion: 3, selectedProductId: 'hb-200', assets: [] }));
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.selectedProductId).toBe('phk-01');
    expect(migrated.run).toBeNull();
    expect(migrated.migrationNotice).toMatch(/案例已升级/);
  });

  it('resets navigation, selection and workflow state', () => {
    const dirty = { ...createInitialState(), view: 'assets' as const, selectedProductId: 'ch-08', run: createInitialRun() };
    const reset = demoReducer(dirty, { type: 'RESET' });
    expect(reset.view).toBe('dashboard');
    expect(reset.selectedProductId).toBe('phk-01');
    expect(reset.run).toBeNull();
    expect(reset.brief).toEqual(defaultBrief);
  });
});
