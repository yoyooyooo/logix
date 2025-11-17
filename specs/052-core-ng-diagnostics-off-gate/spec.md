# Feature Specification: diagnostics=off 近零成本 Gate（回归防线）

**Feature Branch**: `052-core-ng-diagnostics-off-gate`  
**Created**: 2025-12-29  
**Status**: Done  
**Input**: User description: "把 diagnostics=off 的‘近零成本’要求从约定变成可验收 Gate：覆盖 core/core-ng 的关键热路径（converge/txn/Exec VM evidence），用测试 + perf evidence 拦截任何 off 档位的隐式分配/字符串 materialize/计时采样回归。"

## Terminology

- **diagnostics level**：`off | light | full`；off 必须近零成本（不产生常驻分配、不做 O(n) 扫描）。
- **allocation gate（分配闸门）**：以测试/微基准/证据约束 off 档位不可发生的行为（steps 数组、label 拼接、计时、mapping materialize）。
- **evidence fields**：仅 light/full 输出的可解释字段；off 不输出（或只输出固定锚点）。

## Related (read-only references)

- `specs/046-core-ng-roadmap/`（NG 路线总控：052 的职责边界）
- `specs/039-trait-converge-int-exec-evidence/`（已达标基线：converge 的 diagnostics=off 闸门与证据套件）
- `specs/044-trait-converge-diagnostics-sampling/`（采样诊断：避免 per-step `now()`）
- `specs/049-core-ng-linear-exec-vm/`（Exec VM evidence：off 必须不输出）
- `specs/050-core-ng-integer-bridge/`（id→readable mapping：off 必须不 materialize）
- `specs/051-core-ng-txn-zero-alloc/`（txn 零分配：off 闸门覆盖其实现）
- `specs/045-dual-kernel-contract/`（对照验证跑道：off 档位对照仍必须可解释且可序列化）

## Clarifications

### Session 2025-12-29

- Q: 052 是否改变对外语义？ → A: 不改变；只收口 off 档位行为与回归防线。
- Q: 052 的“off”范围是 Debug 还是 instrumentation？ → A: 以 `Debug.DiagnosticsLevel=off` 为准；同时要求相关实现不要把 full/light 的税泄漏到 off（instrumentation 的细节由 051 管理）。

- AUTO: Q: perf evidence 预算口径是什么？ → A: 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）并满足 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须 `meta.matrixId/matrixHash` 一致。
- AUTO: Q: Node/Browser 都要 Gate PASS 吗？ → A: 是；任一平台出现回归都视为 FAIL。
- AUTO: Q: 是否允许在混杂改动 worktree 上采集 before/after？ → A: 不允许；必须在隔离 worktree/目录分别采集，混杂结果仅作线索不得宣称 Gate PASS。
- AUTO: Q: “diagnostics=off 近零成本”的允许/禁止边界是什么？ → A: 允许 begin/commit 的常数级分配（例如一次性最小锚点对象/固定字段写入），但禁止热循环按 step/patch 增长的分配（steps/hotspots 数组、per-step 字符串、per-step `now()` 计时）。
- AUTO: Q: off 档位允许输出哪些最小锚点？ → A: 只允许固定字段锚点（instanceId/txnSeq/opSeq 等稳定链路锚点），且必须 Slim、可序列化、无数组；可解释字段（mapping/labels/reason 文本）仅 light/full。
- AUTO: Q: off gate 的 baseline kernel 与覆盖矩阵？ → A: P1 Gate 以默认 `kernelId=core` 为准；`core-ng` 仅 compare-only/试跑且不得引入显著回归（支持矩阵写入 plan.md 与 contracts）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - off 档位近零成本（不分配、不计时、不拼接） (Priority: P1)

作为运行时维护者，我希望在 `diagnostics=off` 下，关键热路径不产生额外分配：不分配 steps/hotspots 数组，不拼接 stepLabel/traceKey，不做 per-step `now()` 计时，不 materialize id→readable 映射。

**Independent Test**:

- Browser：`diagnostics.overhead.e2e`（以及 matrix P1 suites 的 off baseline）diff 无回归；
- Node：关键 bench diff 无回归（至少覆盖 `converge.txnCommit`）。

---

### User Story 2 - off 下仍可对照与失败可解释（不引入并行真相源）(Priority: P1)

作为平台/Devtools 维护者，我希望 off 档位仍能输出最小可序列化锚点（instanceId/txnSeq/opSeq 等），并在需要时通过 light/full 补充解释信息；off 不得偷偷输出大对象或 mapping。

**Independent Test**: 045 对照验证在 off 档位下仍能运行且输出可序列化 diff；light/full 可补充解释字段但不改变 primary anchors。

---

### User Story 3 - 回归防线：测试 + checkpoint + 证据 (Priority: P2)

作为维护者，我希望 off 档位的“禁止项”在代码 review 之外还能被自动化拦截：出现 `split/join` 往返、隐式数组分配、mapping materialize 等行为时有测试或 checkpoint 直接失败。

---

### Edge Cases

- diagnostics=off 但仍启用其他 feature（sampling/time-slicing）：如何避免泄漏分配？
- Exec VM/Integer Bridge 未命中时的降级：off 下不得输出自由文本 reason；只能输出最小锚点（原因码仅 light/full）。
- 读状态车道（057）引入后，off 是否会触发 selector graph 的额外构建？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `diagnostics=off` MUST 不输出 steps/hotspots/labels/mapping；仅允许输出固定字段锚点（instanceId/txnSeq/opSeq 等），不得输出数组；不得在热循环内做计时与字符串拼接。
- **FR-002**: `diagnostics=off` MUST 保持统一最小 IR 与稳定锚点；不得引入并行真相源。
- **FR-003**: 系统 MUST 提供可回归的 off 闸门：测试 + perf evidence 套件，能阻断 off 档位回归。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: off 档位额外开销必须接近零；在 Node+Browser 的 diff 中不得引入回归：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论以 `profile=default`（或 `soak`）且 `pnpm perf diff` 输出必须满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`；before/after 必须满足 `meta.matrixId/matrixHash` 一致。
- **NFR-002**: off 档位不得出现可观测常驻分配或 O(n) 扫描；任何例外必须先被证据触发并另立 spec 裁决。
- **NFR-003**: before/after/diff 必须在隔离 worktree/目录分别采集；混杂改动结果仅作线索不得宣称 Gate PASS。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `diagnostics.overhead.e2e`（Browser）与关键 Node bench 的 before/after diff 无回归（`meta.comparability.comparable=true && summary.regressions==0`）。
- **SC-002**: 至少 1 条守护测试/checkpoint 能在 off 档位出现 steps 数组/label 拼接/字符串 materialize 时失败。
