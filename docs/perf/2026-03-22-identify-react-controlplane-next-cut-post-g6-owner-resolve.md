# 2026-03-22 · React controlplane post-G6 下一刀识别包（owner-resolve scout）

> 后续状态更新（2026-03-22 同日）：`P1-6''` 已补齐 dated design package，当前结论更新为 `implementation-ready=false`，继续 docs/proposal-only，见 `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-design-package.md`。

## 结论类型

- `docs/evidence-only`
- `implementation-ready identification`
- `accepted_with_evidence=false`（本轮只做提案，不实施代码）

## 输入基线

- `G1/G2/G3/G5/G6` 均已 `accepted_with_evidence`，`config snapshot confirm` 的 owner ticket 规则已覆盖到全触发入口。
- `probe_next_blocker` 在 `G6` 实施线上出现 `r1 blocked(form.listScopeCheck)` 与 `r2 clear` 的同批次摆动，`externalStore.ingest.tickNotify` 仍维持 residual 噪声口径。
- 当前开线约束保持：不改 `packages/logix-core/**`，不改 public API。

## 瓶颈三分分类

### 1) 真实瓶颈（应作为下一刀目标）

`RuntimeProvider` 内部的 owner-aware resolve 归约仍不完整，`read/readSync/warmSync/preload` 的决策入口尚未统一到单一 owner-phase 合同。当前症状是结构性维护税，不是单点阈值超线：

- 同类场景仍可能需要跨多个 lane 分支同时调整，维护成本持续上升。
- `G6` 解决了 confirm 去重与过期回写的统一规则，尚未覆盖完整 resolve 入口族。
- 后续若继续按微调切口推进，分支面会继续扩张，phase-trace 可解释性会变差。

### 2) 证据伪影（不应驱动该线）

`probe_next_blocker` 的默认三套件（`externalStore`、`runtimeStore`、`form`）不直接锚定 `RuntimeProvider bootresolve` 的 owner-resolve 合同。用它们来排序 react controlplane 下一刀，会产生错配。

### 3) 门禁噪声（需要记录，但不作为收益归因）

- `externalStore.ingest.tickNotify / full/off<=1.25` 在 `128/256/512` 层级存在历史漂移，当前口径仍是 `edge_gate_noise`。
- `form.listScopeCheck / auto<=full*1.05` 在 `G6` 线内出现 `r1 fail -> r2 clear` 的短时波动，属于 gate 噪声样本。

## 唯一建议下一刀

`P1-6'' owner-aware resolve engine`（提案名：`ControlplaneKernel v2`）

### 下一刀最小切口定义（提案）

在不改 public API 的前提下，把 `RuntimeProvider` 的 resolve 入口统一到一套 owner-phase 归约协议：

1. 单一 `OwnerResolveRequested(ownerKey, lane, cause, fingerprint)` 入口承接 `read/readSync/warmSync/preload`。
2. `ownerKey + epoch + lane` 成为唯一去重键，统一 stale 判定与 commit 拒绝原因码。
3. phase-trace 统一输出 `action/reason/executor/cancelBoundary/readiness`，避免 lane 级分支各自解释。

### 为什么这刀比继续挤牙膏更值

- 收益面覆盖整条 provider bootresolve 控制面，后续 `P1-7` 与 preload 相关线可复用同一合同层。
- 可直接降低 `RuntimeProvider` 的分支爆炸风险，减少“改一处断三处”的连锁调整成本。
- 与当前 gate 噪声解耦，收益验证可锚定 `runtime-bootresolve-phase-trace`，归因链路更稳定。

### API 变动判断

- 当前建议：`不需要 public API 变动`，先完成内部合同归约。
- 预留 proposal：若实施后仍需要对外暴露 owner policy，再进入 `R-2` 的 Gate-A/B 路径，单独出 API 提案与迁移说明。

## 受影响模块（proposal scope，未实施）

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/provider/ControlplaneKernel.ts`
- `packages/logix-react/src/internal/provider/owner-lane registry / cancel boundary` 相关内部模块
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`

## 成功门（后续实施线）

1. `runtime-bootresolve-phase-trace` 新增断言覆盖 `read/readSync/warmSync/preload` 四类入口，且同 `ownerKey+epoch+lane` 的 `resolve-commit` 计数稳定为 `1`。
2. stale 回写全部带结构化 reason 码，`kernel-ticket-expired` 与 owner-phase mismatch 可区分。
3. `pnpm --filter @logixjs/react typecheck:test` 通过。
4. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks` 通过。
5. `python3 fabfile.py probe_next_blocker --json` 可运行，且若出现失败需可归类为已知 gate 噪声，不得把噪声计入该切口收益。

## 失败门（后续实施线）

- 需要引入 public policy 才能维持现有行为，且无法在 `R-2` 之外解释。
- `neutral-settled-refresh-allowed` 语义被改写，或 preload reuse-inflight 断言回退。
- phase-trace 需要依赖时间窗口容错才能通过，无法给出确定性 owner-phase 合同。

## 最小验证命令

```bash
python3 fabfile.py probe_next_blocker --json
```

## 证据锚点

- `docs/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.probe-next-blocker.r2.json`
- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/2026-03-21-identify-react-controlplane-next-cut-post-g5.md`
