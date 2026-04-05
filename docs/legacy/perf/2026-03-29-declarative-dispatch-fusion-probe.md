# 2026-03-29 · declarative dispatch fusion probe

## 目标

确认 latest `main` 上 same-target declarative fanout 是否存在可融合的 target commit 壳。

## 场景

- 单个 Source module
- 单个 Target module
- 同一 target 上有 `fanout = 1 / 8 / 32` 个 declarative dispatch edge
- 单次 `sourceRt.dispatch(set)` 后，统计同一个 `targetRt` 的 `changesWithMeta` commit 次数

## 实测读数

```json
{
  "fanout1": 1,
  "fanout8": 1,
  "fanout32": 1
}
```

## 本次裁决

- route classification: `cheap_local_positive_on_declarative_side`
- 子结论：`same_target_declarative_dispatch_batched_to_one_commit`

## 含义

same-target declarative batching 已命中主问题：

- 同一 source commit
- 同一 target module
- 多条 declarative edge

不再开出 `fanout` 级别的 target commits。

## 验证命令

```sh
./packages/logix-core/node_modules/.bin/vitest run packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.test.ts
```
