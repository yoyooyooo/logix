# 2026-03-21 · P1-4B module-scoped pulse coalescing（implementation-ready，docs/evidence-only）

> 后续状态更新：`P1-4B-min RuntimeExternalStore module pulse hub` 已在同日完成实施并 `accepted_with_evidence`，见 `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`。

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4b-pulse-coalescing-design`
- branch：`agent/v4-perf-p1-4b-pulse-coalescing-design`
- 唯一目标：把 `P1-4B module-scoped pulse coalescing` 收成 implementation-ready 设计包或最小实施切口判定。
- 本轮约束：
  - 不回到 `normal-path shared microtask flush`
  - 不回到 `dirtyTopics single-pass classification`
  - 不改 public API

## 本轮触发器事实

- `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=blocked`
- 阻塞类型：`failure_kind=environment`
- 关键信息：`vitest: command not found`，`node_modules missing`

当前证据不具备可比性，本轮不进入代码实施。

## 本轮裁决

- 结论类型：`docs/evidence-only`
- 结果分类：`discarded_or_pending`
- `accepted_with_evidence=false`
- 交付物：`P1-4B` implementation-ready 设计包 + 最小实施切口判定

## 为何 `P1-4B` 比旧小切口更值

1. `normal-path shared microtask flush` 只压缩调度层“何时 flush”，没有减少同一 module 下跨 topic 的重复通知准备。
2. `dirtyTopics single-pass classification` 只压缩 TickScheduler 内分类成本，无法减少 runtime 到 react bridge 的重复 pulse。
3. `P1-4B` 直接把收益锚点放到 `moduleInstance` 维度，覆盖 module topic 与 readQuery topic 的同 tick 重复脉冲，收益面横跨 runtime 和 react bridge。

## implementation-ready 最小实施切口判定

### Cut 名称

- `P1-4B-min`: `RuntimeExternalStore module pulse hub`

### 最小改动范围

第一刀仅改：
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/internal/RuntimeExternalStore.lowPriority.test.ts`
- `packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`（补覆盖）

保持不动：
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

### 设计要点

1. 在 `RuntimeExternalStore` 增加 `modulePulseHub`（按 `moduleInstanceKey` 聚合）。
2. 同一 `tickSeq` 内，module topic 与 readQuery topic 的通知请求只触发一次 flush 安排。
3. flush 时按本 module 的最高优先级执行现有调度策略：
   - 有 `normal` 请求时走 microtask。
   - 只有 `low` 请求时沿用现有 delay/maxDelay 语义。
4. topic 版本与快照读取逻辑保持现状，不改 `getSnapshot` 语义。
5. 无需动 `TickScheduler dirtyTopics` 分类与 merge 逻辑，避免回到已否决切口。

### 风险门与失败门

- 风险门：
  - `topicVersion` 变化后快照刷新必须与现行为一致。
  - `lowPriority` 延迟边界不能劣化。
  - `useSelector` 共享订阅语义不能漂移。
- 失败门：
  - 仅有计数收敛，没有 wall-clock 收益。
  - 任一语义回归（快照、优先级、订阅可见性）。

### 验证门（触发实施后）

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-react typecheck:test
python3 fabfile.py probe_next_blocker --json
```

建议追加：

```bash
pnpm -C packages/logix-react test -- RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react test -- useSelector.sharedSubscription.test.tsx
```

## 本轮落盘

- `docs/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.evidence.json`
