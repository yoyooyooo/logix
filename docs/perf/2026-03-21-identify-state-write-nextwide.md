# 2026-03-21 · 广域 state-write / data-plane 识别线（after P1-1/P1-2/P1-3R 吸收与多次 hold）

## 目标

基于 `P1-1/P1-2/P1-3R` 的最新吸收与多次 hold 的事实，重新回答：

- 当前 `state write / externalStore / module-as-source / anchor-token` 方向还剩哪些新的跨模块方向值得做。
- 给出 Top2 候选与唯一建议下一线，并明确哪些旧方向已不值得再开。

输出形态为 implementation-ready 识别包，仅落盘 docs 与证据，不改代码。

## 写入范围

- 文档：`docs/perf/**`
- 证据：`specs/103-effect-v4-forward-cutover/perf/**`

## 已吸收事实压缩（只保留影响下一线裁决的结论）

1. state-write 的“事务数爆炸”问题已被压到结构性最优区间。
- `I-1` 已把事务外 writeback 收敛到 per-module batched coordinator，并把 `watchers` 的 100ms 档位从 `256 -> 512`。见 `docs/perf/archive/2026-03/2026-03-06-i1-state-writeback-batched.md`。
- `O-1/O-2` 已把常见纯 state watcher 写回并回原 action txn，并进一步在 dispatch 内直写 draft。见 `docs/perf/archive/2026-03/2026-03-06-o1-watchers-action-writeback-fusion.md`、`docs/perf/archive/2026-03/2026-03-06-o2-watchers-direct-writeback.md`。

2. externalStore 的“每 callback 一笔 txn”已完成一次可复现的批处理压榨。
- `B-1` 已为 raw externalStore 引入 in-flight batching，并完成 clean evidence 收口。见 `docs/perf/archive/2026-03/2026-03-04-b1-externalStore-batched-writeback.md`。
- externalStore 当前更应当视为 residual 复核项，开线需要满足 watchlist 触发门。见 `docs/perf/02-externalstore-bottleneck-map.md`。

3. dirty evidence 已完成一次“id-first + lazy materialization”的结构改造。
- `D-2` 使 commit 热路径不再强制构造 `DirtySet(rootIds/roots)`，并把消费口径收敛到 `TxnDirtyEvidenceSnapshot`。见 `docs/perf/archive/2026-03/2026-03-05-d2-dirtyevidence-snapshot.md`。

4. 整状态替换 `'*'` 的退化面已通过 commit-time 推导收紧，但仍存在尾部缺口。
- `G-1/G-2` 把 `dirty_all_fallback` 从“默认发生”收紧到“仅在不可推导或 registry 缺失时发生”，并引入 `if_empty` 模式避免重复推导开销。见 `docs/perf/archive/2026-03/2026-03-05-g1-infer-replace-patches.md`、`docs/perf/archive/2026-03/2026-03-05-g2-infer-replace-if-empty.md`。
- `P1-2` 的 `whole-state fallback` 收紧主线已吸收，`next-expansion` 未形成稳定收益并按 evidence-only 收口。见 `docs/perf/archive/2026-03/2026-03-20-p1-2-wholestate-fallback-next.md`、`docs/perf/archive/2026-03/2026-03-20-p1-2-next-expansion-evidence-only.md`。

5. `module-as-source` 的 post-commit 触发链已修复，且生产侧路径准备已进一步复用。
- `P1-2.2c` 已修复 `commit -> tick -> module-as-source` 触发链漏判。见 `docs/perf/archive/2026-03/2026-03-19-p1-2-2c-module-source-tick.md`。
- `P1-1.1` 已把 externalStore 单字段路径的 producer-side `FieldPathId` 预取扩展到 module-as-source 分支的一部分路径准备，降低字符串解析税。见 `docs/perf/archive/2026-03/2026-03-20-p1-1-2-fieldpathid-extended.md`。

6. `P1-3R` 当前只保留 watchlist，不作为默认下一线。
- reopen-plan 的 trigger1 仍未成立，且 current-head 已包含唯一允许的窄切口。见 `docs/perf/archive/2026-03/2026-03-21-p1-3r-env-ready-impl-check-v2.md`。

## 现阶段仍剩的真实跨模块缺口

缺口 1：`'*'` 退化仍是 tail risk，且它跨越多个写入入口。

- `setState/state.update`、部分 reducer 写回、以及未来新增的 write API 仍可能触发 `'*'`，进而放大 converge 与 selector 的工作集。
- `G-1/G-2` 已缓解，但 commit-time 推导存在不可推导分支与 registry 缺失降级，且推导本身在 full 诊断下会放大事件材料化成本。

缺口 2：FieldPathId/anchor 的“稳定性与可用性”仍未被提升为强契约。

- `D-2` 的 id-first 形态要求 registry 稳定且覆盖面足够，否则会回落到 `dirtyAll`，把上层又推回全量路径。
- `P1-1/P1-1 next` 的多次 token 化试探表明“在 runtime 热路做更多预编译”很容易产生负收益，后续需要换策略与边界。

## Top2 候选（implementation-ready）

### Top1：SW-N1 Patch-first state write contract hardening

一句话：把“产生精确 dirty evidence”升级为写入 API 的强约束面，尽可能消灭 `'*'` 退化与 commit-time 推导。

