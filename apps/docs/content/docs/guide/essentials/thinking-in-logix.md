---
title: Runtime model
description: The small set of habits that keep Logix applications consistent.
---

Logix code stays readable when every file answers one question: definition, assembly, execution, or projection.

## Definition

State shape, action shape, reducers, and logic builders live near the feature.

```ts
const Feature = Logix.Module.make("Feature", { state, actions, reducers })
const logic = Feature.logic("logic", ($) => Effect.void)
```

## Assembly

Programs collect initial state, logic units, imports, and service layers.

```ts
const FeatureProgram = Logix.Program.make(Feature, { initial, logics: [logic] })
```

## Execution

Runtime owns execution, scheduling, diagnostics, and control-plane reports.

```ts
const runtime = Logix.Runtime.make(FeatureProgram)
const report = await Effect.runPromise(Logix.Runtime.check(FeatureProgram))
```

## Projection

React does not re-create the runtime model. It projects it.

```tsx
const feature = useModule(Feature.tag)
const value = useSelector(feature, fieldValue("value"))
```

Keep custom helpers mechanically reducible to these routes.
