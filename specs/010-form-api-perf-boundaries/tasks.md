---
description: "Tasks for 010-form-api-perf-boundaries"
---

# Tasks: 010-form-api-perf-boundaries

**Input**: 设计文档（绝对路径）
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/spec.md`
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/plan.md`
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/research.md`
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/data-model.md`
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/contracts/openapi.yaml`

**Prerequisites**:
- 013 先行（010 仅消费契约/证据，不实现 auto converge 内核）：`/Users/yoyo/Documents/code/personal/intent-flow/specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`

**Tests**:
- 本特性会改动 `packages/logix-core` 与 `packages/logix-form` 的核心路径；测试与性能/诊断回归防线视为必需（除非 `spec.md` 明确给出缺失测试的可接受理由）。

## Format: `- [ ] T### [P?] [US?] 描述 + 绝对文件路径`

- **[P]**：可并行（不同文件、无未完成依赖）
- **[US?]**：用户故事标签（仅用户故事阶段使用：`[US1]`/`[US2]`/`[US3]`）
- 每条任务必须包含明确的绝对文件路径
- Phase 命名说明：`plan.md` 的 Phase A–D 是“概念切片”（热路径/Path/Controller/Schema）；`tasks.md` 的 Phase 1–N 是“执行分期”（Setup/Foundational/按用户故事），两者不要求一一对齐。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为后续实现准备“可复现证据”与复用测试夹具

- [X] T001 [P] 新增性能基线记录模板 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/references/perf-baseline.md`
- [X] T002 [P] 新增 list-scope 校验测试夹具（100 行、可制造重复/解除重复）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/fixtures/listScopeCheck.ts`
- [X] T003 [P] 新增 form 侧 list-scope 校验测试夹具（FormBlueprint + 动态列表）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/fixtures/listScopeCheck.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 本阶段完成前，不开始任何用户故事任务

- [X] T004 修复 list-scope deps 默认语义：`deps:["x"] => <listPath>[].x`（确保 `deps:["warehouseId"]` 不再被前缀化为 `<listPath>.warehouseId`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/model.ts`
- [X] T005 [P] 为 list-scope deps 归一化新增单测（ReverseClosure 必须从 `items[].x` 命中 list-scope check）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ListScopeDepsNormalization.test.ts`
- [X] T006 为 scoped validate 的 Graph target 引入 valuePath→patternPath 归一化（`items.0.x`→`items[].x`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T007 修复 list target 触发语义：`Ref.list("items")` 必须能选中 list-scope check（Graph targets 至少包含 `items` 与 `items[]`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T008 [P] 为 list target 触发语义新增单测（array 结构动作触发 list-scope check）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ListTargetTriggersListScope.test.ts`
- [X] T009 扩展 ValidateContext：注入 `origin`（= Trigger/事务起点外部事件，用于 trait:check Trigger 稳定归因）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T010 将 `origin` 透传到 validateInTransaction 调用点（保持“Trigger 只认事务起点外部事件”）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T011 扩展 ValidateContext：注入 `rowIdStore` 与 list trackBy hint（用于 `$rowId` 与 `rowIdMode`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T012 将 `rowIdStore` 透传到 validateInTransaction 调用点（从 ModuleRuntime 的 rowIdStore）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [X] T013 去随机化 RowId 生成：禁止 `Date.now/Math.random`，改为单调序号（确保同样操作链路可重放/可比对）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/rowid.ts`
- [X] T014 [P] 为 RowId 去随机化新增回归断言（RowId 格式可预测 + 常见数组操作后稳定）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.RowIdMatrix.test.ts`
- [X] T015 下沉 valuePath→FieldRef 解析到 TraitLifecycle：新增 `TraitLifecycle.Ref.fromValuePath(valuePath)`（替代 form 侧自造 parser，支持至少单层 index；可选补齐 `listIndexPath`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/trait-lifecycle/index.ts`
- [X] T016 [P] 为 `TraitLifecycle.Ref.fromValuePath` 新增单测（覆盖 field/list/item/root + index/pattern）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/TraitLifecycle.Ref.fromValuePath.test.ts`
- [X] T017 让 DebugSink 对 `trace:trait:check` 进行可导出映射（light/full 保留 Slim meta；off 不导出）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [X] T018 [P] 增补 `trace:trait:check` 的序列化/裁剪测试（对齐 contracts 的 `TraitCheckData`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/Debug.RuntimeDebugEventRef.Serialization.test.ts`

