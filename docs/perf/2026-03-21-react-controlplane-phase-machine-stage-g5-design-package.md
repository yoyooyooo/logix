# 2026-03-21 · React controlplane phase-machine Stage G5 implementation-ready 设计包（docs/evidence-only）

> 后续状态更新（2026-03-21 同日）：`Stage G5 kernel v0` 已在独立 worktree 完成复验并升级为 `accepted_with_evidence`，见 `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`。本文件继续保留为设计包基线与约束来源。
>
> 后续状态更新（2026-03-22）：在该基线之上，`Stage G6 ControlplaneKernel v1` 已完成实施并 `accepted_with_evidence`，见 `docs/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.md`。

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## G5 的唯一最小切口

切口命名：`G5 controlplane kernel v0 (neutral-settle no-refresh)`

唯一目标：把 `neutral binding settle` 导致的“同一 owner 下第二次 async config snapshot load”收敛为可被证伪的单一切口，并把去重约束从 `RuntimeProvider.tsx` 的条件分支迁到可测试的 owner ticket 规则里。

最小动作（实现线的约束描述，本轮不实施）：

1. 在 `RuntimeProvider` 内引入最小 `ControlplaneKernel` 归约入口，只覆盖 `neutralLane -> configLane` 的 settle 信号：
   - 输入：`NeutralSettled(ownerKey)` 与 `ConfigReadyConfirmRequested(ownerKey)`
   - 状态：按 `(ownerKey, lane)` 维护 `epoch/ticket` 与 `phase`，只允许一个 current ticket 的 async confirm 结果回写
2. 把“是否触发 refresh”收敛成 kernel 的单一判定点：
   - 同 ownerKey、fingerprint 未变时，`neutral settle` 不再触发新的 config snapshot load
   - 必要的 refresh 只能由显式 `ConfigFingerprintChanged` 或 owner invalidation 触发，并携带可解释 reason
3. phase-trace 以新增用例形式固化断言锚点：
   - 同一 ownerKey 的 `config.snapshot` async confirm 计数从 `2` 收敛到 `1`
   - `neutral-settled-refresh-allowed` 的裁决语义保持不变，仅允许在“确有 fingerprint 漂移”时出现

实现写入范围（若触发进入实施线）：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/provider/*ControlplaneKernel*`（新内核模块，纯逻辑，不依赖 React）
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`

明确禁止：

- 回到 `boot-epoch config singleflight`
- 回到 `owner-conflict` 小修补
- 把去重逻辑藏进 executor 或 Promise 缓存，绕过 `ticket` 校验

## 为什么比 G4 更值

`G4` 的收益面主要是“口径收敛”：把 `configLane ready` 的 executor 标记与其它 lane 对齐，减少 phase-trace 的解释分叉。

`G5` 的收益面直接命中结构性税点：

- 把 R3 类症状收敛到单一可测的行为差异，收益可用“async snapshot 次数 + boot wall-clock”共同验收
- 让后续更大 controlplane 重建具备可测试的 kernel 入口，避免继续在 `RuntimeProvider` 里堆叠条件分支
- 诊断解释链变短，`ownerKey/epoch/ticket` 可直接解释“为什么没有 refresh”或“为什么必须 refresh”

## 成功门与失败门

成功门（进入实施线后必须全部满足）：

1. `runtime-bootresolve-phase-trace` 新增用例通过，且同 ownerKey 下 `config.snapshot` async confirm 计数稳定为 `1`
2. `neutral-settled-refresh-allowed` 的裁决语义不变，仅在 fingerprint 漂移或 owner invalidation 场景出现
3. `python3 fabfile.py probe_next_blocker --json` 给出可比结论，且 `failure_kind` 不为 `environment`

失败门（任一成立立即回退并按 docs/evidence-only 收口）：

- 出现任何 ready 语义漂移，或需要新增 public policy 才能解释行为
- 触发旧失败切口形态，或去重规则无法用 `ticket` 校验表达
- `probe_next_blocker` 仅能得到 `failure_kind=environment`，且无法在本线内消解

## 与 public API proposal 的边界

- `G5` 只允许内部控制面重构与诊断锚点补齐，不引入 `packages/logix-core/**` 改动，不改 public API。
- 若在 `G5` 过程中发现必须对外暴露策略语义或可配置维度，改动进入 `R-2 public API proposal` 的 Gate 流程：
  - proposal：`docs/perf/2026-03-20-r2-public-api-proposal.md`
  - staging plan：`docs/perf/2026-03-21-r2-public-api-staging-plan.md`

## 本轮最小验证与证据落点

最小验证命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

本轮结果：`status=blocked` 且 `failure_kind=environment`（本 worktree 缺少 `node_modules`，`vitest: command not found`），按协议不进入实现线，仅落 docs/evidence-only 设计包。

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-design-package.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-design-package.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-design-package.summary.md`
