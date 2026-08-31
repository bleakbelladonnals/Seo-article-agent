import type {
  AgentRun,
  ArticleDocument,
  ContentAsset,
  ContentBrief,
  EvidenceSnapshot,
  Product,
  ProductKnowledgeRecord,
  PromptContract,
  ReviewFinding,
  RunLineage,
  SourceDocument,
  VisualAsset,
} from './content-ops-types';

export const demoDisclosure = '虚构、匿名化的面试演示资料；不代表真实企业文件、实时模型结果或线上业务数据。';
const heroImage = '/lumaflow-hardware-hero.png';

const phkSources: SourceDocument[] = [
  {
    id: 'source-phk-master',
    name: 'PHK-01_Product_Master_v4.xlsx',
    type: '产品主数据',
    version: 'v4.0',
    status: '已验证',
    sections: 8,
    reference: 'Material & delivery scope · Rows 18–31',
    excerpt: 'Primary formed parts are stamped steel with approved antique-brass electroplated finish AB-07. The kit is a non-electrical metal hardware package and excludes lamp holders, wire, drivers and light sources.',
    disclosure: demoDisclosure,
  },
  {
    id: 'source-phk-bom',
    name: 'PHK-01_Assembly_BOM_v3.pdf',
    type: '套件 BOM',
    version: 'v3.0',
    status: '已验证',
    sections: 6,
    reference: 'Page 2 · Released kit structure',
    excerpt: 'Released kit PHK-01 contains the canopy assembly, mounting bracket, chain assembly, threaded tube, decorative collars, fastener packet, protective packaging and kit label. Electrical components are not part of this BOM.',
    disclosure: demoDisclosure,
  },
  {
    id: 'source-phk-finish',
    name: 'Antique_Brass_Finish_AB-07.pdf',
    type: '表面效果色板',
    version: 'AB-07 · Rev B',
    status: '已验证',
    sections: 4,
    reference: 'Page 1 · Approved appearance range',
    excerpt: 'AB-07 is an approved antique-brass electroplated appearance on prepared steel. Color approval refers to the controlled sample range and does not change the base material into solid brass.',
    disclosure: demoDisclosure,
  },
  {
    id: 'source-phk-claims',
    name: 'B2B_Content_Claims_Guide_v2.md',
    type: '品牌与事实规范',
    version: 'v2.0',
    status: '已验证',
    sections: 9,
    reference: 'Sections 3–4 · Scope and test claims',
    excerpt: 'Do not describe a non-electrical hardware kit as a ready-to-install light. Salt-spray performance may be stated only when the exact sample, method, duration and report are available for the offered finish.',
    disclosure: demoDisclosure,
  },
];

