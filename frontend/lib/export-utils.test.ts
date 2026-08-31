import { describe, expect, it } from 'vitest';
import { seedAssets } from './demo-data';
import { exportAssetVersion } from './export-utils';

describe('versioned exports', () => {
  it('exports the selected historical asset rather than the active PHK article', () => {
    const canopy = seedAssets.find(asset => asset.id === 'asset-canopy')!;
    const result = exportAssetVersion(canopy, 'canopy-v3', 'markdown');
    expect(result.content).toContain('How to Specify Custom Ceiling Canopy Assemblies');
    expect(result.content).not.toContain('Antique Brass Pendant Light Hardware Kit Manufacturer');
    expect(result.content).toContain('LumaFlow lineage');
  });

  it('exports lineage, scores and simulated visuals in JSON', () => {
    const phk = seedAssets.find(asset => asset.id === 'asset-phk')!;
    const result = exportAssetVersion(phk, 'phk-v1', 'json');
    const parsed = JSON.parse(String(result.content));
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.version.scores).toEqual({ quality: 82, geo: 76 });
    expect(parsed.version.visualAssets).toHaveLength(4);
    expect(parsed.version.lineage.promptContracts).toHaveLength(5);
    expect(parsed.version.provenance.disclosure).toMatch(/确定性演示/);
  });

  it('embeds the knowledge and prompt snapshot in HTML export', () => {
    const phk = seedAssets.find(asset => asset.id === 'asset-phk')!;
    const result = exportAssetVersion(phk, 'phk-v1', 'html');
    expect(result.content).toContain('PKG-PHK-01@4.0');
    expect(result.content).toContain('product-parser@2.3');
  });

  it('prevents article exports for visual-only assets', () => {
    const visual = seedAssets.find(asset => asset.type === 'visual')!;
    expect(() => exportAssetVersion(visual, visual.currentVersionId, 'html')).toThrow('视觉资产仅支持 JSON');
  });
});
