# AI Content Operations Hub — Development Rules

## Product objective

Build a deterministic, interview-ready frontend demo for an AI Content Operations Hub used by an export-oriented lighting-hardware manufacturer. The complete story is: product master and BOM → simulated five-Agent generation → factual/SEO/GEO/brand review → targeted revision → human approval → versioned asset and export.

## Scope invariants

- Frontend storytelling and interaction quality are the priority.
- Use fictional, anonymized, deterministic demo data only.
- Keep SEO and GEO as first-class review dimensions.
- Label GEO Score as a LumaFlow internal evaluation rubric, never an industry or search-platform standard.
- Do not integrate WordPress or another CMS.
- Do not add a real LLM, RAG pipeline, vector database, relational database, task queue, authentication, or multi-tenant backend.
- Simulate asynchronous Agents with a typed mock service and predictable timing.
- Use browser storage only for local demo state and provide a reset action.
- Do not claim mock metrics, Agents, citations, or business outcomes are live production results.
- Preserve the archived medal prototype under `legacy/` unless a confirmed task explicitly removes it.
- Keep the private project master file excluded from Git and deployment artifacts.

## UX requirements

- Five primary modules: Workbench, Product Knowledge, Content Studio, Review Center, Asset Library.
- Every page must support the fixed Aurelia PHK-01 pendant-light hardware kit story.
- Prefer concrete lighting-hardware and OEM procurement copy over generic placeholders.
- Make the non-electrical boundary explicit: no lamp holder, wire, driver, light source, or electrical certification.
- Include intentional loading, empty, success, warning, and error states where they strengthen the story.
- Use accessible labels, visible focus states, keyboard-friendly controls, and responsive layouts.
- Browser-check each completed product slice before moving on.

## Completion criteria

- Production build passes.
- The fixed demo can be completed without external services.
- The plated-steel-versus-solid-brass conflict can be found and corrected.
- The non-electrical-kit-versus-complete-light conflict can be found and corrected.
- GEO Score visibly improves from 76 to 86 after both recommendations are accepted.
- Approval creates a new V2 content asset/version that persists locally.
- Markdown, HTML, and JSON export work.
- README and demo script clearly distinguish recreated workflow, anonymized retrospective data, mock behavior, and production roadmap.
