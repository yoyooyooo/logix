# Feature Specification: Expert Verification Decouple

**Feature Branch**: `131-expert-verification-decouple`
**Created**: 2026-04-07
**Status**: Planned
**Input**: User description: "把 expert verification backing 彻底从 observability backing 脱开，建立独立 verification backing，让 Reflection.verify* 与 kernel contract backing 不再借 observability 老底座。"

## Context

`124-runtime-control-plane-verification-convergence` 已把 `runtime.check / runtime.trial / runtime.compare` 固定成 canonical verification control plane，`130-runtime-final-cutover` 也已把公开层 `Reflection.ts` 从 `internal/observability/*` 直连中切开。

当前剩余问题集中在更深一层的 backing 拓扑：

- `packages/logix-core/src/internal/reflection/kernelContract.ts` 仍直接依赖 `../observability/trialRun.js`
- expert verification 的拥有权还没有从 observability 命名体系中彻底脱出
- 后续如果继续扩 trial、compare、evidence 或 diagnostics，很容易沿着旧依赖边回流成保守耦合

这份 spec 的目标是做一刀更彻底的内部收口，把 expert verification backing 自成一层。若存在真正共享的运行与证据原语，必须抽到中性 owner；继续挂在 observability 名下不再允许。

## Scope

### In Scope

- `packages/logix-core/src/internal/reflection/**` 中所有 expert verification backing
- `packages/logix-core/src/internal/reflection-api.ts` 的 facade 边界
- `packages/logix-core/src/internal/observability/**` 中被 expert verification 直接借用的 backing
- `packages/logix-core/test/Contracts/**`、`packages/logix-core/test/Reflection*.test.ts` 中与边界治理相关的 contract tests
- `docs/ssot/runtime/09-verification-control-plane.md` 与当前 cutover ledgers 中关于 expert-only backing owner 的口径

### Out of Scope

- 不改变 `runtime.check / runtime.trial / runtime.compare` 的公开语义
- 不新增公开 verification DSL、并列入口或第二套 machine report
- 不重做 sandbox、CLI、examples 的 canonical consumer 主线
- 不展开与本依赖链无关的 observability 总体重构

## Assumptions & Dependencies

- expert verification 继续保留 `CoreReflection.verifyKernelContract`、`CoreReflection.verifyFullCutoverGate` 这类 expert-only facade 身份
- canonical verification 继续以 `runtime.*` 为唯一默认入口
- 本轮允许抽取中性 shared primitive，但 owner 必须明确，且 import 拓扑必须单向
- 若改动触及共享运行原语，需要同步更新 SSoT 与 ledger，避免再次出现“实现改了，分类没改”的漂移

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能看到 expert verification 的唯一 owner (Priority: P1)

作为维护者，我需要在 5 分钟内看清 `Reflection.verify*` 背后的唯一 owner 路径，知道 expert verification 属于哪一层、允许依赖什么、禁止依赖什么。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: 如果 owner 继续挂在 observability 的旧命名链路上，后续每次内部调整都可能把 expert verification 再次拖回模糊地带。

**Independent Test**: 维护者从 `packages/logix-core/src/internal/reflection-api.ts` 出发追踪 `verifyKernelContract` 或 `verifyFullCutoverGate`，可以在 5 分钟内到达唯一 backing owner，且无需继续阅读 `internal/observability/**` 才能理解路由。

**Acceptance Scenarios**:

1. **Given** reviewer 从 `CoreReflection.verifyKernelContract` 开始追踪， **When** 对照 spec 与代码检查， **Then** 能抵达唯一的 expert verification backing owner，而不会落入 observability 命名路径。
2. **Given** 需要新增一个 expert verification helper， **When** 维护者按本 spec 落点， **Then** 它要么进入 `internal/reflection/**`，要么进入明确标记的中性 shared owner，不得回落到 observability backing。

---

### User Story 2 - reviewer 能阻止 observability 依赖回流 (Priority: P2)

作为 reviewer，我需要一套硬边界，能明确拒绝 `internal/reflection/**` 再次直接 import `internal/observability/**` 的回流。

