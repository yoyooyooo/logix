# Implementation Plan: Form API（设计收敛与性能边界）

**Branch**: `[010-form-api-perf-boundaries]` | **Date**: 2025-12-16 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/spec.md`  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

本特性的目标是把 `@logixjs/form` 的 Form API（Rules/Errors/Path/Controller/Schema）与 runtime 的 list-scope 校验热路径一起收敛为**可推导、可诊断、可优化**的一等公民能力：

- 产物拆解入口：`specs/010-form-api-perf-boundaries/tasks.md`（从 `docs/reviews/09-form-dx-vs-rhf.md` 的 Phase A–D 落到可交付清单）。
- Phase A（热路径闭环）：删除专家开关、deps 归一化、`$list/rows[]` 写回、rowId 稳定、Slim 诊断事件与 100 行基线。
- Phase B（Path 收敛）：统一 ValuePath/ErrorsPath/FieldPath，并明确数组映射：`userList.0.x` → `errors.userList.rows.0.x`。
- Phase C（Controller 默认语义）：补齐 `validate/validatePaths/reset/handleSubmit`，事务内纯同步、可回放、可诊断（reset 不隐式校验）。
- Phase D（Schema 收敛）：Schema/Resolver 默认仅在 submit/root validate 运行；与 Rules 合并时同一路径 Rules 覆盖 Schema；写回同一错误树（含 `$list/rows[]`）。
- **实施顺序（强约束）**：先实施 `specs/013-auto-converge-planner`，再实施本 010。010 不实现 `auto converge` 内核，只**消费 013 的契约与证据**（`requestedMode/executedMode/reasons/decisionBudgetMs`、`trait:converge` 事件），并把“动态列表/跨行校验”作为 013/014 跑道的一个代表性矩阵点固化。

## API Surface（Occam）

终态对外 API 的表面积收敛为：

- `Form.make({ values, initialValues, validateOn, reValidateOn, traits, derived })`
  - 两阶段触发策略（对标 RHF `mode/reValidateMode`）：
    - `validateOn` 默认 `["onSubmit"]`：首提前不自动触发 scoped validate（仅提交/root validate 时跑）。
    - `reValidateOn` 默认 `["onChange"]`：首提后按 change 触发 scoped validate（可选改为 onBlur）。
    - `onSubmit` 表示“只在提交/root validate 时校验”，不会额外在 change/blur 自动触发 scoped validate。
  - rule 可通过 rule 级 `validateOn`（onChange/onBlur）覆盖自动阶段白名单；wiring 是否监听/触发 change/blur 由 `validateOn ∪ reValidateOn ∪ all(rule.validateOn)` 决定。
  - `traits` 支持“直写形态”：在 `traits.<path>.check`（含 list 的 `item.check/list.check`）中可直接用对象声明规则；需要复用/组合时再提取为 `Form.Rule.make/merge` 产物（不要求默认写法先 `Rule.make` 再塞回 `Form.make`）。
  - 可选语法糖：`Form.Rule.field(valuePath, fragment)` / `Form.Rule.fields(...decls | decl[])`，用于更可组合地构造 `traits` 片段（key= valuePath）并避免对象 spread 静默覆盖；重复 valuePath 稳定失败；支持扁平化输入以便组合“已有片段 + 新片段”而不手写 spread。
  - submit/root validate 始终执行（默认运行 Rules + Schema，且合并策略在 spec 中已固化）。
  - `derived`：联动/派生入口（默认仅允许写回 `values/ui`），用于声明可完全降解为 trait `computed/link/source` 的能力；业务侧不直接写 `@logixjs/core` StateTrait。
- `Form.Rule.make/merge`：规则复用/组合工具（可完全降解为 kernel `CheckRule`），并提供对标 RHF `rules` 的内置校验器（required/minLength/maxLength/min/max/pattern 等）+ RHF 风格简写（`required:true`/`minLength:2` 等）以减少业务样板。
- `Form.Trait.*`：对齐 `StateTrait.*` API 形状的薄包装（computed/link/source/check 等同形状；`computed.get` 采用 deps-as-args，不暴露 `(state)=>`），供 `derived` 使用；允许 form 层附加能力，但不得引入第二套 IR 或绕开 deps/事务/诊断约束。
- `Form.Error.*`：只负责组织错误写回形态（尤其数组 `$list/rows[]`），不引入第二套错误真相源；rule 返回值必须对齐 scope，任意 valuePath→error 的 path-map 只允许走 controller `setError/clearErrors`。
- `traits.<listPath> = { identityHint, item, list }`：为数组字段附加列表语义（rowId/结构触发/校验 scope）。
- `Form.Path`：唯一的 Path 工具入口，集中实现 ValuePath/ErrorsPath/FieldPath 的互转（含数组 `rows` 映射与 list-pattern 归一化），替换散落实现（install/hooks/schema mapping）。
- `Form.FieldPath<TValues>` / `Form.FieldValue<TValues, P>`：TypeScript 路径类型化与值类型推导（对齐 TanStack Form 的“路径类型化”体验），并用于 `useField/useFieldArray` 的编译期约束（FR-010b）。
- controller：唯一的默认动作命名空间（RHF 风格、React/Logic 一致），用于按 valuePath 精确写入/清理错误与触发校验（例如 `setError/clearErrors/validate/validatePaths/reset/handleSubmit`），避免把“任意 path-map”塞进 rule 返回形态；`$.use(Form.module)` 拿到的 handle 必须同样暴露 `controller.*`（内部可降解为 Module actions，actions 视为实现细节），以支持组件外在 Logic/Link 中触发校验与错误写入。
- React 订阅：`useFormState(form, selector)`（或等价形态）作为唯一表单级衍生状态订阅入口（对标 TanStack Subscribe），禁止业务在 UI 层扫描 values/errors 大树（FR-007e）。
- Form 消费 Query/外部快照：010 先只固化“模块内快照 + local deps”（`source`/Query traits 写回到本模块 `ui.*`/显式槽位）；跨模块显式投影与跨模块缓存/in-flight 去重后置到 `StateTrait.source`/`@logixjs/query` 跑道；禁止在 trait/rule 内直接访问全局 store/隐式 Context。
- 非目标（本 spec 不做）：Focus management（自动聚焦/滚动到首个错误字段）等 DOM/渲染树耦合能力；如需该能力放到 UI/React 层实现（010 只保证错误树/Path/rowId 稳定且可枚举）。

### validateOn / deps（正交收敛）

- `validateOn/reValidateOn`：仅影响“自动校验”（onChange/onBlur），对标 RHF `mode/reValidateMode`：
  - `effectiveValidateOn = submitCount===0 ? validateOn : reValidateOn`
  - `onSubmit` 表示“只在提交/root validate 时校验”（即 effectiveValidateOn 不包含 onChange/onBlur）
- rule 级 `validateOn`：仅含 onChange/onBlur，作为自动校验阶段白名单；未声明则继承 `effectiveValidateOn`；显式 `[]` 表示不参与自动校验（仅在 submit/root 或手动 validate 时运行）。
- wiring：是否在 change/blur 触发 scoped validate 由 `validateOn ∪ reValidateOn ∪ all(rule.validateOn)` 决定；submit 总是 root validate。
- `deps`：唯一依赖事实源，用于 ReverseClosure 计算最小执行集；list-scope `deps:["x"]` 语义为 `listPath[].x`，并自动补齐结构依赖（insert/remove/reorder 也触发对应 list-scope 校验刷新）。
- 术语澄清：scoped validate 协议与诊断事件里的 `mode` 表示“校验阶段/触发类型”（`submit|blur|valueChange|manual`），不是历史 `Form.make.mode`（已收敛到 `validateOn/reValidateOn`）。

### TanStack 吸收点（落地到我们体系）

- **显式订阅（Subscribe/useStore）** → 010 的 `useFormState(form, selector)` + 只读 `FormView`：selector 入参必须引用稳定（缓存/结构共享），禁止 UI 扫 values/errors 大树（FR-007e）。
- **ListenTo / 跨字段触发校验** → `deps`：不引入 `listenTo` 新面；依赖图/最小执行集由 build 阶段基于 deps 推导（ReverseClosure）。
- **listeners / 联动副作用 + debounce** → 分层转化：
  - 事务内同步联动：`derived + Form.Trait.computed/link`（可回放、可解释）；
  - debounce/IO：Task/source（事务外）→ 写回新事务（不混入校验/事务窗口）。
- **persistent dirty / isDefaultValue**：010 选用 persistent dirty（热路径 O(写入量) 更新）；如需“改回默认就不 dirty”，用 `derived`/selector 显式对比 initialValues 计算（不在内核做 deep-compare）。
- **createFormHook/withFieldGroup**：属于 React DX/生态脚手架，建议后置到 010 之后在 `@logixjs/form/react` 落地（不改变 010 的 IR/语义与最小表面积）。

## Dependencies & Execution Order（013 先行）

010 的“性能门槛/auto 解释链路”依赖 013 已提供控制面与证据协议；因此本特性的实现与验收按以下前置门槛执行：

- **必须先落地（013）**：Runtime 支持 `traitConvergeMode="auto"` 默认值、`traitConvergeDecisionBudgetMs`，并在 `Diagnostics Level=light|full` 下输出 `trait:converge` 事件；其 data shape 以 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json` 为准（含 `requestedMode/executedMode/reasons/decisionBudgetMs/decisionDurationMs/configScope`；`Diagnostics Level=off` 允许不产出 converge evidence，口径以 013 为准）。
- **主跑道复用（014）**：010 的代表性场景作为 014 perf-boundaries 的一个矩阵点（或与之同口径的 runner），输出 `requestedMode=full` vs `requestedMode=auto` 的对比证据，并能在 `Diagnostics Level=light|full` 下通过 `trait:converge` evidence 解释选择路径与回退原因。
- **010 的边界**：010 不新增/修改 013 的 Policy/Cache/断路器；010 只补齐“表单域的 list-scope 校验热路径”与“可被 013 正确观察与度量”的证据（避免重复发明 auto 解释字段）。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: effect v3、`@logixjs/core`（trait/runtime 主线）、`@logixjs/form`（本特性默认入口）、`@logixjs/react`（消费/安装）  
**Storage**: N/A（内存态；errors/ui/diagnostics 均需可序列化）  
**Testing**: Vitest + `@effect/vitest`（Effect-heavy 用例）；React 侧按既有 Testing Library 风格  
**Target Platform**: Node.js 20+（runtime/test/基准）+ modern browsers（React/Devtools 消费）  
**Project Type**: pnpm workspace monorepo（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: 性能目标阈值以 `spec.md` 的 `SC-002` 为准（`Diagnostics Level=off` 下验收，避免口径漂移）；Schema 默认不进入 onChange/onBlur 热路径；基线统计口径对齐 009（30 次、丢弃前 5 次 warmup，报告 p50/p95 + 至少一类分配/写回计数；`light/full` 只验收可量化/可解释的 overhead）  
**Constraints**: 事务窗口禁 IO/await；统一最小 IR（deps 事实源 + Static IR + Dynamic Trace）；稳定标识对齐 009（instanceId/txnSeq/opSeq/eventSeq）；诊断事件 Slim 可序列化且 off 近零成本；拒绝向后兼容（迁移说明替代兼容层）  
**Scale/Scope**: 单 form 实例的 listPath 数量 0–10；list 行数常见 0–200；规则数 0–50；同一页面可并存多个表单实例与 devtools 观测

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which `docs/ssot/runtime/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction window; are write-escape hatches prevented and diagnosed?
  - Performance budget: which hot paths are touched, what metrics/baselines exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance boundaries or an automatic policy, are the (≤5) keywords, coarse cost model, and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes: does this change any public API/behavior/event protocol; where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge, and what counts as “pass” for this feature?

### Answers (Pre-Research)

- **Intent → Flow/Logix → Code → Runtime**：用户意图是“用 Form API 声明动态列表规则与默认动作语义，并在 onChange 下得到一致、可解释、可优化的结果”；落地为 trait deps→scoped validate 的可推导执行范围（ReverseClosure），并把结果与诊断降解为统一最小 IR/事件协议供 Devtools/Sandbox 消费。
- **Docs-first & SSoT**：先固化本特性 `specs/010-form-api-perf-boundaries/*` 与相关 runtime SSoT（`docs/ssot/runtime/*`），再落地到 `packages/logix-core`/`packages/logix-form`/`packages/logix-react`；用户文档同步到 `apps/docs`（不出现“PoC/内部实现”等表述）。
- **Contracts**：本特性会强化/新增 trait:check 诊断事件、scoped validate 请求与数组错误树（`$list/rows[]`）的协议；协议以 `specs/010-form-api-perf-boundaries/contracts/*` 与 `data-model.md` 固化，并在实现前回写 runtime SSoT（尤其 debugging/flow 文档）。
- **IR & anchors**：依赖事实源收敛为 deps + canonical FieldPath（段数组），数组索引不进入 canonical path；行级范围通过 rowId/index 兜底表达；Form Path 工具必须不发明第二套 path 口径。
- **Deterministic identity**：rowId 优先 trackBy；缺失时 runtime rowIdStore 保持常见数组操作稳定；整体替换且无 trackBy 允许重建但必须 degraded 诊断；instance/txn/op/event 标识对齐 009（禁止 random/time 默认 id）。
- **Transaction boundary**：validate/converge/写回必须纯同步；Schema 默认不进入 onChange/onBlur 热路径；任何 IO/async 通过 Task/事务外完成。
- **Performance budget**：热路径是“setValue/array action → deps 推导 → list-scope 扫描/最小写回 → selector/render”；必须提供 100 行基线与“避免等价 churn”的写回计数证据；Schema onChange/onBlur 若开启必须提供性能证据与诊断解释。
- **Diagnosability budgets**：诊断事件 Slim 且可序列化（off/light/sampled/full 分档）；`trait:check` 仅在 `Diagnostics Level=light|sampled|full` 产出（off 不产出）。每次 list-scope check 的事件包含 ruleId/trigger/rowIdMode/受影响范围与错误 diff 摘要（对齐 009 DynamicTrace 信封）。`off` 的验收阈值：相对同脚本 `off` 基线，`light`/`sampled`/`full` 的额外开销必须可量化并可解释；`off` 本身不得引入 O(n) 扫描与事件对象分配，且其时间开销必须可证明地“接近零成本”（默认门槛：p95 ≤ +5%）。
- **User-facing performance mental model（≤5 关键词 + 成本模型 + 优化梯子）**：
  - 关键词（≤5）：`deps` / `scan` / `writeback` / `churn` / `diagnostics`
  - 粗粒度成本模型：一次输入的主要成本为 `O(|dirty| + |affectedRules| + scannedRows + changedKeys)`；其中 scannedRows 来自 list-scope 必要扫描，changedKeys 由“最小写回 + 结构共享”控制；Schema onChange/onBlur 视为额外全量成本（默认关闭）。
  - 优化梯子：默认（deps 明确 + Schema 热路径关闭 + 最小写回）→ 打开 `Diagnostics Level=light` 观察 `trait:check`（受影响范围/changedRows）→ 缩小 deps/写回点（减少 scanned/changed）→ 提供/修复 `trackBy`（rowId 稳定，避免 degraded）→ 如仍超预算，回退/调参到更保守 `executedMode=full` 并用 013 的 `trait:converge` evidence 解释（避免不可诊断负优化）。
  - 对齐落点：基准/对比证据走 `specs/014-*` 跑道；诊断字段走 `trait:check`/`trait:converge` 合同；对外心智模型后续同步到 `apps/docs`（不出现 PoC/内部实现措辞）。
- **Breaking changes**：删除 `listValidateOnChange` 等专家开关、errors 形态迁移到 `$list/rows[]`、valuePath→errorsPath 数组映射变更；迁移说明写入 `docs/reviews/99-roadmap-and-breaking-changes.md` 并同步示例/文档（不提供兼容层）。
- **Quality gates**：实现阶段至少运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`；涉及核心路径改动补充可复现基线脚本与结果记录（按 009 口径）。

## Project Structure

### Documentation (this feature)

```text
specs/010-form-api-perf-boundaries/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── checklists/
└── contracts/
```

### Source Code (targets)

```text
packages/logix-core/src/internal/state-trait/build.ts     # deps -> Graph/Plan 边（ReverseClosure scoped validate）
packages/logix-core/src/internal/state-trait/validate.ts  # list-scope check 一次扫描 + `$list/rows[]` 写回 + rowId 锚点
packages/logix-core/src/internal/state-trait/converge.ts  # 支持 `userList[].*` 的 computed/link（动态列表级联重置的基础）
packages/logix-core/src/internal/trait-lifecycle/         # ValidateRequest/Ref 表达与 cleanup wiring
packages/logix-form/src/logics/install.ts                 # 触发语义：onChange/onBlur/submit（Schema 默认只在 submit/root）
packages/logix-form/src/form.ts                           # controller 默认动作：validate/validatePaths/reset/handleSubmit（规划）
packages/logix-form/src/schema-path-mapping.ts            # Schema error path → FieldPaths（Phase D 基础）
packages/logix-form/src/schema-error-mapping.ts           # Schema error → errorsPath 写回（需适配 rows 映射与合并策略）
packages/logix-form/src/react/useField.ts                 # valuePath → errorsPath（数组插入 rows 段）
examples/logix-react/src/demos/form/cases/                # demo 收敛：uniqueWarehouse 迁到 list-scope check
docs/ssot/runtime/                                 # 对外契约 SSoT 回写
docs/reviews/                                             # breaking changes/roadmap 证据
```

**Structure Decision**: 以内核 `state-trait/build`（deps→图/范围推导）与 `state-trait/validate`（list-scope 扫描 + 最小写回）为核心落点；Form/React/demo 只做必要迁移，不新增“开关/手写扫描”语义。

**Core/Form 分层（落实）**（依据：`specs/010-form-api-perf-boundaries/references/pr.md`）

- **下沉到 `@logixjs/core`（TraitLifecycle/StateTrait/Runtime）**：valuePath→FieldRef 解析、source 的 `autoRefresh`（onMount/onDepsChange + debounceMs）默认 wiring、deps 命中归一化（含 `[]` pattern）、list-scope deps 默认语义（`deps:["x"] => list[].x`）与结构依赖补齐、rowIdStore、通用 cleanup 原语。
- **留在 `@logixjs/form`（领域语义与 DX 外观）**：`$list/rows[]` 错误树与 `manual > rules > schema`、ValuePath↔ErrorsPath（数组插入 `rows`）映射、内置规则库与 RHF 风格简写、`controller.*` 统一动作命名空间、`Form.Path` 与类型化 FieldPath/FieldValue（含数组 index）。
- **实现纪律**：form 不再复制 path 解析 / source wiring / deps 命中逻辑；若 core 缺能力，优先补 core 而不是在 form 侧引入新的专家开关。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _None_ | _N/A_ | _N/A_ |

No violations identified for this feature at planning time.

## Phase Plan (Outputs)

### Phase 0 - Outline & Research

- 产出 `research.md`：固化 list-scope deps 归一化、`$list/rows[]` 错误树、rowId/降级策略、Trigger 归因口径、Schema 默认运行阶段、Rules 覆盖策略、valuePath→errorsPath 数组映射与 reset 语义，并列出备选方案与取舍。

### Phase 1 - Design & Contracts

- 产出 `data-model.md`：固化 ValuePath/ErrorsPath/FieldPath 三类路径、ValidateTarget/Trigger、`$list/rows[]` 错误树与 rowId 锚点、trait:check 事件载荷与预算；补齐 Schema 写回与合并优先级的语义约束。
- 产出 `contracts/`：以 OpenAPI 3.1 + JSON Schema 固化 scoped validate 请求、数组错误树与 trait:check 事件协议（不暗示具体传输实现）。
- 产出 `quickstart.md`：提供 list-scope 规则声明、数组 errorsPath 映射心智、Schema 默认阶段与合并优先级、reset/submit 默认语义的最小示例与迁移指引。
- 更新 agent context：运行 `/Users/yoyo/Documents/code/personal/intent-flow/.specify/scripts/bash/update-agent-context.sh codex`，同步本计划的技术上下文与目录结构。

### Phase 1 - Constitution Re-check (Post-Design)

- 确认 contracts 已固化稳定标识、事件 Slim/可序列化与预算上界（off/light/sampled/full）。
- 确认 onChange/onBlur 热路径不引入 Schema 默认开销；Schema onChange/onBlur 作为显式 opt-in 且可诊断。
- 确认 valuePath→errorsPath（数组插入 rows）与 `$list/rows[]` 错误树在数据模型与 quickstart 中一致（无双写口径）。
- 确认 breaking changes 的迁移说明落点明确（reviews + quickstart + 示例）。

### Phase 2 - Implementation (Planning Only)

- **Phase A（热路径闭环）**：deps 归一化（list-scope）、`mode → validateOn/reValidateOn`（对标 RHF 两阶段触发；rule 级白名单覆盖）、删除 `listValidateOnChange`、单 writer step 合并写回、`$list/rows[]` + `$rowId` 锚点、trait:check Slim 事件、100 行基线与 churn 计数证据。
- **Phase B（Path 收敛）**：
  - 新增 `Form.Path`（或等价模块）统一 valuePath/errorsPath/listPath 的互转；把 `useField`/SchemaErrorMapping/数组动作同步逻辑迁到统一实现；补齐映射测试矩阵（数组索引/深层路径/rename/pattern）。
  - TypeScript 路径类型化：落地 `Form.FieldPath<TValues>` / `Form.FieldValue<TValues, P>`，并把 `useField/useFieldArray` 的签名升级为“编译期路径约束 + value/error 类型推导”，同时保持运行时语义不变（FR-010b/SC-005a）。
- **Phase C（Controller 默认语义）**：补齐 `setError/clearErrors/validate/validatePaths/reset/handleSubmit` 的动作协议与实现；reset 清空 errors/ui 且不隐式校验；submit/root validate 触发 Rules + Schema 并遵守合并策略。
- **Phase C2（Selector/Subscribe）**：
  - 提供“表单视图（FormView）”的最小衍生状态集合（`canSubmit/isSubmitting/isValid/isDirty/submitCount` 等），并保证引用稳定（结构共享/缓存），使 `useFormState(form, selector)` 可以做到“只在选中值变化时触发渲染”。
  - 约束：FormView 的计算必须可完全降解到模块 state（不引入第二套状态源）；不得要求 UI 层扫描 values/errors 大树（FR-007e/SC-006b）。
- **Phase D（Schema 收敛）**：把 SchemaErrorMapping 写回对齐 `$list/rows[]` 与 errorsPath 映射；submit 合并时 Rules 覆盖 Schema；Schema 默认不在 onChange/onBlur 跑；同路径 value 变更时自动清理对应 Schema 错误（不重跑 Schema，FR-012c）；如开启 Schema onChange/onBlur 必须输出性能证据与诊断解释。
- **Tests & perf**：
  - 覆盖 AC/FR/SC 场景（跨行冲突、多行清理、删行/重排不漂移、映射一致、reset 语义、Schema 合并优先级）。
  - 补充可复现基线脚本并记录结果（按 009 口径），并包含诊断开关 off/light/sampled/full 的 overhead 对比（至少时间/分配其一，确保 off 近零成本）。
  - `SC-002` 的 50ms 门槛在 `Diagnostics Level=off` 下验收；`light/full` 以 NFR-002 的 overhead 口径单独验收，避免口径混淆。
  - 在 Spec 013 默认 `traitConvergeMode=auto` 下，提供 `requestedMode=full` vs `requestedMode=auto`（可选补充 `dirty`）的对比证据，并在 `Diagnostics Level=light|full` 下用 013 的 `trait:converge` evidence 解释决策（`executedMode` 仅 `full|dirty`，并包含 `cache_hit/cache_miss/budget_cutoff` 等原因字段）；默认“full 下界噪声预算”以 `FR-009` 的 5% 为门槛，对齐 NFR-005。 

## Constitution Re-check (Post-Design Results)

- **Contracts**：已在 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/contracts/openapi.yaml` 与 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/contracts/schemas/*` 固化 scoped validate 请求、`$list/rows[]` 错误树与 `trait:check` 事件协议（`Diagnostics Level=light|full` 产出；`rowIdMode=trackBy|store|index`；ErrorValue 预算为 JSON ≤256B；后续扩展需保持 Slim/可序列化与预算一致）。
- **Deterministic identity**：rowId/降级策略与 `$rowId` 锚点已在 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/spec.md` 与 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/data-model.md` 固化；实现阶段必须将 `rowIdStore` 的 RowId 生成去随机化（禁止 `Date.now/Math.random`），并对齐现有稳定标识模式（参考 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 的 `instanceId=i{seq}`、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 的 `txnId=${instanceId}::t${txnSeq}`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 的 `eventId=${instanceId}::e${eventSeq}`、`packages/logix-core/src/EffectOp.ts` 的 `opId=${instanceId}::o${opSeq}`）。
- **Hot-path guardrails**：Schema 默认运行阶段（仅 submit/root）与合并优先级（Rules 覆盖 Schema）已在 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/spec.md` 固化；实现阶段需按该口径补齐可观测事件与基线证据。