为什么值：

- 收益面跨越 `dispatch/reducer`、`BoundApi.state.*`、`externalStore`、`module-as-source`，属于真正的 data-plane 统一切口。
- 对性能与可诊断性同时正向，避免把未来优化继续建立在 `'*'` 与 best-effort 推导之上。

最小切口定义：

- 仅做“写入入口约束与降级策略重排”，不引入新的 batching window，不引入新的调度语义。
- 把 `state.update/setState` 的默认形态推向“必须提供 FieldAccessor 或 patchPaths”的写入面。
- 对无法提供证据的写入，要求显式标记为 `dirtyAll` 并带 reason code，避免静默退化。

预期代码落点清单（下一线实现时）：

- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/state-trait/external-store.ts`（只做契约对齐，不回到 draft primitive）
- `packages/logix-devtools-react/src/internal/state/logic.ts`（解释链对齐）

验收与证据口径：

- focused correctness:
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - `pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts`
- perf gates:
  - `python3 fabfile.py probe_next_blocker --json`（三套 suite 必须同口径可比）
- 证据落点：
  - `specs/103-effect-v4-forward-cutover/perf/<date>-sw-n1-*.json`

主要风险：

- 这是 forward-only 的表层契约收紧，迁移需要明确规则与 reason code，避免出现“悄悄 under-invalidation”。
- 需要把“何时允许 dirtyAll”与“何时必须 patch-first”写成可检查的规则，避免后续漂移。

### Top2：SW-N2 Static FieldPathId table and stable anchor plumbing

一句话：把 FieldPathIdRegistry 与 anchor/token 的生成前移到 Static IR，并把 runtime 的路径准备彻底切到 id-first。

后续状态更新（2026-03-22）：

- 已执行一轮最小实现尝试与验证。
- 因 `pnpm -C packages/logix-core test` 在 clean 状态未全绿，本轮按约束回滚实现并 docs/evidence-only 收口。
- 证据与收口：`docs/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor-impl-check.md`。

为什么值：

- 能把“runtime 热路字符串归一化与 registry 查找”的尾部税进一步前移，且能增强跨模块稳定标识与可回放性。
- 能把 P1-1 系列试探的“runtime 预编译负收益”替换成“静态生成与最小运行时解码”的路线。

最小切口定义：

- 只做 Static IR 到 runtime 的 token 管线打通，不在 runtime 热路新增更多预编译缓存。
- 先把 devtools 的解释链维持为 lazy materialization，避免 full 诊断反噬。

预期代码落点清单（下一线实现时）：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.*`（registry 获取与缓存边界）
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（只读 id-first）
- `packages/logix-cli/**`（如需补齐 anchor 索引与报告）

验收与证据口径：

- focused correctness:
  - `pnpm -C packages/logix-core test`
- perf gates:
  - `python3 fabfile.py probe_next_blocker --json`

主要风险：

- Static IR 的 token 漂移会导致跨版本 diff 与回放成本上升，需要冻结规则与 reason code。

## 唯一建议下一线

唯一建议下一线为 Top1：`SW-N1 Patch-first state write contract hardening`。

理由：

- 当前 state-write 已完成多轮“常数级热路压榨”，继续追 `P1-1` 类 runtime 预编译更容易复现负收益。
- `SW-N1` 可以把 tail risk 从“靠推导补救”收敛为“靠契约预防”，收益面更稳定，且跨模块一致性更强。
- `SW-N2` 仍然值得做，但它更适合作为 `SW-N1` 之后的第二阶段，避免在契约仍可退化时去提前锁定 token 形态。

## 明确不再开的旧方向

- `P1-1 dispatch PatchAnchor precompile`，已出现可复现负收益并回退。见 `docs/perf/archive/2026-03/2026-03-15-p1-dispatch-patchanchor-precompile-failed.md`。
- `P1-1 single-field pathId 直写链`，贴边 micro-bench 明确负收益。见 `docs/perf/archive/2026-03/2026-03-17-p1-1-single-field-pathid-discarded.md`。
- `P1-1 patchanchor next`，token 化试探再次出现负收益，按 docs/evidence-only 收口。见 `docs/perf/archive/2026-03/2026-03-20-p1-1-patchanchor-next.md`。
- `P1-2 next-expansion (BoundApi.state.update)`，三轮采样未形成稳定正收益且出现回摆，按 evidence-only 收口。见 `docs/perf/archive/2026-03/2026-03-20-p1-2-next-expansion-evidence-only.md`。
- `P1-3 draft primitive` 与 `large-batch-only`，维持否决。见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`。
- `P1-3R` 仅保留 watchlist 触发门，不作为默认下一线。见 `docs/perf/archive/2026-03/2026-03-21-p1-3r-env-ready-impl-check-v2.md`。

## 触发门（何时允许从 docs 进入实施线）

只要满足任一条件，允许把 `SW-N1` 从 docs 进入实施线：

- `probe_next_blocker --json` 出现非 `environment` 的 `blocked`，且 triage 可归因到 `'*'` 退化或 dirty evidence 不足导致的全量路径放大。
- 针对同一输入，连续 3 轮以上可比 probe 都指向同一类 state-write 退化原因，且不属于 `edge_gate_noise`。
