# LumaFlow frontend

React 19 + Vinext implementation of the LumaFlow lighting-hardware content operations workspace.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

The application uses `LocalContentOpsService`, a reducer-backed state machine and versioned browser storage under `lumaflow-workspace-v5`. It requires no API key or external service.

## Business flow

PHK-01 product knowledge → five-agent workflow → fact/SEO/GEO/brand review → critical-finding gate → human approval → V2 asset → Markdown/HTML/JSON export.

Workspace settings support validated JSON backup, v4 migration, v5 restore and confirmed clearing. GEO Score is a LumaFlow internal content-readiness rubric.