const phkKnowledge: ProductKnowledgeRecord = {
  knowledgeVersion: 'PKG-PHK-01@4.0',
  bomVersion: 'BOM-PHK-01@3.0',
  finishSample: 'AB-07 · Rev B',
  verifiedAt: '2026-08-18',
  bom: [
    {
      id: 'bom-canopy', name: '吸顶盘组件', partNumber: 'ASSY-CAN-104', quantity: 1, level: 'assembly', material: '冲压钢件', finish: 'AB-07 仿古黄铜电镀', source: 'BOM v3 · Line 10',
      children: [
        { id: 'bom-canopy-shell', name: '吸顶盘壳体', partNumber: 'CAN-104-S', quantity: 1, level: 'component', material: '冷轧钢', finish: 'AB-07', source: 'BOM v3 · Line 11' },
        { id: 'bom-bracket', name: '安装支架', partNumber: 'BRK-88-Z', quantity: 1, level: 'component', material: '镀锌钢', finish: '本色锌', source: 'BOM v3 · Line 12' },
      ],
    },
    { id: 'bom-chain', name: '装饰吊链组件', partNumber: 'ASSY-CH-08', quantity: 1, level: 'assembly', material: '钢', finish: 'AB-07 仿古黄铜电镀', source: 'BOM v3 · Line 20' },
    { id: 'bom-tube', name: '螺纹中管', partNumber: 'TUBE-M10-180', quantity: 1, level: 'component', material: '钢', finish: 'AB-07 仿古黄铜电镀', source: 'BOM v3 · Line 30' },
    { id: 'bom-collar', name: '装饰套环', partNumber: 'COL-31-AB', quantity: 2, level: 'component', material: '锌合金', finish: 'AB-07 配色', source: 'BOM v3 · Line 40' },
    { id: 'bom-fasteners', name: '安装紧固件包', partNumber: 'PK-FST-01', quantity: 1, level: 'component', material: '钢', finish: '镀锌', source: 'BOM v3 · Line 50' },
    { id: 'bom-packaging', name: '保护包装与套件标签', partNumber: 'PKG-PHK-01', quantity: 1, level: 'packaging', material: 'PE 袋＋纸质隔层', finish: 'N/A', source: 'BOM v3 · Line 60' },
  ],
  processRoute: [
    { id: 'process-1', order: 1, name: '图纸与范围确认', mode: '内部', boundary: '确认产品层级、基材、色板与非电气范围', output: '已批准需求卡' },
    { id: 'process-2', order: 2, name: '冲压与五金加工', mode: '内部/合作', boundary: '按正式图纸下料、冲压、钻孔与攻牙', output: '可追溯毛坯' },
    { id: 'process-3', order: 3, name: '抛光与前处理', mode: '内部', boundary: '处理毛刺、油污与表面一致性', output: '电镀合格在制品' },
    { id: 'process-4', order: 4, name: '仿古黄铜电镀', mode: '内部', boundary: '按 AB-07 批准色板控制外观', output: '已批准表面效果' },
    { id: 'process-5', order: 5, name: '机械预装与齐套', mode: '内部', boundary: '仅完成非电气结构预装和 BOM 核对', output: 'PHK-01 五金套件' },
    { id: 'process-6', order: 6, name: '保护包装与标签', mode: '内部', boundary: '按一套一包分装并记录版本批次', output: '出口交付包装' },
  ],
  includedScope: ['吸顶盘与安装支架', '装饰吊链与螺纹管件', '装饰套环和紧固件包', '非电气机械预装', '套件 BOM、分装标签与保护包装'],
  excludedScope: ['灯头与电线', '驱动与 LED 模组', '光源与电气装配', '整灯电气设计', '完整灯具认证与市场准入结论'],
};

const sampleKnowledge = (id: string): ProductKnowledgeRecord => ({
  knowledgeVersion: `${id}@1.0`, bomVersion: `${id}-BOM@1.0`, finishSample: '待项目确认', verifiedAt: '2026-08-12', bom: [], processRoute: [],
  includedScope: ['金属组件', '表面处理', '保护包装'], excludedScope: ['灯头', '电线', '驱动', '光源'],
});

