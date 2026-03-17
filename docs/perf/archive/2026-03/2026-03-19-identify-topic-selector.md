# 2026-03-19 · topic / selector / process plane 下一线识别

## 范围与输入

本次仅做只读识别，目标是从以下跨 plane 问题中收敛 future cut：

- topic plane ID 化相关债务
- selector activation/retention 后续空间
- process shared bus

重点参考：

- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-4-normal-notify-shared-microtask-flush.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
- `docs/perf/archive/2026-03/2026-03-18-form-threshold-modeling.md`
- `docs/perf/archive/2026-03/2026-03-15-p2-process-module-action-shared-upstream.md`
- `docs/perf/archive/2026-03/2026-03-16-p1-topic-id-minimal-cut-failed.md`
- `docs/perf/archive/2026-03/2026-03-15-p1-topic-subscriber-gate-evidence-refresh.md`
- `docs/perf/archive/2026-03/2026-03-15-p1-topic-fanout-post-commit.md`

当前前提：

- current-head 仍为 `clear`，本轮属于 future-only 选线排序。
- `P1-5` 已 `accepted_with_evidence` 并默认关闭，继续开刀需要新增 blocker 证据。
- `P1-4` 的 `normal notify shared microtask flush` 已失败，该微切口默认不再重开。

## Top2 候选

### Top1（建议优先）: `P2-3` 分拆实施

候选定义：

- `selector invalidation index v2`：把 commit 期的 dirty root 构造进一步前移为更稳定的索引命中路径，减少 `SelectorGraph.onCommit` 内部临时集合与重扫成本。
- `process shared bus`：在已完成 `moduleAction` shared upstream 的基础上，继续收敛 non-platform trigger 的上游订阅与 `mergeAll` 扇出壳。

正面收益：

- 同时覆盖 selector 与 process 两条热链，收益面广于单一 topic 优化。
- 与 `P1-5` 已沉淀的 retain/release 成果互补，避免在 React facade 侧重复加补丁。
- process 侧已有一刀 `accepted_with_evidence`（`moduleAction` 分组），继续沿 shared bus 收敛具备可复用路径。

反面风险：

- 横跨 `SelectorGraph / ReadQuery / process/*`，拆刀不当会增加回归面。
- process trigger 合流后，链路诊断事件顺序与可解释性需要守住，避免调试退化。

API 变动可能性：

- 默认可先走内部实现改造。
- 若要把 selector invalidation 的新索引能力暴露到外部可配置面，可能触发内部契约调整。

与 `P1-4` 旧失败微切口的差异：

- 失败切口只证明了 `microtask count` 可收敛，未形成 wall-clock 正收益。
- 本候选瞄准的是 commit 期 selector invalidation 与 process trigger 合流这类结构税，目标对象不同，证据口径也不同。

最小验证命令：

```bash
python3 fabfile.py probe_next_blocker --json
pnpm --dir packages/logix-core test -- --run test/Runtime/ModuleRuntime/SelectorGraph.test.ts test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts
```

### Top2: `P1-4` cross-plane topic 收口（重开方式受限）

候选定义：

- 保留已成立子切口（`topic subscriber gate`、`topic fanout post-commit`）。
- 若重开，只做 `RuntimeStore + TickScheduler + RuntimeExternalStore` 的跨 plane 收口。
- 明确排除两条已失败切法：`topicId minimal cut`、`normal notify shared microtask flush`。

正面收益：

- 继续降低 topic 路径的字符串解析与通知调度重复开销。
- topic plane 横跨 core 与 react，潜在横向收益依然可观。

反面风险：

- 三处实现协同变更，时序与优先级语义容易出现隐性回归。
- 若误回到“只改 microtask 调度”的窄切法，收益概率低。

API 变动可能性：

- 当前可按内部重构推进。
- 若后续要求公开稳定 topic 锚点，才需要 API 评估。

与 `P1-4` 旧失败微切口的差异：

- 不再以“每 runtime 合并一次 normal notify microtask”作为主目标。
- 新切法要求同时命中 topic 解析、accepted/deferred 归类、store 通知扇出三段协同成本。

最小验证命令：

```bash
python3 fabfile.py probe_next_blocker --json
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts
pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts
```

## 唯一建议下一线

建议只开一条：

- `P2-3` 分拆线，先做 `selector invalidation index v2 + process shared bus` 的最小可证伪切口。

理由：

1. 该线在 topic/selector/process 三者中覆盖面最大，且与 `P1-5 closeout` 形成自然续航。
2. process shared bus 已有 `moduleAction` 方向的正证据，继续推进具备低起步风险。
3. `P1-4` 最近失败集中在过窄微切口，短期内再开 topic 线更容易重复踩到“计数收敛但耗时不降”的陷阱。

建议实施形态：

- 一次只开一刀，先落 selector invalidation index v2 的 targeted 证据，再并到 process shared bus 扩展。
- 若第一刀证据不足，按 docs/evidence-only 收口，不连带开启第二刀。

