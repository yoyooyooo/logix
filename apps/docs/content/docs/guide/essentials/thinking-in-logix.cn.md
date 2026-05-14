---
title: Runtime model
description: 让 Logix 应用保持一致的一组小习惯。
---

当每个文件都只回答一个问题时，Logix 代码会保持清晰：定义、装配、执行或投影。

## Definition

state shape、action shape、reducers 和 logic builders 放在 feature 附近。

```ts
const Feature = Logix.Module.make("Feature", { state, actions, reducers })
const logic = Feature.logic("logic", ($) => Effect.void)
```

## Assembly

Program 收集 initial state、logic units、imports 和 service layers。

```ts
const FeatureProgram = Logix.Program.make(Feature, { initial, logics: [logic] })
```

## Execution

Runtime 拥有执行、调度、诊断和控制面报告。

```ts
const runtime = Logix.Runtime.make(FeatureProgram)
const report = await Effect.runPromise(Logix.Runtime.check(FeatureProgram))
```

## Projection

React 不重新创建 runtime 模型，只投影 runtime。

```tsx
const feature = useModule(Feature.tag)
const value = useSelector(feature, fieldValue("value"))
```

自定义 helper 应该可以机械还原到这些路线。
