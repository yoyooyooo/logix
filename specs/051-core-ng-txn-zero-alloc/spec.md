# Feature Specification: core-ng 事务零分配（txn zero-alloc）

**Feature Branch**: `051-core-ng-txn-zero-alloc`  
**Created**: 2025-12-29  
**Status**: Done  
**Input**: User description: "在 1+2（Integer Bridge + Evidence）做到位的前提下，把 txn/patch/dirtyset 路径的分配行为收口到极致：light/off 档位不产生额外对象分配，并用 Node+Browser 证据门禁拦截回归。"

## Terminology

- **Transaction Window（事务窗口）**：一次同步 state 更新窗口；必须保持 0/1 次最终可观察提交；窗口内禁 IO/async。
- **StateTransaction**：事务聚合器（draft/dirty/patch/snapshots），提交时聚合为可序列化的事务摘要。
- **instrumentation=full/light**：事务内 patch/snapshot 的记录档位（full 可保留历史；light 必须走 argument-based recording）。
- **argument-based patch recording**：调用点不创建 patch 对象；通过 `recordPatch(path, reason, from?, to?, ...)` 直接写入 txn 聚合器。
- **dirty roots / dirty-set**：本次事务影响范围的最小根集合；作为 converge/调度与证据锚点输入。
- **零分配（Zero-Alloc）**：指 **热循环/调用点** 不产生额外对象分配（允许 transaction 开始/结束阶段有常数级分配）；任何“每 step / 每 patch”分配都视为 FAIL。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（NG 路线总控：P1 纯赚 specs）
- `specs/045-dual-kernel-contract/`（Kernel Contract + 对照验证跑道）
- `specs/039-trait-converge-int-exec-evidence/`（已达标基线：argument-based recording、诊断闸门、Exec IR/bitset）
- `specs/050-core-ng-integer-bridge/`（Integer Bridge：id-first 表示与可解释映射）
- `specs/049-core-ng-linear-exec-vm/`（Exec VM：线性 plan + typed buffers）
- `specs/009-txn-patch-dirtyset/`（txn/patch/dirtyset 历史约束）

## Clarifications

### Session 2025-12-29

- Q: 051 是否改变对外语义或引入新 API？ → A: 不改变；属于纯优化与契约收口，consumer 仍只依赖 `@logixjs/core`。
- Q: “零分配”是否意味着整个事务完全无分配？ → A: 不是；允许 begin/commit 的常数级分配，但禁止热循环/调用点按 step/patch 增长的分配。
- Q: 051 与 050 的边界？ → A: 050 定义 id/表示与可解释链路；051 只收口分配行为与分支形态（见 `specs/046-core-ng-roadmap/spec-registry.md` 的 P1 边界表）。

- AUTO: Q: perf evidence 预算口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）并满足 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: perf evidence 采集是否允许在 dev 工作区（git dirty）完成？ → A: 允许（当前阶段）；但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时升级到 `profile=soak`）。
- AUTO: Q: Node/Browser 都要 Gate PASS 吗？ → A: 是；任一平台出现回归都视为 FAIL（不得 cherry-pick）。
- AUTO: Q: Perf Gate 的 baseline runtime 组合是什么？ → A: 固定 `diagnostics=off + stateTransaction.instrumentation=light`；light/full 仅用于解释链路与开销曲线，不作为默认 Gate baseline。
- AUTO: Q: dirtyAll 降级在 Gate 覆盖场景下是否允许？ → A: 不允许；在 Node `converge.txnCommit` 与 Browser `converge.txnCommit` 触发 `dirtyAll=true` 视为 FAIL（必须先修复或扩大 registry 容量并证据化）。
- AUTO: Q: instrumentation=full 是否允许调用点 materialize patch 对象？ → A: 不允许；调用点永远 argument-based，full 的对象 materialize 只能在 txn 聚合器边界完成，且不得把对象税泄漏到 light。
- AUTO: Q: txn 内 dirty roots/dirty-set 的表示是否必须 id-first？ → A: 必须；txn 内与 txn 输出都以 **FieldPath segments（`FieldPath`）** 等“非字符串往返”表示表达 dirty roots；string path 仅允许作为输入/显示，且不得在事务窗口内 `join→split` 往返（遵循 050）。
- AUTO: Q: 051 对 core/core-ng 的支持矩阵如何声明？ → A: P1 Gate 以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归（支持矩阵写入 plan.md 与 contracts）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - light 档位热路径零分配（调用点不创建对象） (Priority: P1)