**Traceability**: NS-10, KF-8, KF-9

**Why this priority**: 若没有边界 contract，当前这类回流会以“先复用现成 helper”为理由反复出现。

**Independent Test**: 新增或修改 expert verification backing 后，contract tests 与 grep gate 能直接指出 forbidden edge；reviewer 不需要依赖口头说明判断。

**Acceptance Scenarios**:

1. **Given** `internal/reflection/**` 中出现新的 observability 直接依赖， **When** CI 执行 contract tests 与 grep gate， **Then** 该变更会被拦下。
2. **Given** expert verification 与 canonical trial 需要共享运行原语， **When** reviewer 检查落点， **Then** 共享原语必须位于中性 owner，且不会把 `internal/reflection/**` 重新绑回 observability 命名层。

---

### User Story 3 - Agent 能稳定区分 canonical route 与 expert route (Priority: P3)

作为 Agent，我需要继续把默认验证路由到 `runtime.*`，同时知道 `Reflection.verify*` 只是 expert route，并且这条 expert route 的 backing 不依赖 observability 默认心智。

**Traceability**: NS-8, KF-9

**Why this priority**: 公开口径已经收口，如果内部 owner 继续模糊，后续文档、测试和自动化实现仍可能退回并列心智。

**Independent Test**: 给定一个验证意图，Agent 能区分 `runtime.*` 默认入口与 `Reflection.verify*` expert route，且从 spec 中可直接看出它们的 owner 边界。

**Acceptance Scenarios**:

1. **Given** 一个 startup 或 scenario 自证需求， **When** Agent 查阅本 spec， **Then** 它仍只会走 `runtime.check / runtime.trial / runtime.compare` 主线。
2. **Given** 一个 kernel diff 或 full cutover gate 的 expert 需求， **When** Agent 查阅本 spec， **Then** 它会选择 `Reflection.verify*`，同时明确知道这条路径属于 expert verification backing，而非 observability 默认入口。

### Edge Cases

- expert verification 与 canonical trial 确实共享部分 run session、evidence 或 gate primitive 时，shared owner 必须中性命名且有单一 owner
- 抽 shared primitive 后，`runtime.trial` 与 `Reflection.verify*` 的输出语义仍必须各自稳定，不能因为复用而混出第二真相源
- `Contracts.045.*`、`Contracts.047.*` 与 `Reflection*.test.ts` 这类 intentional expert-only consumers 仍可保留，但要有清晰分类
- 若 decouple 过程中发现 observability 内仍藏有通用 verification 原语，必须在本 spec 下重新分类，不能继续以“历史上就在这里”为理由保留

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10, KF-8) 系统 MUST 为 expert verification backing 定义唯一 owner，落点只能是 `internal/reflection/**` 或显式命名的中性 shared verification owner。
- **FR-002**: (NS-8, NS-10) `CoreReflection.verifyKernelContract` 与 `CoreReflection.verifyFullCutoverGate` MUST 仅通过该 owner 路径解析，`packages/logix-core/src/internal/reflection-api.ts` 只保留 facade 与类型转发职责。
- **FR-003**: (NS-10, KF-8) `packages/logix-core/src/internal/reflection-api.ts` 与 `packages/logix-core/src/internal/reflection/**` MUST 不再直接 import `internal/observability/**`。
- **FR-004**: (NS-8, KF-9) 若 expert verification 与 canonical trial 需要共享运行或证据原语，系统 MUST 将其提升为单一中性 shared owner，并写清 allowed consumers、forbidden edges 与 owner reason。
- **FR-005**: (NS-10, KF-8) 系统 MUST 为 public reflection surface 与 internal expert backing 都建立边界 contract tests，阻止 observability 依赖回流。
- **FR-006**: (NS-8, KF-9) `docs/ssot/runtime/09-verification-control-plane.md` 与相关 ledgers MUST 明确记录 canonical route、expert route、shared primitive 的最终分类与 owner map。
- **FR-007**: (NS-8) 本轮实现 MUST 不引入兼容 facade、并列 trial DSL、并列 machine report 或默认 consumer 回退。
- **FR-008**: (NS-8, KF-9) `packages/logix-core/test/Contracts/**`、`packages/logix-core/test/Reflection*.test.ts`、`packages/logix-cli/**`、`packages/logix-sandbox/**`、`examples/logix/**` 中的默认验证入口 MUST 继续保持 `runtime.*` 主线，不得因为 expert backing decouple 重新暴露 `Reflection.verify*` 为默认路径。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) decouple 后的 expert verification 输出 MUST 继续保持 slim、可序列化、可稳定比较。
- **NFR-002**: (NS-10) 这次收口 MUST 不新增第二套 evidence truth source、第二套 trial session 语义或第二套 gate verdict 语义。
- **NFR-003**: (NS-10) 若本轮抽 shared primitive 触及 canonical trial backing，系统 MUST 提供 before/after 的验证链路证据，说明没有引入未解释的行为或性能回退。
- **NFR-004**: (NS-8, KF-9) expert verification owner、shared owner、observability backing、canonical control plane 之间的 import 拓扑 MUST 单向且无环。
- **NFR-005**: (NS-8, KF-9) reviewer 与 Agent MUST 能仅通过 spec、SSoT 与 ledger 在 5 分钟内判断 owner 与 route，不依赖口头补充。
- **NFR-006**: (NS-8) 本轮 breaking 调整继续遵守 forward-only 规则，不保留兼容层、弃用期或双写期。

