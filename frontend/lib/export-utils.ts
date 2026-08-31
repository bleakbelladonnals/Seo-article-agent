import type { ArticleDocument, ArticleSection, AssetVersion, ContentAsset, ExportFormat, ExportResult } from './content-ops-types';

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function sectionMarkdown(section: ArticleSection) {
  const parts = [section.heading ? `## ${section.heading}` : '', section.text];
  if (section.rows?.length) {
    parts.push(`| Controlled field | Verified value | Procurement implication |\n|---|---|---|\n${section.rows.map(row => `| ${row.label.replaceAll('|', '\\|')} | ${row.value.replaceAll('|', '\\|')} | ${row.implication.replaceAll('|', '\\|')} |`).join('\n')}`);
  }
  if (section.items?.length) {
    parts.push(section.items.map((item, index) => `${section.kind === 'steps' ? `${index + 1}.` : '-'} ${item}`).join('\n'));
  }
  if (section.faqs?.length) {
    parts.push(section.faqs.map(faq => `### ${faq.question}\n\n${faq.answer}`).join('\n\n'));
  }
  return parts.filter(Boolean).join('\n\n');
}

function sectionHtml(section: ArticleSection) {
  const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : '';
  const body = `<p>${escapeHtml(section.text)}</p>`;
  const rows = section.rows?.length
    ? `<table><thead><tr><th>Controlled field</th><th>Verified value</th><th>Procurement implication</th></tr></thead><tbody>${section.rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.implication)}</td></tr>`).join('')}</tbody></table>`
    : '';
  const items = section.items?.length
    ? `<${section.kind === 'steps' ? 'ol' : 'ul'}>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${section.kind === 'steps' ? 'ol' : 'ul'}>`
    : '';
  const faqs = section.faqs?.length
    ? `<dl>${section.faqs.map(faq => `<dt>${escapeHtml(faq.question)}</dt><dd>${escapeHtml(faq.answer)}</dd>`).join('')}</dl>`
    : '';
  return `<section>${heading}${body}${rows}${items}${faqs}</section>`;
}

export function articleToMarkdown(article: ArticleDocument) {
  return `# ${article.title}\n\n${article.dek}\n\n${article.sections.map(sectionMarkdown).join('\n\n')}`;
}

export function articleToHtml(article: ArticleDocument) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(article.title)}</title></head><body><article><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.dek)}</p>${article.sections.map(sectionHtml).join('')}</article></body></html>`;
}

export function articleWordCount(article: ArticleDocument) {
  const copy = [
    article.title,
    article.dek,
    ...article.sections.flatMap(section => [
      section.heading,
      section.text,
      ...(section.items || []),
      ...(section.rows || []).flatMap(row => [row.label, row.value, row.implication]),
      ...(section.faqs || []).flatMap(faq => [faq.question, faq.answer]),
    ]),
  ].join(' ');
  return copy.trim().split(/\s+/).filter(Boolean).length;
}

export function getAssetVersion(asset: ContentAsset, versionId = asset.currentVersionId): AssetVersion {
  const version = asset.versions.find(item => item.id === versionId);
  if (!version) throw new Error(`Unknown asset version: ${versionId}`);
  return version;
}

export function exportAssetVersion(asset: ContentAsset, versionId: string, format: ExportFormat): ExportResult {
  const version = getAssetVersion(asset, versionId);
  const baseName = `${asset.productId}-${version.label.toLowerCase()}`;

  if (format !== 'json' && !version.article) {
    throw new Error('视觉资产仅支持 JSON 元数据导出。');
  }
  if (format === 'markdown') {
    const lineage = `## LumaFlow lineage\n\n- Knowledge: ${version.lineage.knowledgeVersion}\n- BOM: ${version.lineage.bomVersion}\n- Finish sample: ${version.lineage.finishSample}\n- Prompt contracts: ${version.lineage.promptContracts.map(item => item.promptVersion).join(', ')}\n- Model routes: ${version.lineage.modelRoutes.join(', ')}\n- Provenance: ${version.provenance.disclosure}`;
    return { fileName: `${baseName}.md`, mimeType: 'text/markdown;charset=utf-8', content: `${articleToMarkdown(version.article!)}\n\n---\n\n${lineage}` };
  }
  if (format === 'html') {
    const lineage = `<aside><h2>LumaFlow lineage</h2><ul><li>Knowledge: ${escapeHtml(version.lineage.knowledgeVersion)}</li><li>BOM: ${escapeHtml(version.lineage.bomVersion)}</li><li>Finish sample: ${escapeHtml(version.lineage.finishSample)}</li><li>Prompt contracts: ${escapeHtml(version.lineage.promptContracts.map(item => item.promptVersion).join(', '))}</li><li>Model routes: ${escapeHtml(version.lineage.modelRoutes.join(', '))}</li></ul><p>${escapeHtml(version.provenance.disclosure)}</p></aside>`;
    return { fileName: `${baseName}.html`, mimeType: 'text/html;charset=utf-8', content: articleToHtml(version.article!).replace('</body>', `${lineage}</body>`) };
  }
  return {
    fileName: `${baseName}.json`,
    mimeType: 'application/json;charset=utf-8',
    content: JSON.stringify({
      schemaVersion: 2,
      asset: {
        id: asset.id,
        productId: asset.productId,
        product: asset.product,
        title: asset.title,
        type: asset.type,
        status: asset.status,
      },
      version,
    }, null, 2),
  };
}

export function triggerDownload(result: ExportResult) {
  const blob = result.content instanceof Blob ? result.content : new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