作为运行时维护者，我希望在 `instrumentation=light` 下，事务窗口的热路径不会按 patch/step 增长分配：调用点只做 argument-based recording，txn 聚合器只维护必要的 dirty 信息与最小摘要。

**Independent Test**:

- Node：`converge.txnCommit`（通过 `pnpm perf bench:traitConverge:node`）before/after diff 无回归（baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`）；
- Browser：`converge.txnCommit`（priority=P1；converge-only）在 diff 中不出现回归（baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`）。

---

### User Story 2 - full 档位仍可诊断，但不把税泄漏到 light (Priority: P1)

作为维护者，我希望 `instrumentation=full` 仍能记录 patches/snapshots 以支撑排障，但这些能力不应污染 `light` 的执行形态：full 的对象 materialize 发生在 txn 内部，不要求调用点先分配。

**Independent Test**: 单元测试覆盖 full/light 两档的行为差异；并且在 perf evidence 中 `light` 档位没有新的常驻分配或 O(n) 扫描。

---

### User Story 3 - 回归防线与证据化（Node+Browser）(Priority: P2)

作为维护者，我希望“零分配”不只是一句口号：它必须被可重复的证据门禁与守护测试拦截，一旦出现回归能快速定位到具体调用点/环路。

**Independent Test**: 产出 Node+Browser 的 before/after/diff 工件；并补充至少一条“半成品态/隐式分配”哨兵测试或 microbench checkpoint。

---

### Edge Cases

- dirty roots 极大/极稀疏：容器增长、清零成本与复用策略如何证据化？
- 动态/异常路径：无法追踪的写入如何显式降级（不得偷偷退化为字符串解析/全量扫描）？
- instrumentation=full 下 patches 数量极大：如何避免调用点分配、如何裁剪/摘要（诊断档位控制）？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在 `instrumentation=light` 下提供 argument-based recording：调用点不得创建 patch 对象；禁止 rest 参数；分支必须搬到 loop 外。
- **FR-002**: 系统 MUST 在 txn 热路径避免字符串解析往返：不得在事务窗口内 `join/split`；txn 内 dirty roots/dirty-set 必须采用 **FieldPath segments（`FieldPath`）** 等“非字符串往返”表示，string path 仅允许在事务外/显示边界 materialize（对齐 050）。
- **FR-003**: 系统 MUST 能在不改变 consumer 依赖的前提下收口 txn 内部实现：consumer 不直接依赖 `@logixjs/core-ng`。
- **FR-004**: 系统 MUST 复用 `$logix-perf-evidence` 的证据门禁：Node + ≥1 条 headless browser before/after/diff 落盘并可对比。
- **FR-005**: 系统 MUST 保持调用点零对象分配：即使 `instrumentation=full` 也不得要求调用点先 materialize patch/snapshot 对象；full 的对象 materialize 必须在 txn 聚合器边界完成，且不得污染 `instrumentation=light` 的热路径执行形态。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Gate baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`；Node 与 Browser（`converge.txnCommit`）diff 必须分别 `meta.comparability.comparable=true && summary.regressions==0`，任一失败整体 FAIL。
- **NFR-002**: `instrumentation=light` 下不得出现按 patch/step 增长的对象分配；出现即视为负优化并必须被证据或守护测试捕获。
- **NFR-003**: 事务窗口必须保持同步：不得引入事务内 IO/async，不得引入写逃逸。
- **NFR-004**: 在 P1 Gate 覆盖场景（Node `converge.txnCommit` + Browser `converge.txnCommit`）中触发 `dirtyAll=true` 降级视为 FAIL；不得以“可用性”为由默认化该降级路径。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Node `converge.txnCommit`（`pnpm perf bench:traitConverge:node`）与 Browser `converge.txnCommit` 的 before/after diff 无回归，且能解释主要收益/瓶颈。
- **SC-002**: Browser `converge.txnCommit` 的 before/after diff 无回归；如要主张“纯赚收益”，补充至少 1 条可证据化收益（例如 alloc/heap delta 明显改善）。
- **SC-003**: 至少 1 条守护测试或 checkpoint 能在出现“调用点创建 patch 对象 / 隐式数组分配 / join/split 往返 / P1 Gate 覆盖场景触发 `dirtyAll=true` 降级”时失败（阻断半成品态默认化）。