**Checkpoint**: Foundation ready - 用户故事可开始

---

## Phase 3: User Story 1 - 跨行约束实时一致反馈 (Priority: P1) 🎯 MVP

**Goal**: list-scope 规则“一次扫描，多行写回”，onChange 下即时一致

**Independent Test**: 使用动态列表（100 行）+ 唯一性跨行规则；制造重复与解除重复，所有受影响行错误即时出现/清除（`Diagnostics Level=off` 下满足 `SC-002`）

### Tests for User Story 1

- [X] T019 [P] [US1] 新增 list-scope 规则回归测试：重复/解除重复应同步影响所有行错误 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ListScopeCheck.Writeback.test.ts`
- [X] T020 [P] [US1] 新增 FormBlueprint 回归测试：`validateOn=["onChange"]` 下不提交也能得到一致跨行错误 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.ListScopeUniqueWarehouse.test.ts`

### Implementation for User Story 1

- [X] T021 [US1] 在 StateTrait validate 支持 list-scope 规则返回值：允许返回 `rows[]`（或 `{ $list?, rows }`）并合并多个 rule 输出 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T022 [US1] 将 list-scope 校验结果写回为 `$list/rows[]`（禁止写回 `errors.<valuePath>` 旧口径）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T023 [US1] list-scope 写回必须避免等价 churn：未变化的 `errors.<list>.rows[i]` 复用引用、无变化则 0 commit `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T024 [US1] 行级锚点写回：为受影响行写入 `errors.<list>.rows[i].$rowId`（来源：trackBy/rowIdStore/index 兜底）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T025 [US1] 更新 Form 的数组 errors/ui 结构以对齐 `$list/rows[]`（append/prepend/remove/swap/move）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T026 [US1] 更新 `useField` 的 valuePath→errorsPath 映射：数组路径必须插入 `rows`（并为后续 manual/schema 留接口位）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/react/useField.ts`
- [X] T027 [US1] 迁移 FormBlueprint.array 测试到 `$list/rows[]` 结构（errors/ui 对齐语义不变）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/FormBlueprint.array.test.ts`
- [X] T028 [US1] 迁移 demo：将 uniqueWarehouse 从“每行扫全表”升级为 list-scope 单次扫描输出多行错误 `/Users/yoyo/Documents/code/personal/intent-flow/examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- [X] T029 [US1] 新增可复现性能用例 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ListScopeCheck.Perf.off.test.ts` 并把结果写入 `/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/references/perf-baseline.md`

**Checkpoint**: US1 可独立演示与验证（跨行错误一致 + 50ms@100 行基线）

---

## Phase 4: User Story 2 - 默认正确，无需“专家开关/手写扫描” (Priority: P2)

**Goal**: 删除隐藏开关；触发范围只由 deps/IR 推导；结构变更也会刷新 list-scope

**Independent Test**: 业务/示例不配置任何 listValidateOnChange；仅声明列表级规则即可在 onChange 下正确刷新（含 insert/remove/reorder）

### Tests for User Story 2

- [X] T030 [P] [US2] 新增回归测试：删除 `listValidateOnChange` 后，仍能在 `validateOn=["onChange"]` 下自动刷新 list-scope `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Install.NoExpertSwitch.test.ts`

### Implementation for User Story 2

- [X] T031 [US2] 移除 `listValidateOnChange` 公共配置与实现（不提供兼容层）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T032 [US2] 移除 `listValidateOnChange` 安装逻辑分支，并用 `TraitLifecycle.Ref.fromValuePath` 统一解析 validate target（删除 form 内自造 parser）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/logics/install.ts`
- [X] T033 [US2] arrayAppend/Prepend/Remove/Swap/Move 必须触发 list target 的 scopedValidate（结构变更也刷新跨行规则）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/logics/install.ts`
- [X] T034 [US2] 移除 demo 中的 `listValidateOnChange/mode` 配置，改用 `validateOn/reValidateOn`，并保持跨行规则默认正确 `/Users/yoyo/Documents/code/personal/intent-flow/examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- [X] T035 [US2] 将 source 的 `autoRefresh`（onMount/onDepsChange + debounceMs）默认 wiring 下沉到 TraitLifecycle（form 不再扫描 program.entries）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/trait-lifecycle/index.ts`
- [X] T036 [US2] 删除/收敛 form install 内的 source 扫描与 refreshAffectedSources（改为调用 TraitLifecycle 能力或完全移除）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/logics/install.ts`