export const products: Product[] = [
  {
    id: 'phk-01', name: 'Aurelia PHK-01', model: 'PHK-01-AB07', category: '仿古黄铜吊灯五金套件', status: '可用', completeness: 97, market: '全球 B2B OEM', accent: '#c59b58', imageUrl: heroImage, imagePosition: '78% center', workflowAvailable: true,
    workflowNote: '固定面试案例已配置产品知识、5-Agent 生成、四维审核、版本和导出。',
    description: '面向海外灯具制造商与品牌商的非电气吊灯金属五金套件，包含机械预装、齐套和保护包装。',
    specs: [
      { label: '交付层级', value: '成套五金包', verified: true, source: '产品主数据 · Scope' },
      { label: '主要基材', value: '钢＋锌合金', verified: true, source: '产品主数据 · Material' },
      { label: '表面效果', value: 'AB-07 仿古黄铜电镀', verified: true, source: '色板 · Rev B' },
      { label: 'BOM 版本', value: 'v3.0', verified: true, source: '套件 BOM · Page 2' },
      { label: '吸顶盘直径', value: 'Ø104 mm', verified: true, source: '产品主数据 · Dimensions' },
      { label: '吊链长度', value: '1,000 mm', verified: true, source: '产品主数据 · Dimensions' },
      { label: '预装范围', value: '非电气机械预装', verified: true, source: '产品主数据 · Assembly' },
      { label: '包装方式', value: '一套一包＋批次标签', verified: true, source: '套件 BOM · Line 60' },
    ],
    applications: ['吊灯 OEM 项目', '灯具品牌采购', '组件与套件交付'],
    keywords: [
      { keyword: 'antique brass pendant light hardware kit manufacturer', intent: '采购决策', priority: '高' },
      { keyword: 'pendant light metal parts OEM supplier', intent: '商业调研', priority: '高' },
      { keyword: 'antique brass ceiling canopy kit', intent: '产品对比', priority: '中' },
    ],
    documents: phkSources, knowledge: phkKnowledge,
  },
  {
    id: 'ca-120', name: 'Canora CA-120', model: 'CA-120-AB', category: '吸顶盘组件', status: '可用', completeness: 92, market: '欧洲 B2B OEM', accent: '#b58a52', imageUrl: heroImage, imagePosition: '75% center', workflowAvailable: false,
    workflowNote: '知识样本可浏览，本轮未配置内容生产与审核流程。', description: '用于吊灯和吸顶灯结构安装的钢制吸顶盘组件，不包含任何电气部件。',
    specs: [{ label: '基材', value: '冷轧钢', verified: true, source: '组件图纸 · Material' }, { label: '直径', value: 'Ø120 mm', verified: true, source: '组件图纸 · Dimensions' }, { label: '表面', value: '仿古黄铜电镀', verified: true, source: '色板 · AB-06' }],
    applications: ['吊灯结构件', '吸顶灯结构件'], keywords: [{ keyword: 'custom ceiling canopy manufacturer', intent: '采购决策', priority: '高' }], documents: [phkSources[2]], knowledge: sampleKnowledge('CA-120'),
  },
  {
    id: 'ch-08', name: 'Linea CH-08', model: 'CH-08-BN', category: '装饰吊链组件', status: '待审核', completeness: 78, market: '北美 B2B OEM', accent: '#8f8877', imageUrl: heroImage, imagePosition: '83% center', workflowAvailable: false,
    workflowNote: '表面耐久字段仍待质量团队确认，暂不可进入内容生产。', description: '面向吊灯结构连接的装饰钢链组件，支持按批准色板进行表面处理。',
    specs: [{ label: '基材', value: '钢', verified: true, source: '组件规格 · Material' }, { label: '链节规格', value: '3.8 × 20 mm', verified: true, source: '组件图纸 · Dimensions' }, { label: '耐久声明', value: '待专项报告', verified: false, source: '待质量确认' }],
    applications: ['吊灯结构连接', '装饰链组件'], keywords: [{ keyword: 'decorative pendant chain supplier', intent: '商业调研', priority: '高' }], documents: [phkSources[3]], knowledge: sampleKnowledge('CH-08'),
  },
  {
    id: 'mb-17', name: 'Arcus MB-17', model: 'MB-17-BLK', category: '非电气灯体金属组件', status: '可用', completeness: 90, market: '中东 B2B OEM', accent: '#806f5b', imageUrl: heroImage, imagePosition: '80% center', workflowAvailable: false,
    workflowNote: '知识样本可浏览，本轮未配置内容生产与审核流程。', description: '完成结构安装与保护包装的非电气金属灯体，由客户负责电气部件和市场准入。',
    specs: [{ label: '交付层级', value: '非电气灯体', verified: true, source: '产品主数据 · Scope' }, { label: '基材', value: '钢＋铝', verified: true, source: '产品主数据 · Material' }, { label: '表面', value: '哑黑粉末涂层', verified: true, source: '色板 · MB-03' }],
    applications: ['壁灯结构组件', '灯体 OEM'], keywords: [{ keyword: 'non electrical lamp body manufacturer', intent: '采购决策', priority: '高' }], documents: [phkSources[0]], knowledge: sampleKnowledge('MB-17'),
  },
];

export const defaultBrief: ContentBrief = {
  productId: 'phk-01', contentType: 'sourcing-guide', keyword: 'antique brass pendant light hardware kit manufacturer', market: 'global', language: 'en', audience: '海外灯具品牌与采购经理', deliverables: { article: true, heroVisual: true, faq: true },
};

