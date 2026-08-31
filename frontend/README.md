# LumaFlow frontend

React 19 + Vinext implementation of the deterministic Aurelia PHK-01 portfolio demo.

```bash
npm ci
npm run dev
```

The application uses a typed mock `ContentOpsService`, reducer state machine, predictable Agent timing, and versioned browser storage under `lumaflow-demo-v4`. It has no backend or API-key requirement.

The fixed flow is: product master/BOM/finish evidence → five simulated Agents → fact/SEO/GEO/brand review → two critical corrections → GEO 76→86 → human approval → persistent V2 → Markdown/HTML/JSON export.

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Images under `public/` are fictional generated demo assets. The app's GEO Score is a LumaFlow internal rubric, not an industry or search-platform standard.
