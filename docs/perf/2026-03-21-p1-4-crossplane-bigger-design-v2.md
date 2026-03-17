# 2026-03-21 · P1-4 cross-plane bigger design v2（implementation-ready，docs/evidence-only）

> 续线补充：`P1-4B` 已在 `docs/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.md` 收口为专用 implementation-ready 设计包。

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 直接裁决

当前 `probe_next_blocker` 结果为 `status=blocked`，且 `failure_kind=environment`（`vitest: command not found`，`node_modules missing`）。

这类阻塞不能支撑“更大的 P1-4 实施切口”判定，也不能形成可比的实现收益证据。因此本轮直接按 docs/evidence-only 收口。

## 背景与约束

- 允许范围：`RuntimeStore.ts`、`TickScheduler.ts`、`RuntimeExternalStore.ts` 与相邻测试。
- 明确不回到：
  - `normal-path shared microtask flush`
  - `TickScheduler dirtyTopics single-pass classification` 的旧最小切口
- 不改 public API。

## 为什么旧小切口不值

### 已否决切口 A：`normal-path shared microtask flush`

- 已有结论：microtask 计数可收敛，wall-clock 未形成正收益。
- 问题在于切口只覆盖“调度末端”，跨 plane 的重复回调与重复通知准备仍保留。

### 已否决切口 B：`dirtyTopics single-pass classification`

- 已有结论：属于 TickScheduler 内部单段优化，收益面窄。
- 问题在于切口只覆盖“分类阶段”，没有覆盖 runtime 到 react bridge 的重复 pulse 成本。

## 若不回到 shared-microtask-flush，下一条值得实施的 cross-plane 线

唯一建议下一线：

- `P1-4B`：`module-scoped pulse coalescing`（按 moduleInstance 聚合 runtime→react 通知脉冲）

收益面：

1. 直接命中 `RuntimeStore -> TickScheduler -> RuntimeExternalStore` 三段交界。
2. 目标成本从“每个 dirty topic 触发一次 bridge pulse”收敛到“每个 moduleInstance 每 tick 一次 pulse”。
3. 对 module topic 与 readQuery topic 混合场景同时生效，覆盖面大于旧小切口。

## implementation-ready 最小切口（不实施代码，仅落设计）

### 变更落点

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（仅在需要补最小桥接计数/诊断字段时触达）

### 最小动作

1. 在 `RuntimeExternalStore` 引入 `module-scoped pulse hub`：
   - 同一 `moduleInstanceKey` 下的 module/readQuery store 共享 pulse 入口。
   - pulse 入口按 `tickSeq` 去重，同一 tick 内重复回调只处理一次。
2. 在 `TickScheduler` 保持 dirty topic 语义不变，仅补 bridge pulse 统计字段：
   - `bridgePulseInvoked`
   - `bridgePulseCollapsed`
3. `RuntimeStore` 默认不改 public surface；仅在 diagnostics 取证需要时补最小可序列化计数字段。

### 验证与成功门（若后续进入实现线）

最小验证命令：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-react typecheck:test
python3 fabfile.py probe_next_blocker --json
```

建议追加 targeted 验证：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts test/Hooks/useSelector.sharedSubscription.test.tsx
```

成功门：

- bridge pulse 相关指标在 mixed module/readQuery 场景形成稳定下降。
- 不触发语义漂移（topicVersion、priority、selector 通知语义保持一致）。
- `probe_next_blocker` 给出可比结果，且无 `environment` 阻塞。

失败门：

- 只得到计数收敛，wall-clock 不成立。
- 产生任何语义漂移。
- 验证链路出现 `environment` 阻塞并无法在本线内消解。

## 本轮收口清单

- 结论：`discarded_or_pending`（仅针对“本轮直接实施更大 P1-4”）。
- 交付：`implementation-ready` 设计包已落盘，等待可执行环境触发后再开实现线。
- 证据锚点：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4-crossplane-bigger-design-v2.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4-crossplane-bigger-design-v2.summary.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4-crossplane-bigger-design-v2.evidence.json`