export const promptContracts: PromptContract[] = [
  { agentId: 'product', promptVersion: 'product-parser@2.3', schemaVersion: 'ProductEvidenceBundle@1.2', inputSummary: '产品主数据、BOM v3、AB-07 色板、范围规范', outputSchema: 'ProductEvidenceBundle', modelRoute: 'Qwen-Plus · 抽取与标准化' },
  { agentId: 'seo', promptVersion: 'seo-strategy@1.8', schemaVersion: 'SeoBrief@1.4', inputSummary: '产品证据、目标市场、采购意图、主关键词', outputSchema: 'SeoBrief', modelRoute: 'Qwen-Plus · 意图与结构化规划' },
  { agentId: 'writer', promptVersion: 'content-writer@3.1', schemaVersion: 'DraftPackage@2.0', inputSummary: '受控 Content Brief、已验证事实、禁用声明', outputSchema: 'DraftPackage', modelRoute: 'DeepSeek-V3-0324 · 英文长文生成' },
  { agentId: 'visual', promptVersion: 'visual-brief@1.4', schemaVersion: 'VisualBrief@1.1', inputSummary: '产品范围、BOM 结构、文章核心段落', outputSchema: 'VisualBrief', modelRoute: 'Qwen-Plus · 视觉简报生成' },
  { agentId: 'review', promptVersion: 'quality-review@2.6', schemaVersion: 'ReviewReport@2.2', inputSummary: '文章、来源快照、事实/SEO/GEO/品牌规则', outputSchema: 'ReviewReport', modelRoute: 'GPT-4.1 · 高风险冲突与质量标杆' },
];

export const agentTemplates: AgentRun[] = [
  { id: 'product', name: '产品资料解析', role: '产品资料解析 Agent', durationLabel: '4 秒', summary: '已规范化 8 个产品事实、6 类 BOM 对象与非电气范围。', evidence: '4 个来源 · 8 个事实 · BOM v3', status: 'waiting', ...promptContracts[0] },
  { id: 'seo', name: 'SEO 内容策略', role: 'SEO 策略 Agent', durationLabel: '5 秒', summary: '已识别 B2B 采购意图并生成选型指南结构与 FAQ 计划。', evidence: '3 个关键词 · 1 份 SeoBrief', status: 'waiting', ...promptContracts[1] },
  { id: 'writer', name: '文章内容生成', role: '文章生成 Agent', durationLabel: '7 秒', summary: '已生成包含 BOM、工艺、询价清单和 FAQ 的英文采购指南。', evidence: '1 篇长文 · 10 个内容模块', status: 'waiting', ...promptContracts[2] },
  { id: 'visual', name: '视觉创意生成', role: '视觉创意 Agent', durationLabel: '4 秒', summary: '已准备产品主图、BOM、色板与来源血缘视觉方案。', evidence: '4 项模拟视觉资产', status: 'waiting', ...promptContracts[3] },
  { id: 'review', name: '质量与治理审核', role: '质量审核 Agent', durationLabel: '6 秒', summary: '发现 2 个关键问题与 5 项事实、SEO、GEO、品牌建议。', evidence: '7 条发现 · 4 个治理维度', status: 'waiting', ...promptContracts[4] },
];

