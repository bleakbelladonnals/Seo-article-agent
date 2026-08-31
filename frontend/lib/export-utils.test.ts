import { describe, expect, it } from 'vitest';
import { seedAssets } from './workspace-data';
import { exportAssetVersion } from './export-utils';

describe('versioned exports', () => {
  it('exports the selected historical article as Markdown with lineage', () => {
    const canopy = seedAssets.find(asset => asset.id === 'asset-canopy')!;
    const result = exportAssetVersion(canopy, 'canopy-v3', 'markdown');
    expect(result.fileName).toBe('ca-120-v3.md');
    expect(result.content).toContain('How to Specify Custom Ceiling Canopy Assemblies');
    expect(result.content).toContain('LumaFlow lineage');
    expect(result.content).toContain('Execution origin: local');
  });

  it('exports a complete JSON asset contract', () => {
    const phk = seedAssets.find(asset => asset.id === 'asset-phk')!;
    const result = exportAssetVersion(phk, 'phk-v1', 'json');
    const parsed = JSON.parse(String(result.content));
    expect(result.fileName).toBe('phk-01-v1.json');
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.version.scores).toEqual({ quality: 82, geo: 76 });
    expect(parsed.version.visualAssets).toHaveLength(4);
    expect(parsed.version.lineage.promptContracts).toHaveLength(5);
    expect(parsed.version.provenance).toEqual(expect.objectContaining({ origin: 'local', runId: 'LFC-20260827-014' }));
  });

  it('embeds article content and lineage in HTML export', () => {
    const phk = seedAssets.find(asset => asset.id === 'asset-phk')!;
    const result = exportAssetVersion(phk, 'phk-v1', 'html');
    expect(result.fileName).toBe('phk-01-v1.html');
    expect(result.content).toContain('PKG-PHK-01@4.0');
    expect(result.content).toContain('product-parser@2.3');
    expect(result.content).toContain('LFC-20260827-014');
  });

  it('prevents article exports for visual-only assets', () => {
    const visual = seedAssets.find(asset => asset.type === 'visual')!;
    expect(() => exportAssetVersion(visual, visual.currentVersionId, 'html')).toThrow('视觉资产仅支持 JSON');
  });
});
