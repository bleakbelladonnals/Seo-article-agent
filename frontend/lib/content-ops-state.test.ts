import { describe, expect, it } from 'vitest';
import { defaultBrief, findings } from './workspace-data';
import {
  MAX_BACKUP_BYTES,
  approveRunAsAsset,
  createInitialRun,
  createInitialState,
  decideRunFinding,
  editRunSection,
  findingDecision,
  hasUnresolvedCritical,
  migrateStoredState,
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
  workspaceReducer,
} from './content-ops-state';

describe('content operations workspace v5', () => {
  it('uses the controlled Brief in the title, summary and opening context', () => {
    const run = createInitialRun({ ...defaultBrief, keyword: 'custom pendant light hardware kit supplier', market: 'europe', audience: '灯具产品经理与供应链团队' });
    expect(run.article.title).toContain('Custom Pendant Light Hardware Kit Supplier');
    expect(run.article.dek).toContain('European 灯具产品经理与供应链团队');
    expect(run.article.sections[0].text).toContain('custom pendant light hardware kit supplier');
    expect(run.lineage.knowledgeVersion).toBe('PKG-PHK-01@4.0');
  });

  it('resolves both critical findings and raises GEO from 76 to 86', () => {
    let run = createInitialRun(defaultBrief);
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

  it('creates an immutable PHK V2 with full lineage and operating origin', () => {
    let run = decideRunFinding(createInitialRun(), 'fact-material', 'accepted');
    run = decideRunFinding(run, 'fact-scope', 'accepted');
    const asset = approveRunAsAsset(run);

    expect(asset.id).toBe('asset-phk');
    expect(asset.currentVersionId).toBe('phk-v2');
    expect(asset.versions.map(version => version.label)).toEqual(['V1', 'V2']);
    expect(asset.versions[0].article?.sections.find(section => section.id === 'materials')?.text).toContain('solid-brass');
    expect(asset.versions[1].article?.sections.find(section => section.id === 'materials')?.text).toContain('stamped-steel');
    expect(asset.versions[1].lineage.promptContracts).toHaveLength(5);
    expect(asset.versions[1].provenance).toEqual(expect.objectContaining({ origin: 'local', createdBy: 'Mia Chen' }));
  });

  it('migrates v4 tasks, decisions and V2 assets while cleaning old article language', () => {
    let run = decideRunFinding(createInitialRun(), 'fact-material', 'accepted');
    run = decideRunFinding(run, 'fact-scope', 'accepted');
    const asset = approveRunAsAsset(run);
    const oldWord = ['Fic', 'tional'].join('');
    asset.versions[0].article!.dek = `${oldWord} source record`;
    const legacyRun = { ...run, mode: 'live' } as unknown as Record<string, unknown>;
    delete legacyRun.origin;
    const migrated = migrateStoredState(JSON.stringify({ schemaVersion: 4, selectedProductId: 'phk-01', brief: defaultBrief, run: legacyRun, assets: [asset] }));

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.run?.origin).toBe('api');
    expect(migrated.run?.decisions).toHaveLength(2);
    expect(migrated.assets[0].currentVersionId).toBe('phk-v2');
    expect(migrated.assets[0].versions[0].article?.dek).not.toContain(oldWord);
  });

  it('exports and restores a persistent-only workspace backup', () => {
    const state = { ...createInitialState(), view: 'assets' as const, settingsOpen: true, editing: true, hydrated: true };
    const raw = serializeWorkspaceBackup(state, '2026-08-31T12:00:00.000Z');
    const parsed = parseWorkspaceBackup(raw);
    const restored = workspaceReducer(state, { type: 'RESTORE', workspace: parsed });

    expect(parsed.assets).toHaveLength(state.assets.length);
    expect(restored.view).toBe('dashboard');
    expect(restored.settingsOpen).toBe(false);
    expect(restored.editing).toBe(false);
    expect(JSON.parse(raw).workspace.view).toBeUndefined();
  });

  it('rejects invalid and oversized backups without producing restorable state', () => {
    expect(() => parseWorkspaceBackup('{invalid')).toThrow(/无法解析/);
    expect(() => parseWorkspaceBackup(JSON.stringify({ schemaVersion: 5, workspace: {} }))).toThrow(/缺少必需/);
    expect(() => parseWorkspaceBackup('{}', MAX_BACKUP_BYTES + 1)).toThrow(/5 MB/);
  });

  it('clears navigation, selection and task state only after the reducer action', () => {
    const dirty = { ...createInitialState(), view: 'assets' as const, selectedProductId: 'ch-08' };
    const cleared = workspaceReducer(dirty, { type: 'CLEAR_WORKSPACE' });
    expect(cleared.view).toBe('dashboard');
    expect(cleared.selectedProductId).toBe('phk-01');
    expect(cleared.run?.status).toBe('needs_review');
    expect(cleared.brief).toEqual(defaultBrief);
  });
});
