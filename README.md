# LumaFlow AI Content Operations Hub

LumaFlow is an AI content operations workspace for export-oriented lighting-hardware manufacturers. It turns controlled product knowledge into governed, reviewable and versioned B2B content.

**Application:** https://lumaflow-ai-content-ops.holy-rabbit.chatgpt.site

## Operating workflow

```text
product master + released BOM + finish standard + claims policy
  → five-agent workflow orchestration
  → fact / SEO / GEO / brand review
  → targeted revision + human approval gate
  → immutable V2 asset + Markdown / HTML / JSON export
```

The active product is **Aurelia PHK-01**, a non-electrical antique-brass pendant-light hardware kit. The workflow preserves the material boundary between stamped steel and AB-07 antique-brass electroplating, as well as the commercial boundary that excludes lamp holders, wire, drivers, light sources and electrical certification.

## Product modules

- **Workbench** — monthly delivery, pending review, critical risks, first-pass approval, active tasks, 90-day operating performance and model-routing policy.
- **Product Knowledge** — product master, BOM tree, process route, finish control, source ownership, approval dates and included/excluded scope.
- **Content Studio** — controlled Brief, five-agent status, evidence inputs, output schemas, Prompt versions, model strategy and rerun handling.
- **Review Center** — fact, SEO, GEO and brand findings with targeted changes and critical-issue approval gates.
- **Asset Library** — V1/V2 lineage, knowledge and Prompt snapshots, human decisions, visual assets and three export formats.

GEO Score is a LumaFlow internal content-readiness rubric, not an industry or search-platform standard.

## Local workspace

The application runs as a single-user browser workspace and does not require an API key. Tasks, review decisions and asset versions are saved automatically under `lumaflow-workspace-v5`.

Workspace settings provide:

- v5 JSON backup;
- validated v5 or v4 restore with a 5 MB limit;
- non-destructive handling of invalid files;
- a two-step confirmation before clearing local data.

## Run locally

Node.js 22.13+ is required.

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Quality gates

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm --prefix frontend run build
python3 -m unittest discover services/lumaflow-agent-workflow/tests -v
```

## Repository map

```text
frontend/                              React + Vinext local workspace
services/lumaflow-agent-workflow/     five-agent workflow contracts
legacy/medal-seo-prototype/           archived earlier implementation
docs/product/                         product, data, state, API and operations docs
```

The frontend keeps the `ContentOpsService` method surface and `/api/v2` contract for a future service adapter. The current application uses `LocalContentOpsService`, browser persistence and versioned JSON backup.

## Product documentation

- [Product definition](docs/product/00-project-definition.md)
- [Product specification](docs/product/01-product-spec.md)
- [Business data specification](docs/product/02-business-data-spec.md)
- [Interaction specification](docs/product/03-interaction-spec.md)
- [State and persistence](docs/product/03-state-spec.md)
- [Acceptance checklist](docs/product/04-acceptance-checklist.md)
- [Operator guide](docs/product/05-operator-guide.md)
- [Architecture](docs/product/06-architecture.md)
- [API contract](docs/product/07-api-contract.yaml)
- [Operations metrics](docs/product/08-operations-metrics.md)