**Checkpoint**: US2 达成（无专家开关、结构变更也触发 list-scope）

---

## Phase 5: User Story 3 - 错误归属稳定且可解释 (Priority: P3)

**Goal**: `$rowId` 锚点稳定；`Diagnostics Level=light|full` 输出可序列化 `trait:check` 解释链路（off 不产出）

**Independent Test**: 产生行级错误后对列表执行 remove/move/swap，错误不漂移不残留；打开 diagnostics 后可解释“哪个规则、因何触发、影响范围与变化摘要”

### Tests for User Story 3

- [X] T037 [P] [US3] 新增回归测试：remove/move/swap 后错误不漂移、不残留 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.RowIdErrorOwnership.test.ts`
- [X] T038 [P] [US3] 新增回归测试：Diagnostics off 不产出 trait:check；light/full 产出且可序列化 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.TraitCheckEvent.DiagnosticsLevels.test.ts`

### Implementation for User Story 3

- [X] T039 [US3] 产出 `trait:check` 事件：每个执行到的规则在 light/full 下记录 Slim 可序列化摘要（对齐 contracts）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T040 [US3] `trait:check.data.trigger` 必须稳定归因到事务起点外部事件（kind+path+op；txn 内派生写入不改变 trigger）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T041 [US3] `trait:check.data.rowIdMode` 与 degraded 信息：区分 `trackBy|store|index`，并在“整体替换且无 trackBy”时输出 degraded `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/validate.ts`

**Checkpoint**: US3 达成（稳定归属 + 可解释事件 + off 零成本档位）

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 覆盖 spec 的 Phase B/C/D（Path 工具、类型化、controller、Schema）与迁移/文档对齐

