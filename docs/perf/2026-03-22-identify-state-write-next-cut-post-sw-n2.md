# 2026-03-22 · state-write 下一刀识别包（post SW-N1 accepted + SW-N2 docs-only）

> 后续状态更新（2026-03-22 同日）：`SW-N3` 已先补齐 dated design package，随后补齐 contract freeze；当前结论更新为 `implementation-ready=true`，见 `docs/perf/2026-03-22-sw-n3-contract-freeze.md`。

## 结论类型

- `docs/evidence-only`
- `implementation-ready identification`

## 输入边界

- 本文只做识别与实施线定义，不做实现。
- 保持 `docs-only scout` 约束，写入范围仅 `docs/perf/**` 与 `specs/103-effect-v4-forward-cutover/perf/**`。
- 禁止重做：`SW-N1`、`SW-N2` 失败收口、`P1-1` 系列旧线、`P1-2 next-expansion`、`P1-3` 系列、`whole-state fallback` 旧 reopen。

## 当前盘面（state-write 链路）

已成立事实：

- `SW-N1` 已 `accepted_with_evidence`，`dispatch/reducer`、`BoundApi.state.update`、`externalStore/module-as-source` 的无证据写入统一降级到显式 `customMutation`，并补齐 fail-fast。
- `SW-N2` 最小切口已 `docs/evidence-only` 收口，`typecheck:test` 与 `probe_next_blocker` 通过，`pnpm -C packages/logix-core test` clean 状态未全绿，本轮不满足成功门。
- `P1-1/P1-2/P1-3` 相关旧线已形成拒绝或吸收裁决，当前不允许回到“runtime 预编译扩面”或“whole-state fallback reopen”路径。

仍待解决的结构性缺口：

- `SW-N1` 把降级语义显式化后，`customMutation/dirtyAll` 的跨入口流量仍缺少统一账本与预算门，导致“可诊断”与“可优化”断层。
- `FieldPathId/anchor` 现有能力仍主要服务于“有精确 patch 证据”的成功路径，降级路径对 anchor 的归因粒度不足，难以决定下一刀应投在 reducer、BoundApi、externalStore 的哪一段。

## Top2 候选

### Top1（唯一建议下一线）· `SW-N3 Degradation-Ledger + ReducerPatchSink contract`

一句话：

把 state-write 的降级流转升级为统一内部协议，给每笔写入产出 slim `StateWriteIntent`，并补齐 reducer fallback 的 patch sink 能力边界，让 `customMutation/dirtyAll` 从“尾部噪声”变成“可门禁预算”。

最小切口定义：

- 新增统一 intent 协议（内部）：
  - `source`: `reducer | boundApi.update | trait.externalStore | moduleAsSource`
  - `anchor`: `instanceId/txnSeq/opSeq`（复用稳定标识，不新增随机 id）
  - `coverage`: `precisePatch | topLevelKnown | customMutation`
  - `degradeReason`: 枚举化 reason code（禁止自由字符串）
  - `pathIdsTopK`: 可选，保持 slim 与可序列化
- reducer fallback 新增 `ReducerPatchSink` 语义位：
  - 能提供 patch 证据时走精确路径
  - 无证据时显式落 `customMutation` 并绑定 reason code
- perf/gate 补一条 state-write 数据面预算：
  - `stateWrite.degradeRatio`（按入口分桶）
  - `stateWrite.degradeUnknownShare`（未知原因占比）

跨模块影响面：

- `state-write ingress`：`ModuleRuntime.dispatch`、`BoundApiRuntime`、`external-store`、`module-as-source`
- `transaction core`：`StateTransaction`（intent 归并与 reason code 统一）
- `diagnostics/data-plane`：`state:update` slim 事件、devtools 显示链路、perf matrix 指标

为什么比继续补 `SW-N2` 更值：

- `SW-N2` 的收益集中在“已具备精确路径证据”的成功路径，当前最大不确定面在降级路径占比与来源分布。
- `SW-N2` 本轮 gate 阻断位于 correctness 全量门，继续推进会叠加静态表与 anchor 管线复杂度，归因成本更高。
- `SW-N3` 先把降级路径做成可度量协议，后续再判断 `SW-N2` 的收益天花板，决策成本更低、跨入口复用更强。

API 变动判断：

- 当前建议：`public API change = false`。
- 可选提案（仅当 `SW-N3` 后 degradeRatio 仍高）：增加显式 patch contract 的表层 API（例如 reducer patch helper），单独走 API proposal gate。

### Top2 · `SW-N2` 环境就绪后重开（保持 watchlist）

重开前置条件：

- `pnpm -C packages/logix-core test` 恢复到可复现全绿。
- 保持 `SW-N2` 仅做 static table + stable anchor plumbing，不扩面到旧的 `P1-1/P1-2/P1-3`。
- 与 `SW-N3` 保持串行，避免同时改写 state-write 协议与 id 管线导致证据不可归因。

当前不选它做下一刀的原因：

- 当前阻断点在 correctness gate，且收益面仅覆盖精确路径。
- 相比之下，`SW-N3` 能先建立“降级流量账本 + reason code 预算门”，对后续所有 state-write cut 都有复用价值。

## 唯一建议下一刀

唯一建议下一刀为 Top1：`SW-N3 Degradation-Ledger + ReducerPatchSink contract`。

执行约束：

- 默认不改 public API。
- 不回到 `P1-1/P1-2/P1-3` 旧 reopen 路径。
- 先做协议与证据门，后做实现线。

## 最小验证命令

```bash
git diff --stat v4-perf..HEAD
```
