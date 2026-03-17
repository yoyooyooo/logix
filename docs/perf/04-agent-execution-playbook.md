# 04 · Agent 执行手册（接力专用）

本手册给后续维护 agent：拿到这个目录后，按步骤执行，不需要重新建模。

默认策略：
- 若未特别说明，一律按 `05-forward-only-vnext-plan.md` 的“零存量用户”路线执行。
- 不做兼容层，不保留弃用期。

`2026-03-19` 当前口径（覆盖 `2026-03-18` 旧约束）：

- `probe_next_blocker` 已改成 threshold-aware probe
- 当前默认 blocker 已回到 `externalStore.ingest.tickNotify`
- `C-8` 已补齐 probe 输出语义：`process_returncode` 与 `returncode` 分离，`threshold_anomalies` 显式外露，避免顶层 `clear` 掩盖阈值失败
- 下一轮默认优先这条线，不直接跳去 future-only 候选池
- 默认执行模型：主会话先编排并优先 `spawn_agent`，后续每一刀都在独立 `worktree + subagent` 中推进；任务包保持最小，不整段 fork 主会话历史。
- 主会话本地动作只在三类条件开启：平台不可用、任务不可分拆、并行线硬冲突。
- `2026-03-18` 的“可用时优先 `spawn_agent`”口径仅作为历史背景保留。
- 若 subagent 线程因 context window 失败，先开 fresh worker，再考虑其它回退，不在旧线程上续聊。

执行新增约束（本仓当前策略）：
- **主会话默认保持干净**：主会话默认只做 routing / 审查 / 合流，不直接承载 runtime / benchmark / gate 实施；仅在平台不可用、任务不可分拆、并行线硬冲突三类条件下允许少量本地动作。统一协议见 `docs/perf/08-perf-execution-protocol.md`。
- **每条实施线只承载一刀，并在独立 `worktree/branch/subagent` 中推进**；中间试验可存在于线内，但交回主会话前，相对主分支只允许保留 `1` 个最终 HEAD commit。
- **成功与失败都要以 `1` 个最终提交收口**：成功线保留最终有效 diff；失败线清掉半成品代码，只保留 dated evidence / `docs/perf/*` 结论与必要路由更新。
- 只有“真正完成并被吸收”的 major cut，才在 `docs/perf/05-forward-only-vnext-plan.md` 与 `docs/perf/03-next-stage-major-cuts.md` 勾选对应条目为 `[x]`；失败线只写 dated record 与路由回写，不得假装完成。
- **入口口径固定**：`docs/perf/*` 是 perf 机制的 control-plane；`specs/103-effect-v4-forward-cutover/perf/*` 只存 evidence / artifact，不负责路由与选线。
- **母线清洁优先**：凡是为了 routing / docs / evidence 协调而产生的主会话改动，都应尽快收口并提交；默认不要带着未提交文件去开新的 perf worktree。

## 0. 先读顺序

1. `docs/perf/README.md`
2. `docs/perf/08-perf-execution-protocol.md`
3. `docs/perf/06-current-head-triage.md`
4. `docs/perf/07-optimization-backlog-and-routing.md`
5. `docs/perf/05-forward-only-vnext-plan.md`
6. `docs/perf/03-next-stage-major-cuts.md`
7. `docs/perf/09-worktree-open-decision-template.md`（仅在 `probe_next_blocker=clear` 或准备重开 perf worktree 时必读）
8. 只在需要补历史上下文时再读旧日期记录

补充：
- 不要把 `specs/103-effect-v4-forward-cutover/perf/*` 当“先读入口”。
- 只有在需要看 evidence / summary / probe json 时，才回到该目录取工件。
- 若 `07-optimization-backlog-and-routing.md` 中已经没有 still-open 高收益方向，本轮默认切回识别模式，先补新的方向，再谈实施。

## 1. 进入实现前的硬约束

1. 不破坏事务窗口无 IO 原则。
2. 不破坏稳定标识（instanceId/txnSeq/opSeq）。
3. 不以删除诊断锚点换性能。
4. 允许 forward-only 破坏性 API 演进，不做兼容层。

## 2. 推荐执行节奏