- [X] T042 [P] 实现 `Form.Path`：统一 valuePath/patternPath/listPath/errorsPath/uiPath 映射（数组插入 `rows`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/path.ts`
- [X] T043 实现类型化路径：`Form.FieldPath<TValues>` / `Form.FieldValue<TValues, P>`（含数组 `${number}` 段）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/types.ts`
- [X] T044 实现 `useFieldArray` + 稳定 `fields[i].id`（对齐 runtime rowIdStore 与 `$rowId`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/react/useFieldArray.ts`
- [X] T045 实现 controller 默认动作：`validate/validatePaths/reset/handleSubmit/setError/clearErrors`（含 `submitCount` 与 persistent dirty）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T046 实现错误来源分层与优先级：`errors.$manual` + `errors.$schema`，读取优先级 `manual > rules > schema`，并实现默认清理语义 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T047 Schema submit/root 校验链路：schema decode → 写回 `$schema` → 合并策略（Rules 覆盖 Schema）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/schema-error-mapping.ts`
- [X] T048 同路径 value 变更自动清理 Schema 错误（不重跑 Schema，FR-012c）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/logics/install.ts`
- [X] T049 更新 SchemaPath/SchemaErrorMapping 测试到新错误树与 `$schema` 分层 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/SchemaErrorMapping.test.ts`
- [X] T050 更新 breaking changes 文档（errors 树迁移、开关移除、示例迁移）`/Users/yoyo/Documents/code/personal/intent-flow/docs/reviews/99-roadmap-and-breaking-changes.md`
- [X] T051 更新 runtime SSoT（Form 推荐写法/错误树/Path 口径）`/Users/yoyo/Documents/code/personal/intent-flow/docs/ssot/runtime/logix-form/README.md`
- [X] T052 实现规则挂载语法糖：新增 `Form.Rule.field/fields`（`fields` 支持 decl/decl[] 扁平化输入；重复 valuePath 稳定失败；不改变 IR/执行语义）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/rule.ts`
- [X] T053 [P] 新增单测：`Form.Rule.field/fields` 合成 rules 时重复 valuePath 必须失败 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Rule.FieldMount.test.ts`
- [X] T054 逐条验证并同步 quickstart 与示例代码（避免文档-实现漂移）`/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/quickstart.md`
- [X] T055 [P] 新增回归测试：`validateOn/reValidateOn + submitCount` 的 effective 策略（首提前 vs 首提后），以及 rule 级 `validateOn` 覆盖/禁用（含 `[]`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.ValidateOnStrategy.test.ts`
- [X] T056 在 Form API 引入 `validateOn/reValidateOn` 并移除 `mode`（默认值对齐 spec；计算 `effectiveValidateOn`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T057 扩展 Rules/RuleGroup 声明：支持 rule 级 `validateOn`（仅 `onChange|onBlur`）并在 build 阶段归一化（未声明=继承；显式 `[]`=禁用自动校验）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/rule.ts`
- [X] T058 在 install/wiring 侧实现自动校验触发：按 `validateOn ∪ reValidateOn ∪ all(rule.validateOn)` 决定 change/blur 是否触发 scoped validate；执行时按 rule 级白名单裁剪 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/logics/install.ts`
- [X] T059 [P] 补齐回归断言：空值不参与跨行冲突（必填由独立规则表达）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.ListScopeUniqueWarehouse.test.ts`
- [X] T060 [P] 新增回归测试：默认 `validateOn=["onSubmit"]` + `reValidateOn=["onChange"]` 在 list-scope 场景下的 submitCount gate（首提前不自动校验，首提后自动校验）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.ListScope.ReValidateGate.test.ts`
- [X] T061 [P] 更新 demo layout：用 `useFormState(form, selector)` 获取表单级衍生状态，避免 UI 扫描 values/errors 大树 `/Users/yoyo/Documents/code/personal/intent-flow/examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- [X] T062 实现只读 `FormView`（canSubmit/isSubmitting/isValid/isDirty/isPristine/submitCount）并保证引用稳定（结构共享/缓存；不扫 values/errors 大树）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form-view.ts`
- [X] T063 实现 `useFormState(form, selector)`：selector 入参为引用稳定的 `FormView`，仅在选中值变化时触发渲染 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/react/useFormState.ts`
- [X] T064 导出 `useFormState`（`@logixjs/form/react`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/react/index.ts`
- [X] T065 实现 `Form.Trait.*`（computed/link/source/check 同形 `StateTrait.*`）作为 `derived` 的唯一入口（可完全降解到 StateTraitSpec/IR）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/trait.ts`
- [X] T066 在 `Form.make` 支持 `derived` 槽位：默认仅允许写回 `values/ui`（禁止写 `errors`），并把 `Form.Trait.*` 产物收敛为 module traits `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/form.ts`
- [X] T067 [P] 新增回归测试：`derived` 只能写回 `values/ui`，且可通过 `$.use(Form.module)` 的 handle 调用 `controller.*` 默认动作（React/Logic 一致）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Derived.Guardrails.test.ts`
- [X] T068 实现内置校验器库（required/minLength/maxLength/min/max/pattern）与 ErrorValue ≤256B 体积约束（纯函数、Slim、可序列化）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/validators.ts`
- [X] T069 在 Rules “直写形态”支持 RHF 风格简写展开（build 阶段展开为等价内置纯函数；不改变 deps/执行范围推导与 scope 写回）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/rule.ts`
- [X] T070 [P] 新增单测：内置校验器与简写展开（含 ErrorValue 体积上界断言）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Rule.Builtins.test.ts`
- [X] T071 [P] 新增单测：`Form.Rule.merge` 对重复 ruleName 稳定失败，且执行顺序可确定（用于诊断展示）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Rule.Merge.test.ts`
- [X] T072 将“动态列表/跨行校验”纳入 perf matrix（SSoT）：新增 suite（含 `requestedMode=full|auto` 对比预算与必要 evidence 字段）`/Users/yoyo/Documents/code/personal/intent-flow/.codex/skills/logix-perf-evidence/assets/matrix.json`
- [X] T073 实现 014 browser perf suite：动态列表（100 行）+ list-scope 跨行校验，输出 full vs auto 对比与 `trait:converge` 解释链路 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- [X] T074 固化 NFR-005 证据：更新 014 的 `interpretation.latest.md`（指出预算门槛、回退原因覆盖与证据文件路径）`/Users/yoyo/Documents/code/personal/intent-flow/specs/014-browser-perf-boundaries/perf/interpretation.latest.md`
- [X] T075 记录并对齐“off/light/sampled/full”开销口径：补齐 010 的 perf-baseline（引用 014 evidence；说明 overhead 与 gate 环境）`/Users/yoyo/Documents/code/personal/intent-flow/specs/010-form-api-perf-boundaries/references/perf-baseline.md`
- [X] T076 [P] 更新用户文档：`@logixjs/form` 新 API（`validateOn/reValidateOn`、`$list/rows[]`、controller 默认动作、selector 订阅）`/Users/yoyo/Documents/code/personal/intent-flow/apps/docs/content/docs/guide/learn/deep-dive.md`
- [X] T077 [P] 更新用户文档：把 010 的性能心智模型与“优化梯子”对齐到 `apps/docs`（避免术语/证据字段漂移）`/Users/yoyo/Documents/code/personal/intent-flow/apps/docs/content/docs/guide/advanced/performance-and-optimization.md`

---

## Phase N: Cross-cutting - Trait deps-as-args & module-local source snapshots

**Purpose**: 把 deps 从“约定”升级为“API 形态约束”；010 先只固化“模块内 source 写回快照 → local deps 消费”的闭环，跨模块投影示例与跨模块缓存/in-flight 去重后置到 source/query 跑道。

- [X] T078 升级 `StateTrait.computed` 为 deps-as-args：业务侧 `get(...depsValues)` 不再暴露 `(state)=>`（Tuple 推导友好，顺序稳定）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/StateTrait.ts`
- [X] T079 同步内核模型与注释：`ComputedMeta`/build 侧保证 “deps 即读集”（允许 DSL 闭包降解为 `derive(state)`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/model.ts`
- [X] T080 [P] 新增回归测试：`StateTrait.computed` deps-as-args 的类型推导与注入顺序（含 list.item scope）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.Computed.DepsAsArgs.test.ts`
- [X] T081 升级 `Form.Trait.computed` 为 deps-as-args（与 `StateTrait.computed` 同形），并更新 derived 编译降解路径 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/src/trait.ts`
- [X] T082 [P] 新增回归测试：`Form.Trait.computed` 注入顺序稳定、禁止隐式 state 访问（通过 API 形态约束）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-form/test/Form.Trait.Computed.DepsAsArgs.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phase 3–5) → Cross-cutting (Phase N)
- Phase 2 是硬阻塞：US1/US2/US3 均依赖其完成

### User Story Dependencies

- US1 (P1/MVP)：仅依赖 Phase 2（不依赖 US2/US3）
- US2 (P2)：依赖 Phase 2；建议在 US1 之后做以便最小化回归面
- US3 (P3)：依赖 Phase 2；可与 US2 并行推进，但复用 US1 的 `$list/rows[]` 写回

### Parallel Opportunities (examples)

- Setup：T001–T003 可并行
- Foundation：T005/T008/T014/T016/T018 可并行；其余按依赖串行
- US1：T019 与 T020 可并行；实现按 T021→T029 串行
- US2：T031 与 T032 可并行；T035→T036 串行
- US3：T037 与 T038 可并行；实现按 T039→T041 串行

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1（Setup）
2. 完成 Phase 2（Foundational）
3. 完成 Phase 3（US1）
4. **停止并验证**：按 US1 Independent Test + `SC-002`（off）验收

### Incremental Delivery

1. Setup + Foundational
2. US1（MVP）
3. US2（删除专家开关、默认正确）
4. US3（可解释事件 + 稳定归属）
5. Polish（B/C/D 与文档迁移）
