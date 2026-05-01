# Feature Specification: Verification Proof Kernel Second Wave

**Feature Branch**: `132-verification-proof-kernel`
**Created**: 2026-04-08
**Status**: Done
**Input**: User description: "把 Runtime.trial 和 Reflection.verify* 背后的共享执行逻辑进一步压成单一 verification proof kernel，让 canonical route 和 expert route 只保留薄适配器，并继续防止 verification 结构回退成多段半独立实现。"

## Context

`131-expert-verification-decouple` 已把 shared primitive 从 `observability` owner 下拆出，并完成了 `internal/{verification,protocol,artifacts}` 的 owner 收口。当前 verification 结构已经正确，剩余问题落在“是否已经达到最简生成元”这一层。

以拉马努金式视角看，当前还存在一个不够优雅的点：

- `proofKernel` 已经承担共享执行内核
- 但 canonical `Runtime.trial` 一侧仍有较厚的 adapter 逻辑，尤其是 `trialRunModule.ts`
- report 组装、environment 归纳、missing dependency 解释、artifact re-export 和 budget 裁剪仍粘在一条较长链路里

这会带来两个结构性问题：

- verification 的“唯一证明内核”已经出现，但 canonical adapter 还没有被压到足够小
- 未来继续改 `trial`、`artifact`、`compare`、`report` 时，`trialRunModule.ts` 很容易再次长回半独立子系统

这份 spec 的目标，是做 proof-kernel 第二波收口：继续压缩 canonical trial adapter，让 proof-kernel 成为唯一共享执行核心，而 `Runtime.trial` 只保留最小 route adapter 与 report adapter 语义。

## Scope

### In Scope

- `packages/logix-core/src/internal/verification/**` 中与 proof-kernel 直接相关的执行内核
- `packages/logix-core/src/internal/observability/trialRunModule.ts` 及其直接相邻的 canonical report / artifact / environment 组装逻辑
- `packages/logix-core/src/internal/reflection/{kernelContract.ts,fullCutoverGate.ts}` 与 proof-kernel 的共享边界
- `packages/logix-core/test/Contracts/**`、`packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts`、`packages/logix-core/test/observability/Runtime.trial*.test.ts`
- `docs/ssot/runtime/09-verification-control-plane.md` 与 `specs/130`、`specs/131` 中与 proof-kernel 口径相关的 ledger

### Out of Scope

- 不改 `runtime.check / runtime.trial / runtime.compare` 的公开命名
- 不引入新的公开 verification DSL
- 不扩写 CLI、sandbox、examples 的新验证能力
- 不展开 `compare` 的第二波设计
- 不重做 `observability` 的其他非 verification 路径

## Assumptions & Dependencies

- `proofKernel` 已经存在，并继续作为共享执行内核演进
- `Reflection.verify*` 继续只保留 expert-only 身份
- `Runtime.trial` 继续是 canonical route
- 本轮允许对 `trialRunModule.ts` 做无损拆分，但不得回退到多套执行内核
- 任何对 report / artifact / environment 的拆分，都必须继续共享同一个 proof-kernel 输出形状

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者看到唯一证明内核和极薄 canonical adapter (Priority: P1)

作为维护者，我需要看到 `proofKernel` 是唯一共享执行核心，而 `Runtime.trial` 背后的 canonical adapter 很薄，这样我才能在不读完整个 `trialRunModule.ts` 的情况下判断哪里属于执行内核，哪里只是 route/report 适配。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: proof-kernel 已经出现，如果 canonical adapter 仍保留过多共享逻辑，后续维护时还是会回到“半独立实现”的旧问题。

**Independent Test**: 维护者在 5 分钟内能沿着 `Runtime.trial -> trialRunModule -> proofKernel` 看清边界，并明确哪一层拥有 session、collector、exit normalization、report 组装。

**Acceptance Scenarios**:

1. **Given** reviewer 从 `Runtime.trial` 开始追踪， **When** 对照 spec 与代码检查， **Then** 能在 5 分钟内找到唯一 proof-kernel，并清楚看到 `trialRunModule` 只保留 canonical adapter 职责。
2. **Given** 未来要补一个新的 canonical trial output 字段， **When** 维护者按本 spec 落点， **Then** 能明确判断它应进入 proof-kernel、report adapter，还是更外围的 facade，而不会重复造执行逻辑。

---

### User Story 2 - reviewer 能拒绝 canonical adapter 再次膨胀成第二子系统 (Priority: P2)

作为 reviewer，我需要一套强约束，能拒绝 `trialRunModule.ts` 再次同时持有 session、collector、执行 wiring、report 组装、error 解释等多段共享逻辑。

**Traceability**: NS-10, KF-8, KF-9

**Why this priority**: 这类膨胀通常不会立刻出错，但会逐步侵蚀 proof-kernel 的单一性。

**Independent Test**: reviewer 能通过 contract tests、文件结构和 import 拓扑，直接判断 canonical adapter 是否重新长成第二个 verification 子系统。

**Acceptance Scenarios**:

1. **Given** `trialRunModule.ts` 中再次出现共享执行 wiring， **When** CI 跑 route contract tests 与结构 grep， **Then** 该回退会被拦下。
2. **Given** 需要拆分 `trialRunModule.ts`， **When** 维护者实施， **Then** 新文件只能按 `environment / report / artifact / error mapping` 这类单一职责拆分，而不能新造第二套 proof execution。

---

### User Story 3 - Agent 能预测 verification 能力该落在哪一层 (Priority: P3)

作为 Agent，我需要在新增 verification 能力时，能预测它应该落在 proof-kernel、canonical adapter 还是 expert adapter，不需要再靠猜测历史文件名做决定。

**Traceability**: NS-8, KF-9

**Why this priority**: verification 这条线未来还会继续长，如果分层不够稳定，Agent 生成代码时会再次走回保守路线。

**Independent Test**: 给定一个新需求，Agent 可以根据本 spec 在 5 分钟内判断其归属层级，并说明为什么不该落到其他层。

**Acceptance Scenarios**:

1. **Given** 一个新的 canonical report 字段需求， **When** Agent 查阅本 spec， **Then** 它能判断这是 canonical adapter 或 report assembler 的职责，而不是 proof-kernel 本体职责。
2. **Given** 一个新的 expert diff / gate 需求， **When** Agent 查阅本 spec， **Then** 它能判断该逻辑继续停留在 expert adapter，不进入 canonical adapter。

### Edge Cases

- canonical adapter 即便变薄，仍必须继续稳定处理 missing service/config、timeout、dispose failure、artifact budget 恢复等场景
- 如果 `proofKernel` 输出形状不足以承接 canonical report 组装，允许扩展 proof result，但不得让 adapter 自己重新推导 shared execution 事实
- `compare` 继续不在本轮范围内，禁止以“为以后 compare 预留”为理由把新抽象做大
- 若 `trialRunModule.ts` 拆分后仍出现超大文件或双向依赖，必须继续拆，不能以“已经比以前好一些”为理由停下

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10, KF-8) 系统 MUST 把 `proofKernel` 固定为唯一共享执行内核，canonical route 与 expert route 都只消费它，不得再并列持有共享执行 wiring。
- **FR-002**: (NS-8, KF-9) `internal/observability/trialRunModule.ts` MUST 只保留 canonical route adapter 语义，不得再拥有 session 创建、collector 创建、shared layer wiring 或 exit normalization 的主实现。
- **FR-003**: (NS-8, NS-10) 若 `trialRunModule.ts` 仍过厚，系统 MUST 按单一职责拆分为更小的 canonical adapter 子模块，例如 environment、report、artifact 或 error mapping，而不是继续堆在一个文件里。
- **FR-004**: (NS-10, KF-8) `kernelContract.ts` 与 `fullCutoverGate.ts` MUST 继续只保留 expert diff / gate 语义，不得重新复制 proof execution 逻辑。
- **FR-005**: (NS-8, KF-9) 系统 MUST 为 proof-kernel、canonical adapter、expert adapter 的边界建立结构 contract tests 与 route grep gate。
- **FR-006**: (NS-8, KF-9) `docs/ssot/runtime/09-verification-control-plane.md`、`specs/130` 与 `specs/131` 的 ledger MUST 继续记录 proof-kernel 与 adapter 的最终 owner map。
- **FR-007**: (NS-8) 本轮实现 MUST 不改变 `Runtime.trial`、`Reflection.verify*` 的公开语义与默认 consumer 路径。
- **FR-008**: (NS-8, KF-9) 任何新增 verification 需求都 MUST 能被分类到 `proofKernel / canonical adapter / expert adapter` 三层之一，不允许落到“暂时先放这里”的模糊层。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) `proofKernel` 与 adapter 拆分后，verification 输出 MUST 继续保持 slim、可序列化、可稳定比较。
- **NFR-002**: (NS-10) 本轮拆分 MUST 不新增第二套 evidence truth source、第二套 error summary 语义或第二套 report builder。
- **NFR-003**: (NS-10) 若本轮改动触及 canonical `Runtime.trial` 的 steady-state 行为路径，系统 MUST 提供 targeted before/after 验证，说明没有未解释回退。
- **NFR-004**: (NS-8, KF-9) `proofKernel -> canonical adapter / expert adapter -> public facade` 的 import 拓扑 MUST 单向且无环。
- **NFR-005**: (NS-8, KF-9) reviewer 与 Agent MUST 能在 5 分钟内仅通过 spec、docs 和 ledger 解释这三层边界。
- **NFR-006**: (NS-8) 本轮 breaking 调整继续遵守 forward-only 规则，不保留兼容层、双写期或过渡 facade。