export const initialArticle: ArticleDocument = {
  title: 'How to Select an Antique Brass Pendant Light Hardware Kit Manufacturer for OEM Projects',
  dek: 'A source-led guide for lighting brands evaluating metal parts, finish control, assembly scope and export-ready kit delivery.',
  sections: [
    { id: 'opening', heading: '', kind: 'lead', text: 'An antique brass pendant light hardware kit manufacturer should be evaluated on material control, finish-sample approval, released BOM structure and delivery scope—not on appearance alone. Buyers should verify which metal parts are included, how the antique brass effect is produced and where electrical responsibility begins before approving a supplier.' },
    { id: 'summary', heading: 'Sourcing summary for OEM buyers', kind: 'takeaways', text: 'Start with the controlled product record and released kit BOM, then confirm the finish sample, mechanical assembly level, packaging method and excluded electrical scope.', items: ['Match every quoted part to the released BOM and drawing revision.', 'Treat antique brass as a controlled finish description, not proof of solid-brass construction.', 'Separate non-electrical hardware delivery from the customer’s electrical design and certification work.', 'Request project-specific samples and test evidence before accepting performance claims.'] },
    { id: 'snapshot', heading: 'Verified PHK-01 hardware snapshot', kind: 'comparison', text: 'The example below separates the controlled specification from the procurement implication.', rows: [
      { label: 'Delivery level', value: 'Non-electrical hardware kit', implication: 'Covers metal parts, mechanical pre-assembly and packaging only.' },
      { label: 'Primary substrate', value: 'Steel + zinc alloy', implication: 'Material must be confirmed independently from the decorative finish.' },
      { label: 'Finish', value: 'AB-07 antique brass electroplate', implication: 'Appearance is approved against a controlled range sample.' },
      { label: 'BOM', value: 'PHK-01 v3.0', implication: 'Supports completeness checks and one-kit-per-pack delivery.' },
      { label: 'Canopy', value: 'Ø104 mm stamped steel', implication: 'Drawing revision controls dimensions and mounting interfaces.' },
      { label: 'Assembly', value: 'Mechanical only', implication: 'Electrical parts and testing remain outside the supplied scope.' },
    ] },
    { id: 'method', heading: 'A five-step supplier evaluation method', kind: 'steps', text: 'Use one repeatable evidence sequence for a standard item, a finish variant or a semi-custom RFQ.', items: ['Confirm the product level and exact internal/customer part-number mapping.', 'Review base material, dimensions, released BOM and process route.', 'Approve the finish against a physical range sample and documented substrate.', 'Clarify mechanical pre-assembly, kit completeness, labels and protective packaging.', 'Record open risks, sample evidence and customer-owned electrical responsibilities before quotation approval.'] },
    { id: 'materials', heading: 'Separate base material from decorative finish', kind: 'paragraph', text: 'The PHK-01 uses solid-brass construction across its principal components, giving buyers a naturally aged brass surface without a plated substrate. This distinction matters because material affects forming methods, weight, cost and the language that can be used in product content.' },
    { id: 'scope', heading: 'Define the supplied assembly boundary', kind: 'paragraph', text: 'PHK-01 is delivered as a ready-to-install complete pendant light with the core hardware already assembled. The supplier therefore covers the fixture’s installation readiness, while project teams only need to confirm final packaging and finish appearance.' },
    { id: 'finish', heading: 'Control antique brass as an approved appearance', kind: 'paragraph', text: 'AB-07 combines surface preparation, electroplating, aging and sealing to produce the approved antique-brass appearance on the specified substrates. Buyers should approve a range sample because intentional variation is part of the finish character, while scratches, exposed base metal and uncontrolled color shifts remain defects.' },
    { id: 'quality', heading: 'Ask for evidence behind durability claims', kind: 'paragraph', text: 'The finish is guaranteed to pass 500 hours of neutral salt-spray testing for every order. Procurement teams can therefore treat corrosion performance as fixed across substrates, part geometries and service environments without requesting project-specific reports.' },
    { id: 'checklist', heading: 'Information to include in an RFQ', kind: 'checklist', text: 'A complete RFQ should make the requested delivery level and evidence requirements reproducible.', items: ['Customer and internal part numbers with current drawing revisions.', 'Kit BOM, quantity per kit and acceptable substitute policy.', 'Base material and approved finish sample code for each visible component.', 'Mechanical pre-assembly, packaging, labels and destination requirements.', 'Required inspection or third-party test method, sample and acceptance criteria.', 'Explicit confirmation that lamp holders, wire, drivers and light sources are excluded.'] },
    { id: 'faq', heading: 'Frequently asked questions', kind: 'faq', text: 'These answers support early supplier and sourcing conversations.', faqs: [
      { question: 'Does antique brass finish mean the part is solid brass?', answer: 'No. Antique brass can describe a controlled plated or coated appearance on steel, zinc alloy or another approved substrate.' },
      { question: 'What does a non-electrical hardware kit include?', answer: 'It can include the canopy, bracket, chain, tubes, decorative parts, fasteners, mechanical pre-assembly and packaging, but not electrical components.' },
      { question: 'How should finish consistency be approved?', answer: 'Approve a physical range sample on the correct substrate and record the sample code, revision and inspection conditions.' },
      { question: 'Which documents should a supplier return?', answer: 'Request the current product record, released BOM, drawings, finish sample reference, inspection criteria and any project-required test reports.' },
    ] },
    { id: 'cta', heading: 'Turn the shortlist into a controlled RFQ', kind: 'cta', text: 'Share the required kit hierarchy, drawings, finish target, packaging method and electrical exclusions so the supplier can confirm scope before sampling or quotation.' },
  ],
};

