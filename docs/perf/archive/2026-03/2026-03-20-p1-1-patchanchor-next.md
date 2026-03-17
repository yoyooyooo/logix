# 2026-03-20 · P1-1 patchanchor next（docs/evidence-only）

## 结果分类

- `discarded_or_pending`
- `accepted_with_evidence=false`

## 本轮唯一切口

- 仅试探 `dispatch/BoundApi` 的 producer-side patchPath array 预取补齐：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- 不触达以下失败切口：
  - `p3 no-prod-txn-history`
  - `p4 DevtoolsHub projection hints`
  - `p5 full-lazy raw eager-only meta`
  - `p6 full-lazy traitConverge heavy decision/detail`

## 负证据

- 贴边 micro 证据命令（临时试验，已回退）：
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.patchPathArrayPrefetch.Perf.off.test.ts`
- 关键输出：
  - `rawMs=10.982`
  - `prefetchedMs=21.760`
  - `ratio=1.9815`
- 结论：
  - 该最小切口在当前实现形态下呈负收益。
  - 已清理实现半成品与临时测试文件，代码面不保留改动。

## 最小验证（回退后）

- `pnpm -C packages/logix-core typecheck:test`：passed
- `pnpm -C packages/logix-core exec vitest run test/internal/FieldPath/FieldPath.DirtySetReason.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts`：passed
- `python3 fabfile.py probe_next_blocker --json`：`status=clear`

## 收口说明

- 本线按失败门执行 `docs/evidence-only` 收口。
- 未引入 public API 变动。
- 后续若要重开 `P1-1`，需要先拿到新的 token 化收益假设与更窄贴边证据方案。
