# 2026-03-20 · P2-4 live budget visibility

## 目标

在已完成 import 可见性的前提下，补齐 live 侧 `projection budget` 热点可见性闭环，且不增加 ingest 热路径成本。

关联 spec/perf 记录：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-4-live-budget-visibility.md`

## 约束与边界

- 仅改 `packages/logix-devtools-react/src/internal/state/**` 与对应测试。
- 不重做 `2026-03-18 p4 DevtoolsHub projection hints`。
- 不向 core debug event 增加重 payload。
- 不触碰 dispatch/state write 主路径。

## 实现摘要（最小闭环）

1. 新增 `state` 侧统一预算摘要读取模块：
   - `src/internal/state/projection-budget.ts`
   - 提供 import/live 共用的 `Top10 hotspot` 归一化逻辑。
2. `computeDevtoolsState` 在 live 读取路径消费 `snapshot.exportBudget`：
   - 当当前 runtime timeline 没有 `devtools:projectionBudget` 事件且 `exportBudget` 非空时，读取时合成 1 条轻量事件。
   - 合成事件只携带 `totals + byEvent(Top10)`，不引入新 core payload。
   - 增加重复注入保护，避免已有同类事件时重复显示。
3. import 路径复用同一预算摘要读取逻辑，统一口径。

## 变更文件

- `packages/logix-devtools-react/src/internal/state/projection-budget.ts`（新增）
- `packages/logix-devtools-react/src/internal/state/compute.ts`
- `packages/logix-devtools-react/src/internal/state/logic.ts`
- `packages/logix-devtools-react/test/internal/DevtoolsStateProjectionBudget.test.ts`（新增）

## 验证

按最小验证命令执行并通过：

1. `pnpm -C packages/logix-devtools-react typecheck`
2. `pnpm -C packages/logix-devtools-react test`

新增测试覆盖：

- live `exportBudget` 存在热点时，timeline 可见 `devtools:projectionBudget`。
- 已存在同类事件时不重复注入。

## 结果分类

- `accepted_with_evidence`
- 原因：live 读取路径已稳定可见预算热点，测试全绿，且未引入 core 热路写入成本。
