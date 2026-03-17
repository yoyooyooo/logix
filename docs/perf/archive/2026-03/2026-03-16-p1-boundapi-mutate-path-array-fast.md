# 2026-03-16 · P1 `$.state.mutate` path array fast path

## 这刀做了什么

目标只做一件事：

- 让 `$.state.mutate((draft) => ...)` 这条已经拿到精确 `patch path array` 的路径，不再绕回通用 `recordPatch(...)` 的数组归一化慢路。

实现方式：

1. 在 `StateTransaction.ts` 增加：
- `markPatchArrayFastPath(...)`
- `recordPatchArrayFast(...)`
- array path 专用的 dirty-id 记录 helper

2. 在 `BoundApiRuntime.ts` 的 `state.mutate` 路径里：
- 对 `mutateWithPatchPaths(...)` 产出的 array path 先打 fast 标记
- 再交给现有 `recordStatePatch(...)`
- `'*'` 仍走旧路径

3. 这刀没有碰：
- `dispatch`
- `external-store`
- React 侧任何文件

## 证据

贴边 micro-bench：

- `single-top`
  - `legacy.p95=0.553ms`
  - `current.p95=0.184ms`
  - 明显更好
- `eight-top`
  - `legacy.p95=0.155ms`
  - `current.p95=0.095ms`
  - 明显更好
- `nested`
  - `legacy.p95=0.089ms`
  - `current.p95=0.084ms`
  - 基本持平略好
- `noop`
  - `legacy.p95=0.052ms`
  - `current.p95=0.054ms`
  - 基本持平

邻近守门：

- `StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts` 通过
- `StateTrait.RefList.ChangedIndicesFromTxnEvidence.test.ts` 通过
- `ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts` 通过
  - `dispatch.p50=0.090ms`
  - `dispatch.p95=0.197ms`
  - `residual.avg=0.074ms`

类型门：

- `tsc -p packages/logix-core/tsconfig.test.json --noEmit` 仍被仓库级既有噪声挡住
- 没有新增能指向本刀改动文件的独立类型错误

## 裁决

结论：保留，建议合入 `v4-perf`。

原因：

1. 命中的就是这刀的目标路径
2. `single-top` 与 `eight-top` 都有明确正收益
3. `nested` 与 `noop` 没有出现足够大的负向回退
4. 邻近守门没有把已收口结果拉坏
