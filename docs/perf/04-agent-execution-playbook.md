# 04 · Agent 执行手册（接力专用）

本手册给后续维护 agent：拿到这个目录后，按步骤执行，不需要重新建模。

默认策略：
- 若未特别说明，一律按 `05-forward-only-vnext-plan.md` 的“零存量用户”路线执行。
- 不做兼容层，不保留弃用期。

执行新增约束（本仓当前策略）：
- **每一刀必须独立提交**（一个 commit 对应一刀，避免“多刀混在一起”导致后续回滚/二分困难）。
- 每刀完成后，必须在 `docs/perf/05-forward-only-vnext-plan.md` 与 `docs/perf/03-next-stage-major-cuts.md` 勾选对应条目为 `[x]`。

## 0. 先读顺序

1. `docs/perf/01-architecture-keep-vs-change.md`
2. `docs/perf/02-externalstore-bottleneck-map.md`
3. `docs/perf/03-next-stage-major-cuts.md`
4. 最新日期记录（例如 `2026-03-04-*.md`）

## 1. 进入实现前的硬约束

1. 不破坏事务窗口无 IO 原则。
2. 不破坏稳定标识（instanceId/txnSeq/opSeq）。
3. 不以删除诊断锚点换性能。
4. 允许 forward-only 破坏性 API 演进，不做兼容层。

## 2. 推荐执行节奏

1. 先做 A 刀（full 诊断懒构造），提交最小可测切片。
2. 复测三件套，确认 `externalStore` 相对预算有改善。
3. 再做 B 刀（externalStore 批处理写回），复测并观察抖动。
4. 若 A/B 通过，再推进 C 刀与 D 刀。

## 3. 复测命令模板

1. 类型：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-react typecheck:test`

2. 核心回归：
- `pnpm -C packages/logix-core test`

3. Browser perf 重点：
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`

4. 可选 collect（落盘到 spec perf 目录）：
- `pnpm perf collect -- --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json`

## 4. 验收门

1. 主要门：
- `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 要稳定通过到 `watchers=512`。

2. 防回归门：
- `runtimeStore.noTearing.tickNotify` 继续保持通过。
- `form.listScopeCheck` 继续保持通过。

3. 稳定性门：
- quick 至少 3 轮，按中位数结论判定。

## 5. 每轮完成后必须回写

1. 更新 `docs/perf/` 对应专题结论。
2. 新增日期记录，写明：
- 改动点
- 证据文件路径
- 通过/未通过门
- 下一刀计划
3. 同步 `specs/103-effect-v4-forward-cutover/perf/` 下的证据索引文档（如果本轮产出新 report/diff）。
