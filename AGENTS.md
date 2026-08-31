# AI Content Operations Hub — Development Rules

## Product objective

Build and maintain a serious single-user content operations workspace for an export-oriented lighting-hardware manufacturer. The operating path is: approved product knowledge → five-agent workflow → factual/SEO/GEO/brand review → targeted revision → human approval → versioned asset and export.

## Scope invariants

- Keep the five primary modules: Workbench, Product Knowledge, Content Studio, Review Center and Asset Library.
- Keep SEO and GEO as first-class review dimensions.
- Label GEO Score as a LumaFlow internal evaluation rubric, never an industry or search-platform standard.
- Preserve the non-electrical PHK-01 boundary: no lamp holder, wire, driver, light source, electrical assembly or certification conclusion.
- Use `LocalContentOpsService` and browser storage for the active workspace.
- Preserve the `ContentOpsService` interface and `/api/v2` adapter contract.
- Do not add WordPress, another CMS, a database, authentication, a remote task queue or a model service without an explicitly approved scope change.
- Keep workspace backup limited to business state; exclude navigation, open drawers and editing controls.
- Preserve the archived medal implementation under `legacy/`.
- Keep the private project master file excluded from Git and deployment artifacts.

## UX requirements

- Use concise enterprise product language and dense, task-oriented layouts.
- Product readiness controls whether a content task can be created; blocked products must list the exact knowledge gaps.
- Show task status, evidence inputs, output schemas, Prompt versions and model-routing policy without exposing hidden reasoning.
- Critical material and delivery-scope findings must block approval.
- Use accessible labels, visible focus states, keyboard-friendly controls and responsive layouts.
- Validate every completed product slice in desktop and 390px browser views.

## Completion criteria

- The PHK-01 knowledge-to-V2 workflow completes without an external service.
- The plated-steel-versus-solid-brass and non-electrical-kit-versus-complete-light conflicts can be corrected.
- GEO readiness moves from 76 to 86 after both recommendations are accepted.
- Approval creates a V2 asset that persists locally and exports as Markdown, HTML and JSON.
- v4 state migration and v5 backup, restore, invalid-file handling and confirmed clearing work.
- Lint, typecheck, Vitest, Python contract tests, Playwright and the production build all pass.
