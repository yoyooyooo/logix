# Playground Variant Mockups

These mockups are visual pressure cases for 166 Professional Logic Playground vNext.

They focus on data size, scroll ownership, bounded panel behavior and resizable layout decisions. Their implementation constraints are captured in [../../ui-contract.md](../../ui-contract.md) and [../../visual-pressure-cases/](../../visual-pressure-cases/).

| File | Pressure Case | Contract |
| --- | --- | --- |
| [01-action-dense.png](./01-action-dense.png) | Program exposes many reflected actions | [01-action-dense.md](../../visual-pressure-cases/01-action-dense.md) |
| [02-state-large.png](./02-state-large.png) | State projection is large and deeply nested | [02-state-large.md](../../visual-pressure-cases/02-state-large.md) |
| [03-trace-heavy.png](./03-trace-heavy.png) | Scenario produces many trace events | [03-trace-heavy.md](../../visual-pressure-cases/03-trace-heavy.md) |
| [04-diagnostics-dense.png](./04-diagnostics-dense.png) | Check and Trial return many diagnostics | [04-diagnostics-dense.md](../../visual-pressure-cases/04-diagnostics-dense.md) |
| [05-scenario-driver-payload.png](./05-scenario-driver-payload.png) | No-UI demo needs curated triggers and payloads | [05-scenario-driver-payload.md](../../visual-pressure-cases/05-scenario-driver-payload.md) |

Implementation reading order:

1. Preserve the full-viewport shell with top command bar, horizontal source/runtime split and bottom evidence drawer.
2. Keep scroll ownership local to the overflowing data surface.
3. Keep Source editor and Runtime inspector visible under every pressure case.
4. Prefer search, filtering, grouping and virtualization for long lists.
5. Treat the Markdown contracts as the acceptance surface for 166 layout and interaction implementation.
