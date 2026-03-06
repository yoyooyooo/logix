# 04 · Agent 执行手册（接力专用）

本手册给后续维护 agent：拿到这个目录后，按步骤执行，不需要重新建模。

默认策略：
- 若未特别说明，一律按 `05-forward-only-vnext-plan.md` 的“零存量用户”路线执行。
- 不做兼容层，不保留弃用期。

执行新增约束（本仓当前策略）：
- **每一刀必须独立提交**（一个 commit 对应一刀，避免“多刀混在一起”导致后续回滚/二分困难）。
- 每刀完成后，必须在 `docs/perf/05-forward-only-vnext-plan.md` 与 `docs/perf/03-next-stage-major-cuts.md` 勾选对应条目为 `[x]`。

## 0. 先读顺序

1. `docs/perf/README.md`
2. `docs/perf/06-current-head-triage.md`
3. `docs/perf/05-forward-only-vnext-plan.md`
4. `docs/perf/03-next-stage-major-cuts.md`
5. 只在需要补历史上下文时再读旧日期记录

## 1. 进入实现前的硬约束

1. 不破坏事务窗口无 IO 原则。
2. 不破坏稳定标识（instanceId/txnSeq/opSeq）。
3. 不以删除诊断锚点换性能。
4. 允许 forward-only 破坏性 API 演进，不做兼容层。

## 2. 推荐执行节奏

1. 先看 `06-current-head-triage.md`，确认这轮是在做真实 runtime 刀、证据纠偏，还是 gate 清理。
2. 默认只做一个 next cut：当前主线是 `R-1：txnLanes backlog policy split`。
3. 先跑与该刀最贴边的 targeted tests / targeted perf，再决定要不要补 broader matrix。
4. 只有当 `R-1` 明确无稳定收益，才回到 `externalStore` 的 broad residual 做第二优先级复核。

## 3. 复测命令模板

1. 类型：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-react typecheck:test`

2. 核心回归：
- `pnpm -C packages/logix-core test`

3. Browser perf 重点：
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/txn-lanes.test.tsx -t "browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`

4. 可选 collect（落盘到 spec perf 目录）：
- `pnpm perf collect -- --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json`
- `pnpm perf collect -- --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json`

## 4. 验收门

1. 主要门：
- `txnLanes.urgentBacklog` 的 `urgent.p95<=50ms` 要稳定通过到 `steps=2000`（`mode=default/off`）。

2. 第二优先级门：
- `externalStore.ingest.tickNotify` 的 `full/off<=1.25` broad matrix 要稳定通过到 `watchers=512`。

3. 防回归门：
- `runtimeStore.noTearing.tickNotify` 继续保持通过。
- `form.listScopeCheck` 继续保持通过。

4. 证据卫生门：
- `watchers.clickToPaint` 若仍表现为 `watchers=1` 已超线且曲线非单调，先判为 suite 语义问题，不直接下 runtime 回归结论。
- `converge.txnCommit` 的 `reason=notApplicable` 不计入真实性能失败。

5. 稳定性门：
- quick 至少 3 轮，按中位数结论判定。

## 5. 每轮完成后必须回写

1. 更新 `docs/perf/` 对应专题结论。
2. 新增日期记录，写明：
- 改动点
- 证据文件路径
- 通过/未通过门
- 下一刀计划
3. 同步 `specs/103-effect-v4-forward-cutover/perf/` 下的证据索引文档（如果本轮产出新 report/diff）。
