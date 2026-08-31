# LumaFlow five-agent reference flow

This directory is an offline, fixture-only reference for the CrewAI task graph used in the portfolio story. It demonstrates contracts, sequencing, bounded retry, targeted revision, and a human approval gate without importing CrewAI, calling a model, or accessing the network.

The public frontend uses its own typed deterministic mock service. This Python package is architecture evidence only and is intentionally disconnected from the browser demo.

```bash
python -m unittest discover prototype/lumaflow-crew/tests -v
```

The task order is fixed:

1. `product-parser@2.3`
2. `seo-strategy@1.8`
3. `content-writer@3.1`
4. `visual-brief@1.4`
5. `quality-review@2.6`

`FixtureOnlyFlow.run()` cannot finish as approved until both critical findings have been revised and an explicit human decision is supplied.
