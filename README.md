# LumaFlow AI Content Operations Hub

LumaFlow is an interview-ready, frontend-first product demo for overseas B2B lighting-hardware content teams. Its fixed case follows the fictional **Aurelia PHK-01 antique-brass pendant-light hardware kit** from product knowledge to an approved, versioned content asset.

**Live demo:** https://lumaflow-ai-content-ops.holy-rabbit.chatgpt.site

## What the demo proves

```text
product master + BOM + finish evidence
  → five deterministic specialist agents
  → fact / SEO / GEO / brand review
  → targeted revision + human approval gate
  → V2 asset lineage + Markdown / HTML / JSON export
```

The 5–7 minute path is deliberately narrow and repeatable:

1. Inspect PHK-01's BOM, AB-07 finish route, source versions, and non-electrical scope.
2. Run a simulated five-agent workflow and inspect each task's input evidence, output schema, Prompt version, and model route.
3. Correct two critical errors: plated steel described as solid brass, and a non-electrical kit described as a complete pendant light.
4. Accept two GEO recommendations and observe the **LumaFlow internal rubric** move from 76 to 86.
5. Approve the article, create V2, refresh to confirm local persistence, and export Markdown, HTML, or JSON.

## Product modules

- **Workbench** — active task, approval risks, anonymized retrospective metrics, model evaluation, and three UAT rounds.
- **Product Knowledge** — product master, BOM tree, manufacturing route, finish swatches, sources, and included/excluded scope.
- **Content Studio** — controlled brief, five simulated Agents, evidence inputs, structured schemas, versioned Prompts, routing, progress, and retry.
- **Review Center** — fact, SEO, GEO, and brand findings with targeted patches and a critical-issue approval gate.
- **Asset Library** — V1/V2 history, knowledge and Prompt lineage, human decisions, visual assets, and three export formats.

## Evidence and disclosure

Every company, product, source filename, image, sample, and workflow result is fictional or anonymized. The app separates two kinds of evidence:

- **Current demo state:** deterministic browser data used to make the interaction repeatable.
- **Anonymized retrospective snapshots:** explicitly labeled historical samples with formulas and denominators, including 150→30 minutes, 72→126 monthly pieces, 64%→85% first-pass approval, and three UAT rounds.

The app does not contain a live LLM, RAG service, vector database, relational database, task queue, authentication system, CMS, WordPress integration, or production telemetry. It never presents simulated Agents, citations, scores, or metrics as live production output. GEO Score is a LumaFlow internal evaluation rubric, not an industry or platform standard.

## Run locally

Node.js 22.13+ is required.

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. No API key or external service is required. Use **Reset demo** at any time to clear browser-local V4 state.

## Quality gates

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm --prefix frontend run build
python3 -m unittest discover prototype/lumaflow-crew/tests -v
```

## Repository map

```text
frontend/                       React + Vinext deterministic portfolio app
prototype/lumaflow-crew/        offline five-agent fixture reference
legacy/medal-seo-prototype/     archived original Python/CrewAI project
docs/portfolio/                 product, data, interaction, QA, demo, and architecture docs
```

The typed frontend service surface preserves the future `/api/v2` contract, but the published app always selects the mock adapter. The Python reference demonstrates task sequencing, structured outputs, bounded retry, and human gating while explicitly prohibiting network access.

## Portfolio documentation

- [Project definition](docs/portfolio/00-project-definition.md)
- [Product specification](docs/portfolio/01-product-spec.md)
- [Mock data specification](docs/portfolio/02-mock-data-spec.md)
- [Interaction and state](docs/portfolio/03-interaction-spec.md)
- [Acceptance checklist](docs/portfolio/04-acceptance-checklist.md)
- [5–7 minute demo script](docs/portfolio/05-demo-script.md)
- [Architecture and development handoff](docs/portfolio/06-development-handoff.md)
- [Resume claim → product evidence map](docs/portfolio/08-resume-evidence-map.md)
