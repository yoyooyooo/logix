# 04 · Agent 执行手册（接力专用）

本手册给后续维护 agent：拿到这个目录后，按步骤执行，不需要重新建模。

默认策略：
- 若未特别说明，一律按 `05-forward-only-vnext-plan.md` 的“零存量用户”路线执行。
- 不做兼容层，不保留弃用期。

执行新增约束（本仓当前策略）：
- **主会话保持干净**：主会话只做 routing / 审查 / 合流，不直接承载 runtime / benchmark / gate 实施；统一协议见 `docs/perf/08-perf-execution-protocol.md`。
- **每条实施线只承载一刀，并在独立 `worktree/branch/subagent` 中推进**；中间试验可存在于线内，但交回主会话前，相对主分支只允许保留 `1` 个最终 HEAD commit。
- **成功与失败都要以 `1` 个最终提交收口**：成功线保留最终有效 diff；失败线清掉半成品代码，只保留 dated evidence / `docs/perf/*` 结论与必要路由更新。
- 只有“真正完成并被吸收”的 major cut，才在 `docs/perf/05-forward-only-vnext-plan.md` 与 `docs/perf/03-next-stage-major-cuts.md` 勾选对应条目为 `[x]`；失败线只写 dated record 与路由回写，不得假装完成。

## 0. 先读顺序

1. `docs/perf/README.md`
2. `docs/perf/08-perf-execution-protocol.md`
3. `docs/perf/06-current-head-triage.md`
4. `docs/perf/07-optimization-backlog-and-routing.md`
5. `docs/perf/05-forward-only-vnext-plan.md`
6. `docs/perf/03-next-stage-major-cuts.md`
7. 只在需要补历史上下文时再读旧日期记录

## 1. 进入实现前的硬约束

1. 不破坏事务窗口无 IO 原则。
2. 不破坏稳定标识（instanceId/txnSeq/opSeq）。
3. 不以删除诊断锚点换性能。
4. 允许 forward-only 破坏性 API 演进，不做兼容层。

## 2. 推荐执行节奏

1. 主会话先看 `08-perf-execution-protocol.md`，确认这轮是协调/审查角色，而不是直接下场实施。
2. 再看 `06-current-head-triage.md`，确认这轮是在做真实 runtime 刀、证据纠偏，还是 gate 清理。
3. 再看 `07-optimization-backlog-and-routing.md`，确认这轮任务是主线、低冲突副线，还是必须独立 worktree 的副线。
4. 真正实施前，先开独立 `worktree + branch (+ subagent)`；默认一条实施线只做一个 next cut。当前唯一活跃主线是 `R-1 v2：txnLanes urgent-aware handoff`。
5. `F-1` 已完成；需要查看 backlog/routing 任务时，直接用 `python3 fabfile.py list-tasks`、`python3 fabfile.py show-task R-1`、`python3 fabfile.py plan-parallel`。
6. 只想更快定位“下一个 browser blocker”时，优先用 `python3 fabfile.py probe_next_blocker`；它只按下方预设顺序跑 targeted browser suites，遇到第一个失败就停，不默认触发 full collect。
7. `S-2` 已完成第一刀（`clickToDomStable` + `clickToPaint` 双轨）；除非要继续补 benchmark 解释链，否则不要再把它升级回 runtime 主线。
8. `startup-phase` 显式切面只保留 checkpoint 结论，不单独落 `D-1` 日期记录；不要把 startup cap 直接当正式 runtime cut。
9. 先跑与该刀最贴边的 targeted tests / targeted perf，再决定要不要补 broader matrix。
10. 只有当 `R-1 v2` 明确无稳定收益，才考虑是否重开 `S-2` 的后续展示层收口，或升级到 `R-2`。
11. `S-4` 已于 `2026-03-06` 用 `RuntimeExternalStore delayed teardown` 完成最小修复；若再复现 multi-instance isolation，优先从同 tick unsubscribe/resubscribe 时序重新排查。
12. `S-5` 已于 `2026-03-06` 复核关闭：`react.strictSuspenseJitter` 在主分支环境可直接跑通；除非 clean/comparable 环境再次稳定复现导入/运行失败，否则不要再把它当 broad/full collect 的默认阻塞项。

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

3A. `fabfile.py probe_next_blocker` 默认顺序（只读 targeted probe，不默认触发 full collect）：
<!-- fabfile:probe_next_blocker:start -->
- `txnLanes.urgentBacklog` | `主要门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/txn-lanes.test.tsx -t "browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)"`
- `externalStore.ingest.tickNotify` | `第二优先级门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`
- `runtimeStore.noTearing.tickNotify` | `防回归门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
- `form.listScopeCheck` | `防回归门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`
<!-- fabfile:probe_next_blocker:end -->

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
- `react.strictSuspenseJitter` 若只在单个 worktree/browser 首轮预热失败，先判为环境/预热噪声，不直接升级成 runtime 问题。

5. 稳定性门：
- quick 至少 3 轮，按中位数结论判定。

## 5. 每轮完成后必须回写

1. 更新 `docs/perf/` 对应专题结论。
2. 新增日期记录，写明：
- 改动点
- 证据文件路径
- 通过/未通过门
- 下一刀计划
3. 若该线成功并被吸收，再同步 `docs/perf/05-forward-only-vnext-plan.md` 与 `docs/perf/03-next-stage-major-cuts.md` 的完成标记；若该线失败，只更新 dated record / routing，不勾 `[x]`。
4. 同步 `specs/103-effect-v4-forward-cutover/perf/` 下的证据索引文档（如果本轮产出新 report/diff）。
5. 线结束前自检：相对主分支只剩 `1` 个最终 HEAD commit；主会话只接这 `1` 个提交，不替你在线外补 diff。