export const findings: ReviewFinding[] = [
  { id: 'fact-material', type: 'fact', severity: 'critical', title: '基材与表面效果混淆', detail: '文章将钢制件仿古黄铜电镀写成实心黄铜，会直接影响材料、成本和采购判断。', source: 'PHK-01_Product_Master_v4.xlsx · Material', targetSectionId: 'materials', before: 'solid-brass construction across its principal components, giving buyers a naturally aged brass surface without a plated substrate', after: 'stamped-steel construction with an approved AB-07 antique-brass electroplated finish on the principal formed parts', scoreImpact: { quality: 4 } },
  { id: 'fact-scope', type: 'fact', severity: 'critical', title: '交付范围越过非电气边界', detail: 'PHK-01 是非电气五金套件，不是可直接安装使用的完整吊灯。', source: 'PHK-01_Assembly_BOM_v3.pdf · Page 2', targetSectionId: 'scope', before: 'ready-to-install complete pendant light', after: 'non-electrical pendant light hardware kit', scoreImpact: { quality: 4 } },
  { id: 'fact-salt', type: 'fact', severity: 'warning', title: '500 小时盐雾声明缺少来源', detail: '现有来源没有对应样品、方法和报告，不能将测试结果写成每批固定保证。', source: 'B2B_Content_Claims_Guide_v2.md · Section 4', targetSectionId: 'quality', before: 'The finish is guaranteed to pass 500 hours of neutral salt-spray testing for every order.', after: 'Salt-spray performance should be stated only when the exact sample, method, duration and project-specific report are available.', scoreImpact: { quality: 3 } },
  { id: 'seo-title', type: 'seo', severity: 'warning', title: 'SEO 标题偏长', detail: '建议保留材质效果、产品类型和 OEM 意图，压缩供应商修饰语。', before: 'How to Select an Antique Brass Pendant Light Hardware Kit Manufacturer for OEM Projects', after: 'Antique Brass Pendant Hardware Kits: An OEM Sourcing Guide', scoreImpact: { quality: 2 } },
  { id: 'geo-answer', type: 'geo', severity: 'suggestion', title: '首段答案可以更独立', detail: '将采购判断压缩成一句可脱离上下文引用的答案。', targetSectionId: 'opening', before: 'An antique brass pendant light hardware kit manufacturer should be evaluated on material control, finish-sample approval, released BOM structure and delivery scope—not on appearance alone.', after: 'Choose an antique brass pendant hardware supplier by verifying base material, finish sample, released BOM and non-electrical delivery scope.', scoreImpact: { geo: 5 } },
  { id: 'geo-source', type: 'geo', severity: 'suggestion', title: '补充 BOM 来源标记', detail: '将套件内容与已验证 BOM v3 明确关联，增强来源可追溯性。', source: 'PHK-01_Assembly_BOM_v3.pdf · Page 2', targetSectionId: 'snapshot', before: 'The example below separates the controlled specification from the procurement implication.', after: 'According to the verified PHK-01 BOM v3, the example below separates the controlled specification from its procurement implication.', scoreImpact: { geo: 5 } },
  { id: 'brand-claim', type: 'brand', severity: 'warning', title: '避免承担安装与电气结果', detail: '供应方只确认五金机械范围，不能承诺完整灯具的安装就绪状态。', targetSectionId: 'scope', before: 'The supplier therefore covers the fixture’s installation readiness', after: 'The supplier confirms only the metal hardware, mechanical pre-assembly and kit completeness', scoreImpact: { quality: 2 } },
];

export const visualAssets: VisualAsset[] = [
  { id: 'visual-hero', title: 'PHK-01 hardware kit hero', format: 'hero', label: '产品主图 · 模拟资产', alt: 'Fictional antique brass pendant hardware kit with canopy, chain, tube and fastener pack', caption: '展示非电气吊灯五金套件及受控仿古黄铜表面。', accent: '#c59b58', motif: 'product', imageUrl: heroImage },
  { id: 'visual-bom', title: 'Released kit BOM', format: 'diagram', label: 'BOM 信息图 · 模拟资产', alt: 'Structured PHK-01 bill of materials diagram', caption: '以套件、组件、零件和包装四层展示齐套关系。', accent: '#c59b58', motif: 'bom' },
  { id: 'visual-finish', title: 'AB-07 finish control', format: 'swatch', label: '色板信息图 · 模拟资产', alt: 'Antique brass finish range swatches on prepared steel', caption: '强调“表面效果不等于实心黄铜”的事实边界。', accent: '#d2a866', motif: 'finish' },
  { id: 'visual-lineage', title: 'Evidence-to-asset lineage', format: 'flow', label: '证据血缘图 · 模拟资产', alt: 'Knowledge, prompts, review decisions and approved asset lineage', caption: '连接知识版本、Prompt、模型路由、审查和 V2 资产。', accent: '#a8cfaa', motif: 'lineage' },
];

