# 2026-03-15 · P1-1 第一刀失败：dispatch reducer patch anchor 预编译

## 试了什么

这一刀只试最小切面：

- 只覆盖 `ModuleRuntime.dispatch.ts` 里 reducer sink 产出的 patch path
- 把安全字段路径预编成稳定 `FieldPathId`
- `StateTransaction` 增加 id 直写入口
- 旧字符串路径保留为回退

没有碰：

- watcher
- externalStore
- module-as-source
- txn queue
- deferred worker

## 为什么放弃这版

贴边 micro-bench 的结果不稳定：

- `single` 场景有时更快，有时持平
- `8 fields` 平均值更低，但 `p95` 优势不稳定
- `64 fields` 场景里 `p95` 反而变差

这不满足当前母线的合流门槛：

- 需要明确
- 需要稳定
- 需要正向收益

当前这版更像“均值略好，但尾部不稳”的试探，不应把代码合回 `v4-perf`。

## 证据

### 单元守门

实现期间验证通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "precompilePatchPath|recordPatchId"
```

### dispatch shell 邻近守门

实现期间验证通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

输出：

- `dispatch.p50=0.092ms`
- `dispatch.p95=0.170ms`
- `residual.avg=0.075ms`

说明：

- 这版没有把现有 dispatch shell 收口结果明显拉坏
- 但这只能说明“没有灾难性回退”，不能证明它有明确收益

### 贴边 micro-bench

命令：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerPatchAnchor.Perf.off.test.ts
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerPatchAnchor.Perf.off.test.ts
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerPatchAnchor.Perf.off.test.ts
```

三轮摘要：

第一轮：

- `single.string.p95=0.009ms`
- `single.anchor.p95=0.007ms`
- `eight.string.p95=0.006ms`
- `eight.anchor.p95=0.006ms`
- `many.string.p95=0.009ms`
- `many.anchor.p95=0.009ms`

第二轮：

- `single.string.p95=0.007ms`
- `single.anchor.p95=0.007ms`
- `eight.string.p95=0.007ms`
- `eight.anchor.p95=0.006ms`
- `many.string.p95=0.011ms`
- `many.anchor.p95=0.016ms`

第三轮：

- `single.string.p95=0.007ms`
- `single.anchor.p95=0.008ms`
- `eight.string.p95=0.009ms`
- `eight.anchor.p95=0.005ms`
- `many.string.p95=0.011ms`
- `many.anchor.p95=0.015ms`

结论：

- `single` 不稳定
- `8 fields` 有局部正向
- `64 fields` 的 `p95` 明显更差

## 类型门

命令：

```bash
node node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 失败
- 失败点仍是既有 `Contracts.019.TxnPerfControls.test.ts` 的 JSON schema 解析
- 没有新增指向这版试探代码的类型错误

## 裁决

- 结果分类：`discarded_or_pending`
- 当前裁决：不合代码，只保留 docs/evidence-only

## 如果未来重开

建议不要再沿“统一预编译所有 reducer sink path”继续叠。

更合理的重开方式只有两种：

1. 只打 `single field` 高频路径
2. 只在可证明尾部不会恶化的固定 path 集合上启用

在拿到新的更细分证据前，这条线先停。