### Key Entities _(include if feature involves data)_

- **Expert Verification Backing**: 承接 `Reflection.verify*` 的内部执行链、diff 规则、gate 规则与 expert-only ownership。
- **Shared Verification Primitive**: 仅在 expert verification 与 canonical trial 之间确实共享时存在的中性原语层，承接 run session、evidence 或 gate 所需的最小公共能力。
- **Observability Backing**: 历史上承接 trial/evidence 的 backing owner，本 spec 的目标是让它退出 expert verification 依赖链。
- **Verification Edge Contract**: 用测试、grep gate 与 ledger 固化的边界规则，用来判断哪些 import 合法、哪些回流必须直接拒绝。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-10, KF-8) `rg -n 'internal/observability/|../observability/' packages/logix-core/src/internal/reflection-api.ts packages/logix-core/src/internal/reflection -g '*.ts'` 的命中数为 0。
- **SC-002**: (NS-10) `packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts` 与新增或收紧的 internal edge contract tests 全部通过。
- **SC-003**: (NS-8, KF-9) reviewer 从 `CoreReflection.verifyKernelContract` 或 `CoreReflection.verifyFullCutoverGate` 出发，能在 5 分钟内找到唯一 owner，并确定 allowed / forbidden dependency edges。
- **SC-004**: (NS-8) canonical docs、examples、CLI、sandbox 默认面中，`Reflection.verify*` 新增默认入口命中数为 0；保留命中只允许出现在 intentional expert-only tests 与 ledger。
- **SC-005**: (NS-10) expert verification backing、shared primitive、observability backing 之间不存在循环依赖，也不存在语义重复的双实现。
- **SC-006**: (NS-8, NS-10) `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit` 与与边界相关的 targeted vitest 命令全部通过。
- **SC-007**: (NS-8, KF-9) 若引入 shared primitive，旧 observability-named duplicate helper 命中数为 0，且 ledger 中能看到唯一 owner 与 direct consumers 列表。

## Clarifications

### Session 2026-04-07

- Q: 这份 spec 是否会改动 `runtime.check / runtime.trial / runtime.compare` 的公开契约？ → A: 不会。它只处理 expert verification backing 的内部 owner 与依赖拓扑。
- Q: 若 expert verification 与 canonical trial 仍要共享运行原语，是否允许继续把原语放在 observability owner 下？ → A: 不允许。共享原语必须转成中性 shared owner，或直接归入 expert verification owner。
- Q: 是否允许为了省改动保留 observability 到 expert verification 的临时桥接层？ → A: 默认不允许。只有进入显式 allowlist 且附带 owner、退出条件与风险说明时才可短暂存在，本 spec 目标是把该 allowlist 压到 0。