export const evidenceSnapshot: EvidenceSnapshot = {
  label: 'Historical Review Snapshot · 2026-08',
  disclosure: '脱敏历史复盘快照；样本、周期与公式用于解释简历口径，不是当前 Demo 实时分析数据。',
  evaluationSet: '150 道冻结评测题；关键题重复 3 次；业务与产品双人盲评。',
  metrics: [
    { id: 'draft-time', label: '初稿中位耗时', before: '150 分钟', after: '30 分钟', result: '↓ 80%', sample: '前后各 40 篇', formula: '(150−30) ÷ 150' },
    { id: 'capacity', label: '月均正式交付', before: '72 篇', after: '126 篇', result: '↑ 75%', sample: '前后各 3 个月', formula: '(126−72) ÷ 72；年化 1,512 篇' },
    { id: 'first-pass', label: '一次审核通过率', before: '64%', after: '85%', result: '+21pp', sample: '前后各 100 篇', formula: '一次通过篇数 ÷ 冻结样本数' },
    { id: 'conflict', label: '参数冲突识别率', before: '—', after: '46 / 50', result: '92%', sample: '50 个预埋冲突', formula: '识别冲突数 ÷ 冲突总数' },
    { id: 'traceability', label: '知识来源可追溯率', before: '—', after: '191 / 200', result: '95.5%', sample: '200 个关键事实', formula: '有有效来源事实数 ÷ 事实总数' },
    { id: 'uat', label: '核心任务完成率', before: '—', after: '56 / 60', result: '93.3%', sample: '3 轮 UAT', formula: '完成任务数 ÷ 任务总数' },
    { id: 'review-time', label: '审核中位耗时', before: '40 分钟', after: '20 分钟', result: '↓ 50%', sample: '前后各 30 篇', formula: '(40−20) ÷ 40' },
    { id: 'reuse', label: '历史资产复用率', before: '—', after: '18 / 30', result: '60%', sample: '最近 30 个任务', formula: '复用任务数 ÷ 任务总数' },
  ],
  modelEvaluations: [
    { id: 'qwen', model: 'Qwen-Plus', score: 89.1, routingRole: '抽取、分类与结构化规划', dimensions: { fact: 86, schema: 94, retrieval: 85, bilingual: 92, latency: 88, cost: 92, stability: 91 } },
    { id: 'deepseek', model: 'DeepSeek-V3-0324', score: 88.8, routingRole: '英文长文与常规生成', dimensions: { fact: 88, schema: 92, retrieval: 87, bilingual: 90, latency: 85, cost: 90, stability: 88 } },
    { id: 'gpt', model: 'GPT-4.1', score: 87.3, routingRole: '高风险冲突与质量标杆', dimensions: { fact: 94, schema: 95, retrieval: 92, bilingual: 96, latency: 71, cost: 52, stability: 88 } },
  ],
  promptContracts,
  uatRounds: [
    { id: 'uat-1', round: 'Round 1', focus: '创建任务与知识来源理解', completed: 18, total: 20, outcome: '补充来源定位和缺参解释' },
    { id: 'uat-2', round: 'Round 2', focus: '审核层级与人工修改入口', completed: 19, total: 20, outcome: '关键问题置顶并强化审批门禁' },
    { id: 'uat-3', round: 'Round 3', focus: '版本、导出与资产复用', completed: 19, total: 20, outcome: '统一版本血缘和导出字段' },
  ],
};

export const fixedLineage: RunLineage = {
  knowledgeVersion: phkKnowledge.knowledgeVersion,
  bomVersion: phkKnowledge.bomVersion,
  finishSample: phkKnowledge.finishSample,
  sourceIds: phkSources.map(source => source.id),
  promptContracts,
  modelRoutes: ['Qwen-Plus', 'DeepSeek-V3-0324', 'GPT-4.1'],
  evaluationSnapshot: evidenceSnapshot.label,
};

