# LumaFlow five-agent workflow contract

This package implements the PHK-01 task graph as a network-isolated reference service. It covers structured inputs and outputs, ordered execution, bounded retry, targeted revision, and a mandatory human approval gate.

The contract order is:

1. `product-parser@2.3`
2. `seo-strategy@1.8`
3. `content-writer@3.1`
4. `visual-brief@1.4`
5. `quality-review@2.6`

`WorkflowCoordinator.run()` can return `approved` only after both critical findings are revised and a named human approver is supplied. The package does not access the network or require API credentials.

Run the contract tests from the repository root:

```bash
python3 -m unittest discover services/lumaflow-agent-workflow/tests -v
```
