# 2026-03-21 · cross-plane pulse/topic/react-bridge post P1-4B/P1-4C nextwide 识别包（docs/evidence-only，implementation-ready）

## 状态更新

- `2026-03-22`：`P1-4D-min` 在 `agent/v4-perf-p1-4d-single-path-cleanup` 发起过最小实施尝试；最小验证链路命中环境阻塞（`node_modules missing`，`tsc/vitest` 不可用），已按门禁回滚实现并 docs/evidence-only 收口。见 `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`。
- `2026-03-22`：在 `agent/v4-perf-scout-crossplane-single-pulse-contract` 的只读侦察里，现行代码基线已确认 single-path 生效，后续唯一建议从 `P1-4D` 调整为 `P1-4F-min core->react single pulse contract`。见 `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`。

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 输入基线（已实施盘面）

- `P1-4B-min RuntimeExternalStore module pulse hub` 已实施并 `accepted_with_evidence`：
  - `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`
- `P1-4C-min PulseEnvelope v0 + SelectorDeltaTopK` 已实施并 `accepted_with_evidence`：
  - `docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
- 旧的 nextwide 识别包（当时 Top2 为 `P1-4B/P1-4C`）：
  - `docs/perf/2026-03-21-crossplane-pulse-topic-reactbridge-nextwide-identify.md`
- 热路径地图与 residual 定位：
  - `docs/perf/02-externalstore-bottleneck-map.md`

## 问题重述（P1-4B/P1-4C 之后还剩什么）

`P1-4B` 已把 bridge pulse 的粒度从 topic 收敛到 moduleInstance。

`P1-4C` 已把 React bridge 的输入收敛到 moduleInstance 级 `PulseEnvelope`，并用 `selectorDelta` 把 selector 重算触发面收敛为保守跳过。

在此盘面下，cross-plane 的下一条值得做的方向，优先级不再来自“继续做更大 envelope”，而来自两类残余税与残余风险：

1. 热路径仍保留 legacy 分支与双路径，存在常数成本与并行真相源漂移风险。
2. React bridge 仍保留未接线的旧实现文件，形成维护面与潜在调度语义分叉风险。

`externalStore.ingest.tickNotify` 在 current-head 的定位仍是 `edge_gate_noise`，不足以单独驱动一条新的 runtime 大切口。该 suite 只作为验证门与复核门存在。

## Top2 大方向（按“跨 plane 收益面”排序）

### Top1：`P1-4D` cross-plane single-path cleanup（去 `LOGIX_CROSSPLANE_TOPIC` 双路径）

定位：在 `P1-4B/P1-4C` 已成立的前提上，把 cross-plane topic 与 bridge 的 legacy 分支彻底收口为单路径，消除热路径分支判断与重复 key 解析缓存。

为什么比 `P1-4B/P1-4C` 更进一步：

- `P1-4B/P1-4C` 解决的是“每 tick 的 pulse 次数”与“每次 pulse 下的 selector 重算触发面”。
- `P1-4D` 解决的是“跨 core 与 react 的双路径并行维护”与“热路径分支带来的常数税与漂移风险”。
- `P1-4D` 完成后，后续再做更大的 cross-plane 协议推进（例如把 envelope 进一步下沉到 core）会少一层回退路径与歧义边界，实施与诊断成本更可控。

implementation-ready 最小切口（若触发进入实施线）：

- Cut 名称：`P1-4D-min remove LOGIX_CROSSPLANE_TOPIC dual path`
- 写入范围：
  - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - 相关测试（以类型提示与现有覆盖为准）
- 语义约束：
  - 不改 public API。
  - 不引入新的 runtime 行为开关。
  - topic 分类与 moduleInstanceKey 推导口径保持现状，只删除 legacy 分支与重复实现面。

成功门（进入实施线后必须全部满足）：

1. `probe_next_blocker --json` 可比且为 `status=clear`，`failure_kind` 为空。
2. `externalStore.ingest.tickNotify` 仍满足 residual 复核门的既有判定口径，不新引入抖动放大。
3. `runtimeStore.noTearing.tickNotify` 与 `form.listScopeCheck` 保持通过。

失败门（任一成立立即回退并按 docs/evidence-only 收口）：

- 删除分支后暴露出隐式依赖，导致语义回归或可诊断性退化。
- 任一 gate 出现非 environment 的稳定失败，且可归因到本切口。

### Top2：`P1-4E` react-bridge legacy external store removal（删未接线的旧桥接实现）

定位：删除或冻结未接线的旧 `ModuleRuntimeExternalStore*` 实现，避免 React bridge 出现双实现并行维护与调度策略分叉。

implementation-ready 最小切口（若触发进入实施线）：

- Cut 名称：`P1-4E-min remove unused ModuleRuntimeExternalStore*`
- 写入范围：
  - `packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`
  - `packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
  - `packages/logix-react/src/internal/hooks/useSelector.ts`（仅用于确认无引用与清理 import）
  - 相关测试（以类型提示与现有覆盖为准）
- 语义约束：
  - 不改 public API。
  - 只做删除或冻结，不引入新的 bridge 形态。

## 唯一建议下一线

`Top1：P1-4D cross-plane single-path cleanup`

理由：收益面同时覆盖 core 与 react 的交界，且把“并行真相源”与“热路径分支税”一并消除；同时为后续更大的 cross-plane 线提供更清晰的语义边界与更低的维护面。

## 本轮最小验证与证据落点

最小验证命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

本 worktree 执行结果：

- `status=blocked`
- `failure_kind=environment`
- 关键信息：`node_modules missing`，`vitest: command not found`

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.summary.md`