function simpleArticle(title: string, product: string, subject: string): ArticleDocument {
  return { title, dek: `A fictional, source-led ${subject} prepared for the LumaFlow portfolio demonstration.`, sections: [{ id: 'opening', heading: '', kind: 'lead', text: `${product} is used as an anonymized metal-hardware example. Buyers should verify material, finish, assembly scope and source versions before approval.` }, { id: 'method', heading: 'A controlled sourcing method', kind: 'steps', text: 'Keep evidence and scope visible.', items: ['Confirm the exact part level.', 'Check the controlled product record.', 'Approve finish and delivery scope.'] }] };
}

const provenanceDisclosure = '确定性演示输出；不是实时模型结果或真实业务绩效。';
const lineageFor = (productId: string): RunLineage => productId === 'phk-01' ? fixedLineage : { ...fixedLineage, knowledgeVersion: `${productId}@1.0`, bomVersion: `${productId}-BOM@1.0`, sourceIds: [] };

export const seedAssets: ContentAsset[] = [
  {
    id: 'asset-canopy', productId: 'ca-120', product: 'Canora CA-120', title: 'How to Specify Custom Ceiling Canopy Assemblies', type: 'article', typeLabel: 'OEM 采购指南', status: '已通过', currentVersionId: 'canopy-v3', updatedAt: '2026-08-26', owner: 'Mia Chen', color: '#b58a52',
    versions: ['V1', 'V2', 'V3'].map((label, index) => ({ id: `canopy-v${index + 1}`, label, createdAt: `2026-08-${24 + index}`, article: simpleArticle('How to Specify Custom Ceiling Canopy Assemblies', 'Canora CA-120', 'ceiling-canopy sourcing guide'), visualAssets: [], sources: [phkSources[2]], findings: [], decisions: [], scores: { quality: 84 + index, geo: 80 + index * 2 }, lineage: lineageFor('ca-120'), provenance: { mode: 'demo', runId: `seed-canopy-${index + 1}`, disclosure: provenanceDisclosure } })),
  },
  {
    id: 'asset-phk', productId: 'phk-01', product: 'Aurelia PHK-01', title: initialArticle.title, type: 'article', typeLabel: 'B2B SEO 采购指南', status: '审核中', currentVersionId: 'phk-v1', updatedAt: '2026-08-27', owner: 'Mia Chen', color: '#c59b58',
    versions: [{ id: 'phk-v1', label: 'V1', createdAt: '2026-08-27', article: initialArticle, visualAssets, sources: phkSources, findings, decisions: [], scores: { quality: 82, geo: 76 }, lineage: fixedLineage, provenance: { mode: 'demo', runId: 'seed-phk-run', disclosure: provenanceDisclosure } }],
  },
  {
    id: 'asset-chain', productId: 'ch-08', product: 'Linea CH-08', title: 'Decorative Pendant Chain Sourcing Guide', type: 'article', typeLabel: '产品技术指南', status: '已通过', currentVersionId: 'chain-v2', updatedAt: '2026-08-24', owner: 'Mia Chen', color: '#8f8877',
    versions: ['V1', 'V2'].map((label, index) => ({ id: `chain-v${index + 1}`, label, createdAt: `2026-08-${23 + index}`, article: simpleArticle('Decorative Pendant Chain Sourcing Guide', 'Linea CH-08', 'decorative-chain guide'), visualAssets: [], sources: [phkSources[3]], findings: [], decisions: [], scores: { quality: 86 + index * 2, geo: 84 + index * 2 }, lineage: lineageFor('ch-08'), provenance: { mode: 'demo', runId: `seed-chain-${index + 1}`, disclosure: provenanceDisclosure } })),
  },
  {
    id: 'asset-body-visual', productId: 'mb-17', product: 'Arcus MB-17', title: 'Non-electrical Lamp Body Scope Diagram', type: 'visual', typeLabel: '范围信息图', status: '草稿', currentVersionId: 'body-v1', updatedAt: '2026-08-23', owner: 'AI Content Studio', color: '#806f5b',
    versions: [{ id: 'body-v1', label: 'V1', createdAt: '2026-08-23', visualAssets: [{ ...visualAssets[3], id: 'body-lineage', title: 'Mechanical scope boundary' }], sources: [phkSources[0]], findings: [], decisions: [], scores: { quality: 76, geo: 70 }, lineage: lineageFor('mb-17'), provenance: { mode: 'demo', runId: 'seed-body-visual', disclosure: provenanceDisclosure } }],
  },
];
