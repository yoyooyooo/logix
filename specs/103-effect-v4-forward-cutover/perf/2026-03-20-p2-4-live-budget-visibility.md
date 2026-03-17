# 103 / perf · 2026-03-20 · P2-4 live budget visibility

对应 perf 记录：`docs/perf/archive/2026-03/2026-03-20-p2-4-live-budget-visibility.md`

## 本次裁决

在不改 core ingest 热路的前提下，允许在 devtools-react `state` 读取路径合成 `devtools:projectionBudget` 可见性事件，作为 live budget hotspot 展示锚点。

## Why

- core 侧 `exportBudget.byEvent` 已具备统计与归因。
- import 路径已有可见性，live 路径此前缺少稳定展示入口。
- 目标是“读路径补闭环”，不增加写路径负担。

## 代码落点

- `packages/logix-devtools-react/src/internal/state/projection-budget.ts`
- `packages/logix-devtools-react/src/internal/state/compute.ts`
- `packages/logix-devtools-react/src/internal/state/logic.ts`
- `packages/logix-devtools-react/test/internal/DevtoolsStateProjectionBudget.test.ts`

## 验证门

已通过：

1. `pnpm -C packages/logix-devtools-react typecheck`
2. `pnpm -C packages/logix-devtools-react test`

## 风险评估

- 热路径风险：无新增 core 写路径逻辑；仅 UI 读取时归一化与合成。
- UI 噪声风险：通过“已有同类事件不重复注入”控制重复。
- 口径漂移风险：import/live 复用同一预算摘要解析逻辑，降低漂移。
