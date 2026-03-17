# 2026-03-19 · P2-4A projection budget 证据链升级

## 范围

- 只做 runtime devtools / projection budget 证据链升级。
- 目标是把 projection 成本从“总量计数”升级到“事件维度可归因”。
- 明确不做 `P2-4B Dirty Evidence 单一物化管线`。
- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - `packages/logix-core/src/Debug.ts`

## 实现摘要

### 1) `exportBudget` 增加事件维度归因

在 `DevtoolsHub` 的全局与 runtime bucket 两层 `exportBudget` 中新增：

- `byEvent: Map<string, ProjectionBudgetAttribution>`

归因规则：

1. 优先按 `RuntimeDebugEventRef.kind + label` 聚合（`runtime-debug-event:*`）。
2. 若事件无法产出 `RuntimeDebugEventRef`，回退到 `event.type`（`raw-debug-event:*`）。
3. `clearDevtoolsEvents(...)` 会同步清空对应 bucket 的 `byEvent`，并重算全局汇总，保持口径一致。

### 2) evidence summary 挂载 projection budget 摘要

`exportDevtoolsEvidencePackage(...)` 的 `summary` 新增：

- `summary.projectionBudget.totals`
- `summary.projectionBudget.byEvent`（按 `dropped+oversized` 排序）

这样离线 evidence 包可以直接回答“哪个事件类型在持续消耗 projection budget”。

### 3) 对外类型面补齐

`packages/logix-core/src/Debug.ts` 新增导出：

- `ProjectionBudgetAttribution`

用于 Devtools/UI 侧按类型安全方式消费 `exportBudget.byEvent`。

## 贴边证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4a-projection-budget.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4a-projection-budget.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4a-projection-budget.diff.json`

关键结论：

1. 同一 synthetic 负载下，`exportBudget` 总量保持一致（`oversized=2`）。
2. after 口径可以拆出两个独立热点：
   - `runtime-debug-event:action:HugeAction` → `oversized=1`
   - `runtime-debug-event:devtools:trace:test` → `oversized=1`
3. `byEvent` 求和与总量严格一致，说明归因链是可核对的，不是额外估算值。
4. `exportEvidencePackage().summary` 已包含 `projectionBudget`，满足离线复盘证据需求。

## 最小验证

已执行：

1. `pnpm -C packages/logix-core typecheck:test`
2. `pnpm -C packages/logix-core exec vitest run test/Debug/DevtoolsHub.test.ts`
3. `pnpm exec tsx`（运行 synthetic attribution 脚本，结果已落盘到 `after/diff`）
4. `python3 fabfile.py probe_next_blocker --json`

结果：

- `logix-core` typecheck 通过。
- `DevtoolsHub` 测试通过（8/8）。
- projection budget 事件归因结果可复现且可核对。
- `probe_next_blocker` 返回 `status: "clear"`，current probe 队列未打红。
