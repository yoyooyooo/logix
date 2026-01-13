---
title: Runnable examples index
description: Map Guide Patterns/Recipes to runnable code in examples/logix and examples/logix-react.
---

This page maps “Cookbook-style docs” (Patterns/Recipes) to runnable code under `examples/*`.

## Where examples live

- `examples/logix`: scenario scripts (no UI). Run a file with: `pnpm -C examples/logix exec tsx <path>`
- `examples/logix-react`: a runnable React app + DevTools. Run with: `pnpm -C examples/logix-react dev`

## Mappings

### Patterns

| Guide page | Runnable code |
| --- | --- |
| [Pagination loading](../patterns/pagination) | `apps/docs/content/docs/guide/get-started/tutorial-complex-list.md` (tutorial) · `examples/logix-react/src/modules/querySearchDemo.ts` |
| [Optimistic updates](../patterns/optimistic-update) | `examples/logix/src/scenarios/optimistic-toggle.ts` · `examples/logix/src/scenarios/optimistic-toggle-from-pattern.ts` · `examples/logix/src/patterns/optimistic-toggle.ts` |
| [Search + detail linkage](../patterns/search-detail) | `examples/logix/src/scenarios/search-with-debounce-latest.ts` · `examples/logix/src/scenarios/cross-module-link.ts` · `examples/logix-react/src/modules/querySearchDemo.ts` |
| [Internationalization (i18n)](../patterns/i18n) | `examples/logix/src/i18n-message-token.ts` · `examples/logix/src/i18n-async-ready.ts` · `examples/logix-react/src/modules/i18n-demo.ts` |
| [Form wizard](../patterns/form-wizard) | No dedicated wizard yet. Closest form-heavy demos: `examples/logix-react/src/modules/trait-form.ts` · `examples/logix-react/src/modules/complex-trait-form.ts` |

### Recipes

| Guide page | Runnable code |
| --- | --- |
| [ExternalStore](./external-store) | `examples/logix/src/scenarios/external-store-tick.ts` |