1. 主会话先看 `08-perf-execution-protocol.md`，确认这轮以协调/审查角色为主，并先走 subagent 派线。
2. 再看 `06-current-head-triage.md`，确认这轮是在做真实 runtime 刀、证据纠偏，还是 gate 清理。
3. 再看 `07-optimization-backlog-and-routing.md`，确认这轮任务是主线、低冲突副线，还是必须独立 worktree 的副线。
4. 真正实施前，先开独立 `worktree + branch (+ subagent)`；默认一条实施线只做一个 next cut。当前没有默认 runtime 主线；只有在新的 clean/comparable 证据下才重开 runtime 刀。
4A. 默认先派发 `subagent`：
- 优先 `spawn_agent`
- 默认不给它 fork 全历史（`fork_context=false`）
- 先把最小任务包和必要的本地 docs/evidence 同步到目标 worktree，再派发
- 仅在平台不可用、任务不可分拆、并行线硬冲突时，主会话保留少量本地动作，并在 dated record 记录原因
4B. 若用户直接说 `实施高收益方向`：
- 默认进入 fanout 模式
- 先消费 `07` 中 still-open 的高收益方向
- 尽可能多开 `subagent + worktree`
- 低冲突方向并行，高冲突方向串行
- 若 `07` 没有 still-open 高收益方向，则改为并行开 docs-only scout 线补新方向
5. `F-1` 已完成；需要查看 backlog/routing 任务时，直接用 `python3 fabfile.py list-tasks`、`python3 fabfile.py show-task R-1`、`python3 fabfile.py plan-parallel`。
6. 只想更快定位“下一个 browser blocker”时，优先用 `python3 fabfile.py probe_next_blocker`；它只按下方预设顺序跑 remaining health/regression suites，读取 `LOGIX_PERF_REPORT.thresholds` 做 gate 判门，遇到第一个 suite failure 就停，不默认触发 full collect。`--json` 输出至少看四个字段：`failure_kind`、`process_returncode`、`returncode`、`threshold_anomalies`。
7. `S-2` 已完成第一刀（`clickToDomStable` + `clickToPaint` 双轨）；除非要继续补 benchmark 解释链，否则不要再把它升级回 runtime 主线。
8. `startup-phase` 显式切面只保留 checkpoint 结论，不单独落 `D-1` 日期记录；不要把 startup cap 直接当正式 runtime cut。
9. 先跑与该刀最贴边的 targeted tests / targeted perf，再决定要不要补 broader matrix。
10. 若 `probe_next_blocker` 为 `clear`，不要硬造新的 runtime 线；先回到 `docs/perf/09-worktree-open-decision-template.md` 做“开/不开 worktree”裁决。若 residual gate 出现 pass/fail 摆动，先补 comparable 3 轮 audit，不直接把单轮 `clear` 当成硬结论。
11. 若 `07` 已经没有 still-open 高收益方向，本轮先进入 docs-only scout / identify 模式，补出新的方向；不要假装还有既有 cut 可消费。
12. 只有模板里的触发器成立时，才允许继续开新的 perf worktree；否则本轮只做 docs/evidence-only 收口，或只开识别型 scout 线。
12A. 若 subagent 线程爆上下文：
- 先检查当前 worktree 是否已经足够按失败线收口
- 若还不够，再开 fresh worker，提示词缩到最小
13. `S-4` 已于 `2026-03-06` 用 `RuntimeExternalStore delayed teardown` 完成最小修复；若再复现 multi-instance isolation，优先从同 tick unsubscribe/resubscribe 时序重新排查。
14. `S-5` 已于 `2026-03-06` 复核关闭：`react.strictSuspenseJitter` 在主分支环境可直接跑通；除非 clean/comparable 环境再次稳定复现导入/运行失败，否则不要再把它当 broad/full collect 的默认阻塞项。

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
- 仅在 future evidence 需要重开 `txnLanes` 时，手动跑整文件：`pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/txn-lanes.test.tsx`

3A. `fabfile.py probe_next_blocker` 默认顺序（只读 targeted probe，不默认触发 full collect）：
<!-- fabfile:probe_next_blocker:start -->
- `externalStore.ingest.tickNotify` | `残余复核门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"`
- `runtimeStore.noTearing.tickNotify` | `防回归门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx -t "perf: runtimeStore tick"`
- `form.listScopeCheck` | `防回归门` | `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`
<!-- fabfile:probe_next_blocker:end -->

注：`S-10/S-11` 之后，`txnLanes` 已退出默认 blocker probe 队列；如未来重开，不要再使用带括号的 `-t` regex，直接跑 file-level 命令或显式转义 pattern。
注：`probe_next_blocker` 自 `2026-03-18` 起同时读取 `LOGIX_PERF_REPORT.thresholds`；命令退出码为 `0` 但 `firstFailLevel != null` 时，也按 suite failure 处理。
注：当前实现会在 `failure_kind=threshold` 时返回 `returncode=42`，并保留子命令原始返回码到 `process_returncode`。

4. 可选 collect（落盘到 spec perf 目录）：
- `pnpm perf collect -- --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json`
- `pnpm perf collect -- --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json`

## 4. 验收门

1. 默认 blocker probe：
- `externalStore.ingest.tickNotify` 的 `full/off<=1.25` broad matrix 要稳定通过到 `watchers=512`。

2. 防回归门：
- `runtimeStore.noTearing.tickNotify` 继续保持通过。
- `form.listScopeCheck` 继续保持通过。

3. `txnLanes` 重开门（仅在新证据下使用）：
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/txn-lanes.test.tsx` 需继续保持 `urgent.p95<=50ms` 在 `mode=default/off` 下通过到 `steps=2000`。

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