### Key Entities _(include if feature involves data)_

- **Verification Proof Kernel**: 唯一共享执行内核，负责 session、evidence、exit normalization、shared layer wiring。
- **Canonical Trial Adapter**: 承接 `Runtime.trial` 的输入装配、environment 归纳、report 组装与 artifact re-export。
- **Expert Verification Adapter**: 承接 `CoreReflection.verifyKernelContract`、`CoreReflection.verifyFullCutoverGate` 的 diff / gate 逻辑。
- **Verification Report Assembler**: 若需要从 canonical adapter 中拆出，专门负责 manifest / staticIr / artifacts / evidence 的裁剪、恢复和最终 report 形状。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-10, KF-8) `proofKernel` 成为唯一共享执行内核，`trialRunModule.ts`、`kernelContract.ts`、`fullCutoverGate.ts` 中不再各自持有 `session + collector + exit normalization` 的独立实现。
- **SC-002**: (NS-10) `packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts` 与 route contract tests 全部通过。
- **SC-003**: (NS-8, KF-9) reviewer 从 `Runtime.trial` 出发，能在 5 分钟内说明 proof-kernel、canonical adapter、expert adapter 的边界与职责。
- **SC-004**: (NS-8) canonical 默认 consumer 仍只走 `Runtime.trial`，expert-only consumer 仍只命中 intentional tests。
- **SC-005**: (NS-10) `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit` 与 proof-kernel 相关 targeted vitest 命令全部通过。
- **SC-006**: (NS-8, KF-9) `docs/ssot/runtime/09-verification-control-plane.md` 与相关 ledger 中不再存在与 proof-kernel 分层相冲突的旧描述。
- **SC-007**: (NS-10) 若 `trialRunModule.ts` 继续拆分，拆出的每个文件都能用一句话说明其职责，且不存在“同一事实在两个 adapter 文件里各算一遍”的情况。

## Clarifications

### Session 2026-04-08

- Q: 这份 spec 是否要重新定义 proof-kernel 本身？ → A: 不重新定义。proof-kernel 已存在，本 spec 处理的是它周围 adapter 的第二波压缩。
- Q: 这份 spec 是否要改变 `Runtime.trial` 的公开契约？ → A: 不改变。它只继续压缩 canonical route 内部结构。
- Q: 如果拆分 `trialRunModule.ts` 会产生多个新文件，是否允许？ → A: 允许，但只能按单一职责拆分，不允许因此长出第二个共享执行内核。
