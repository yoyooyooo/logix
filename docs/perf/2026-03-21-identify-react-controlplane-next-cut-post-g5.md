# 2026-03-21 · React controlplane 下一线识别包（post G5）

> 后续状态更新（2026-03-22）：Top1 `Stage G6 ControlplaneKernel v1` 已在独立 worktree 完成实施并 `accepted_with_evidence`，见 `docs/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.md`。post-G6 的下一刀识别已转移到 `docs/perf/2026-03-22-identify-react-controlplane-next-cut-post-g6-owner-resolve.md`。

## 结论类型

- `docs/evidence-only`
- `implementation-ready identification`

## 输入边界

- 本文只做识别与实施线定义，不做实现。
- 不改 public API。
- 后续若进入实施线，写入范围仍限定在 `packages/logix-react/**` 的内部实现与测试锚点，不触 `packages/logix-core/**`。

## 当前盘面（G1~G5）

已形成可复验证据链的结论：

- `G1 owner-lane registry adapter`：`accepted_with_evidence`
- `G2 cancel boundary isomorphic merge`：`accepted_with_evidence`
- `G3 owner-lane phase contract normalization`：`accepted_with_evidence`
- `G4 env-ready v2` fresh 复核：`accepted_with_evidence`（该条仅补齐可复现证据与口径，不扩展语义）
- `G5 controlplane kernel v0 (neutral-settle no-refresh)`：已升级为 `accepted_with_evidence`

权威入口：

- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g4-trigger.md`
- `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-design-package.md`
- `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`

## 当前 probe 语义下的现实约束

本 worktree 的 `probe_next_blocker` 当前落在 `externalStore.ingest.tickNotify` 的相对预算门（`full/off<=1.25`），与 React controlplane 方向不具备直接可归因关系。

因此，react controlplane 的下一线若要“真正值得做”，需要满足两点：

- 目标必须是结构性税点或后续更大 cut 的前置能力，且能被现有 `phase-trace` 测试锚点验证。
- 该切口不依赖当前 `externalStore` residual gate 的摆动结果，不把 gate 噪声当成切口收益。

## 为什么不回到 G4

`G4` 的最小切口已经完成，并且收益主要是口径收敛。继续在 `G4` 内推进会被迫触碰以下任一方向：

- 扩展 `configLane ready` 的触发条件与语义。
- 引入 public policy 的对外表达，进入 `R-2 public API proposal` 的 Gate 流程。

这两类都不属于 `G4` 的既定切口定义，也缺少新增的可度量收益面，当前不作为下一线。

## 为什么不回到 G5

`G5 kernel v0` 已完成同口径复验并升级为 `accepted_with_evidence`。重复执行复验不会产生新增结论。

`G5 v0` 的覆盖面只锁定在 “neutral settle 导致同 owner 下第二次 async config snapshot confirm” 这一条可证伪差异。后续收益来自扩大覆盖面，所以必须以新切口编号与新成功门推进。

## Top2 候选方向（post G5）

### Top1（唯一建议下一线）· Stage G6 ControlplaneKernel v1：把 config snapshot confirm 统一纳入 owner ticket 规则

定位：

- `G5 v0` 已证明 “把去重约束从 RuntimeProvider 条件分支迁到可测试的 ticket 规则” 可以闭环。
- 下一条高价值是把这一规则从 `neutral settle` 的单点扩到 “所有触发 config snapshot confirm 的入口”，继续压缩 RuntimeProvider 的分支爆炸面，同时保留可解释的 reason 链路。

唯一最小切口定义：

- 引入 `ControlplaneKernel v1` 的单一入口，收敛所有 `config snapshot confirm` 的触发：
  - 输入：`ConfigConfirmRequested(ownerKey, cause)`，其中 `cause` 只允许来自既有事件集合的枚举化 reason。
  - 状态：按 `ownerKey` 维护 `epoch/ticket/phase`，同 epoch 只允许一个 current ticket 的 confirm 结果回写。
- 保留 `neutral-settled-refresh-allowed` 的现有裁决语义，新增逻辑只做 “如何去重与如何拒绝过期回写”。

实施线写入范围（约束）：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/provider/*ControlplaneKernel*`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`

成功门（必须全满足）：

- `runtime-bootresolve-phase-trace` 新增断言组成立：
  - 同 ownerKey 同 epoch 的 `config snapshot confirm` 计数稳定为 `1`
  - “过期 ticket 回写被拒绝”有明确 reason 码
- `pnpm --filter @logixjs/react typecheck:test` 通过
- `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks` 通过
- `python3 fabfile.py probe_next_blocker --json` 可运行且 `failure_kind` 不为 `environment`

失败门（任一成立立即回退并按 docs/evidence-only 收口）：

- ready 语义漂移，或需要新增 public policy 才能解释行为差异
- 出现旧的 `boot-epoch config singleflight` 形态，或去重绕过 ticket 校验
- `phase-trace` 断言需要引入 “按时间窗口容错” 才能通过

为什么这条在 post G5 阶段更值：

- 它延续 `G5` 的可测切口形态，仍是 “单一 kernel 入口 + ticket 规则 + phase-trace 锚点”。
- 它把收益从单一症状扩到可复用内核能力，为后续更大 controlplane 重排提供稳定落点。
- 它不触 public API，也不需要把 gate 噪声解释成 controlplane 绩效。

### Top2 · `P1-6''` owner-aware resolve engine（更大重排，当前不建议作为下一线）

定位：

- 这条线目标是把 `read/readSync/warmSync/preload` 的 owner 判定与 config 刷新统一到同一套状态机，属于结构性重排。

当前不选它的原因：

- 证据盘面显示 current-head 的 `probe_next_blocker` 仍受 `externalStore` residual gate 噪声影响，全面重排会放大回归面，且难以在当前 gate 语义下得到稳定可归因结论。
- 该线更容易触及可观察行为变化，进入 `R-2` 的概率更高。

触发器（未来重开条件）：

- 继续出现第二个独立症状指向 “neutral 与 config 的隐式耦合”，并且 `G6` 无法用单一可证伪切口覆盖。
- `RuntimeProvider` 的新增场景需要同时改动多处 lane 逻辑才能通过，维护税进入持续上升区间。

## 唯一建议下一线

唯一建议下一线为 `Top1: Stage G6 ControlplaneKernel v1`。

开线前置检查：

- 仅当 `probe_next_blocker` 在本地可运行并给出非 `environment` 的可比结果时开线。
- 继续遵守不改 public API，任何对外契约扩展走 `R-2` Gate。

## 最小验证命令

```bash
python3 fabfile.py probe_next_blocker --json
```
