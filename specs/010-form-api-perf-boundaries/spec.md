# Feature Specification: Form API（设计收敛与性能边界）

**Feature Branch**: `[010-form-api-perf-boundaries]`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "消化相关文档 docs/specs/drafts/topics/trait-system/22-dynamic-list-cascading-exclusion.md 提炼个新需求"

## Clarifications

### Session 2025-12-15

- Q: 重复错误标记范围 → A: 所有参与冲突的行都标记错误
- Q: 空值是否参与唯一性判断 → A: 空值不参与跨行冲突检测
- Q: 行级错误归属锚点 → A: 行级错误以 rowId 归属（增删/重排不漂移）
- Q: 触发原因（Trigger）粒度 → A: 事件类型 + 触发字段 path + 变更类型（set/unset/insert/remove）

### Session 2025-12-16

- Q: 数组错误树唯一口径 → A: `$list/rows[]`（`errors.<list>.$list` + `errors.<list>.rows[i].$rowId` + `errors.<list>.rows[i].<field>`）
- Q: list-scope deps 默认语义 → A: `deps:["x"]` 默认表示 `userList[].x`（相对“行元素”），并自动补齐结构依赖（insert/remove/reorder 也触发）
- Q: Trigger 归因（事务内多次写入） → A: Trigger 只认“事务起点的外部事件”（kind+path+op）；txn 内派生写入不改变 trigger
- Q: rowId 生成与降级策略 → A: 优先 `trackBy`；缺失时用 runtime `rowIdStore` 保持 append/insert/remove/reorder 稳定；若整体替换 list 且无 `trackBy` 允许重建并输出 degraded 诊断，但必须清理 errors/ui 不残留
- Q: Spec 命名是否升级为 Form API + 性能边界 → A: 目录/Branch/标题统一改为 `010-form-api-perf-boundaries`（原 `010-list-scope-check`）
- Q: 本 spec 的规划范围（Phase A–D） → A: 覆盖 Phase A–D（是否一口气做完由后续实现节奏决定）
- Q: Schema/Resolver 默认运行阶段 → A: 默认只在 submit/root validate 运行（onChange/onBlur 仅运行 Rules；如需开启必须提供性能证据且可诊断）
- Q: Schema + Rules 同一路径冲突合并策略 → A: 同一路径 Rules 覆盖 Schema（合并后仍写回同一错误树且确定性）
- Q: valuePath → errorsPath（数组）映射 → A: `userList.0.x` 固定映射为 `errors.userList.rows.0.x`（listPath 后插入 `rows`；行级归属以 `rows[i].$rowId` 为锚点）
- Q: reset(values?) 默认语义 → A: 重置 values 并清空 errors/ui（touched/dirty 归零），且不自动触发 validate（由 validate/handleSubmit 显式触发）

### Session 2025-12-17

- Q: `controller.validate/validatePaths` 是否运行 Schema/Resolver → A: `validate()`（root）运行 Rules + Schema；`validatePaths(paths)` 只运行 Rules
- Q: `controller.setError/clearErrors` 的写回与清理语义 → A: 写入 `errors.$manual`（优先级 `manual > rules > schema`）；同路径 value 变更自动清理对应 manual；`reset()` 清空全部 manual；validate/submit 不清理 manual（只更新 rules/schema）
- Q: manual errors 是否影响 `isValid/canSubmit` → A: 是（manual 参与有效性计算并阻止 submit，直到 clear/同路径变更自动清理/reset）

### Session 2025-12-18

- Q: 联动/派生是否必须通过 Form 领域包装声明（而非业务直接写 StateTrait） → A: 是（业务侧只写 `@logix/form`；Form 领域包装可完全降解到 StateTraitSpec/IR）
- Q: `Form.Trait` 与 `StateTrait` 的 API 形状是否保持一致 → A: 一致（Form 侧薄包装对齐形状；允许在 form 层附加能力但不引入第二套 IR）
- Q: 组件外/Logic 内如何触发 Form 校验（对标 RHF `trigger`） → A: 默认动作语义必须在 `$.use(Form.module)` 返回的 handle 上暴露为 `controller.validate/validatePaths`（React/Logic 一致的唯一入口）；内部可降解为 Module actions（如 `actions.validate/validatePaths`），actions 视为实现细节
- Q: 校验触发策略是否对齐 RHF（`validateOn/reValidateOn`） → A: 对齐；`validateOn` 默认 `["onSubmit"]`（首提前不自动校验），`reValidateOn` 默认 `["onChange"]`（首提后按 change 触发 scoped validate；可选 onBlur）

### Session 2025-12-20

- Q: ErrorValue 体积上界 → A: JSON 序列化后 ≤256B
- Q: `trait:check` 诊断事件产出档位 → A: `Diagnostics Level=off` 不产出；`light|full` 产出
- Q: `trait:check.data.rowIdMode` 是否区分 runtime `rowIdStore` → A: 是（`rowIdMode=trackBy|store|index`；`store` 表示 runtime `rowIdStore`）
- Q: rowIdStore 的 `$rowId` 是否要求去随机化 → A: 是（禁止 `Date.now/Math.random`；使用 per-instance 单调序号；口径对齐 `instanceId/txnSeq/opSeq/eventSeq` 的稳定标识生成）
- Q: 是否提供 `Form.Rule.field/fields` 作为规则挂载语法糖 → A: 是（规则包保持“无挂载点”以便复用；通过 `field(valuePath, ruleGroup)` 绑定展示锚点，再用 `fields(...decls | decl[])` 扁平化合成 `rules`；重复 valuePath 稳定失败；不在 ruleGroup 内重复声明 path/fieldName 以避免双真相源）
- Q: Trait 的 `computed.get` 是否升级为 deps-as-args（不再暴露 `(state)=>`） → A: 是（业务侧 `get(...depsValues)` 仅接收按 deps 注入的参数，禁止读取未声明依赖；Form.Trait 与 StateTrait 形状一致；内部允许降解为 `derive(state)` 但 derive 的读集必须等于 deps，避免隐式依赖与不可诊断漂移）
- Q: Form 消费 Query/外部快照的合规路径 → A: 010 先只固化“模块内快照 + local deps”（推荐：`source`/Query traits 将 ResourceSnapshot 写回到本模块 `ui.*`/显式槽位）；跨模块显式投影与跨模块缓存/in-flight 去重后置到 `StateTrait.source`/`@logix/query` 跑道；禁止在 trait/rule 内直接访问全局 store/隐式 Context
- Q: 同路径 value 变更时是否自动清理 Schema 错误 → A: 是（自动清理对应 Schema 错误，不重跑 Schema）
- Q: SC-002 的验收诊断档位 → A: 仅在 `Diagnostics Level=off` 下验收；`light|full` 只验收可量化/可解释的 overhead（对齐 NFR-002/NFR-005）

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 跨行约束实时一致反馈 (Priority: P1)

作为表单业务开发者，我希望能把“跨行互斥/唯一性/聚合类”约束声明为**列表级规则**，让系统在用户修改任意一行后都能立即得到一致结果（所有受影响行的错误同时更新/清理），避免出现“只改了一行但另一行仍显示旧错误/要到提交才刷新”的体验问题。

**Why this priority**: 动态列表是 ToB 场景的高频压力点；跨行规则若不能即时一致，会直接导致用户误操作与大量返工，同时也会让团队写法分裂（有人扫全表、有人加隐藏开关），阻断平台化。

**Independent Test**: 用一个包含动态列表字段（例如 `userList`）的表单，声明一条“某字段全表唯一”的列表级规则；通过添加两行、制造重复、再解除重复，验证错误能在所有受影响行上即时出现与清除。

**Acceptance Scenarios**:

1. **Given** 列表中至少两行，且两行某字段被设置为相同值，**When** 用户完成本次输入（实时校验模式），**Then** 系统在无需提交的情况下立即在所有受影响行上给出一致的重复错误提示。
2. **Given** 已存在重复错误，**When** 用户将其中任意一行改为不重复的值，**Then** 系统立即清除所有相关行上的重复错误，且不残留旧错误。
3. **Given** 列表规模为 100 行且存在列表级规则，**When** 用户修改任意一行的相关字段，**Then** 系统在 `Diagnostics Level=off` 下，95% 的交互应在 50ms 内产出一致的错误结果。
4. **Given** 列表中存在未填写值（空值），**When** 用户只填写其中一行或多行但仍有空值存在，**Then** 系统不会因为空值而产生跨行冲突错误（必填由独立规则表达）。

---

### User Story 2 - 默认正确，无需“专家开关/手写扫描” (Priority: P2)

作为团队协作者/维护者，我希望动态列表的跨行校验在默认情况下就“正确且一致”，业务侧不需要知道任何隐藏的配置开关，也不需要在 UI 层手写“全表扫描/多次写入”来弥补触发语义。

**Why this priority**: 隐性知识会导致团队协作失控与平台不可治理；同一需求出现多种写法，会让 AI/生成器/回放/排障链路失真。

**Independent Test**: 删除（或不配置）任何“显式提升为列表级校验”的开关；仅通过声明列表级规则，验证跨行错误仍可在 onChange 下正确刷新。

**Acceptance Scenarios**:

1. **Given** 业务侧只声明列表级规则且未开启任何额外配置，**When** 用户修改任意一行的相关字段，**Then** 系统仍能自动触发列表级校验并得到与提交校验一致的结果。

---

### User Story 3 - 错误归属稳定且可解释 (Priority: P3)

作为业务开发者与平台/Devtools 使用者，我希望系统输出的错误结果能稳定归属到“列表本身”与“具体行”，并在增删/重排后仍保持可预测；同时当出现错误时，能解释“为什么该行报错、由什么变化触发”。

**Why this priority**: 动态列表会频繁增删与重排；如果错误漂移/残留，用户将无法信任系统。可解释性是平台化、回放与性能分析的前提。

**Independent Test**: 在存在行级错误的情况下执行“删行/插入/重排”，验证错误仍归属到预期行；同时验证能输出可序列化的“触发原因与规则标识”，用于排障与回放。

**Acceptance Scenarios**:

1. **Given** 列表中存在行级错误，**When** 用户删除或重排列表项，**Then** 系统不会出现“错误跟错行/错误残留在不存在的行”。
2. **Given** 一次跨行校验产生或清理了错误，**When** 开发者查看诊断信息，**Then** 能看到稳定的规则标识与触发原因（例如由哪个字段变化触发），且信息可被序列化与回放。

---

### Edge Cases

- 大规模列表（例如 100+ 行）下，单次输入是否会导致明显卡顿或长时间无响应？
- 同一事务/一次输入中对同一路径发生多次写入时，最终错误结果应以什么为准？
- 行的稳定 identity 缺失或不稳定时，系统如何保证“错误归属不漂移”？
- 列表项被删除后，对应错误与 UI 状态如何被清理（避免残留）？
- 部分字段为空/未选择时，空值不参与跨行冲突检测；若需强制填写，应通过独立“必填/存在性”规则表达。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统必须支持“列表级校验规则”：规则一次评估整张列表，并能同时产出列表级与多行级的错误结果。
- **FR-002**: 当当前 effectiveValidateOn（由 `validateOn/reValidateOn + submitCount` 决定）包含 `onChange|onBlur` 时，系统必须在用户输入导致相关字段变化时自动触发列表级校验，确保“实时校验”与“提交校验”的结论一致，且不要求业务额外配置“触发提升开关”。
- **FR-002a**: list-scope 规则的 `deps:["field"]` 必须被归一化为 `userList[].field` 语义，并自动补齐结构依赖，确保 insert/remove/reorder 也会触发对应列表级校验刷新。
- **FR-003**: 系统必须提供稳定的错误归属模型，能区分“列表级错误”和“行级错误”，并在增删/重排后仍保证错误不会漂移到错误的行或残留在已删除行。
- **FR-003a**: 当列表级规则检测到“跨行冲突”（例如唯一性重复）时，系统必须在所有参与冲突的行上标记错误（而非仅标记触发行或后出现行）。
- **FR-003b**: 当列表级规则执行跨行冲突检测时，未填写值（空值）不参与冲突判断；若需要“必须填写”的语义，应由独立规则表达。
- **FR-003c**: 行级错误结果必须以稳定的 `rowId` 作为归属锚点；当业务未提供稳定 identity 时，允许降级为按 `index` 归属，但必须在诊断摘要中明确降级原因。
- **FR-003d**: 数组字段的错误树必须以 `$list/rows[]` 作为唯一事实源（禁止 index 同构口径与双写兼容层）。
- **FR-003e**: 缺失 `trackBy` 时，runtime 必须通过内部 `rowIdStore` 保持常见数组操作（append/insert/remove/move/swap）下的 rowId 稳定；若发生“整体替换列表根”且无 `trackBy`，允许 rowId 重建但必须输出 degraded 诊断，并确保 errors/ui 仍可被一致清理且不残留。
- **FR-004**: 系统必须支持以“单次扫描”的方式完成跨行规则计算，避免业务侧出现按行重复扫描导致的平方级开销。
- **FR-005**: 当 `Diagnostics Level=light|full` 时，系统必须为每次列表级校验提供可序列化的诊断摘要（`trait:check`），至少包含：稳定的规则标识、校验阶段（mode：submit/blur/valueChange/manual）、触发原因（事件类型 + 字段 path + 变更类型）、rowId 归属策略（`rowIdMode=trackBy|store|index`，若涉及动态列表）、受影响行范围（或数量）、以及错误变化摘要；`Diagnostics Level=off` 允许不产出 `trait:check`。
  - 术语澄清：此处 `mode` 表示“校验阶段/触发类型”（`submit|blur|valueChange|manual`），不是历史 `Form.make.mode`（已收敛到 `validateOn/reValidateOn`）。
- **FR-005a**: 当同一事务内对相关路径发生多次写入时，诊断中的 Trigger 必须稳定归因到“事务起点的外部事件”；事务内派生写入（computed/link/writeback）不得覆盖 Trigger。
- **FR-006**: 系统必须保证列表级校验是纯同步且无外部 IO 的；任何异步数据加载不属于校验本身，且不得在同一事务窗口内混入 IO。
- **FR-007**: 系统必须提供 Form 领域的规则组织 API（Rules），使业务能够用“命名规则 + 显式 deps”表达 item-scope/list-scope check，并可**完全降解**为统一的最小 IR（deps 作为唯一依赖事实源），避免业务直接操作底层 StateTrait 细节造成写法分裂。
- **FR-007a**: Rules 必须支持组合（合并）且对重复 ruleName 稳定失败；ruleName 必须可用于诊断展示与确定性执行顺序。
- **FR-007b**: Form 必须提供两阶段的自动校验触发策略：`validateOn`（默认 `["onSubmit"]`）与 `reValidateOn`（默认 `["onChange"]`），对标 RHF 的 `mode/reValidateMode`：
  - `validateOn`：首提前（`submitCount===0`）的自动校验触发点；
  - `reValidateOn`：首提后（`submitCount>0`）的自动校验触发点（用于更积极地帮助用户修正）。
  - 触发点枚举：`onSubmit|onChange|onBlur`（`onSubmit` 表示“只在提交/root validate 时校验”，即不在 change/blur 自动触发 scoped validate）。
  - submit/root validate 仍必须执行全量校验（不受 `validateOn/reValidateOn` 影响）。
  - wiring 必须按 `validateOn ∪ reValidateOn ∪ all(rule.validateOn)` 决定是否在 change/blur 触发 scoped validate（避免空跑，也避免为了少数规则扩大全局默认）。
- **FR-007c**: Rules 必须支持 rule 级 `validateOn`（仅含 `onChange|onBlur`）作为“自动校验阶段白名单”，且其优先级高于 Form 默认策略：
  - 未声明：继承当前阶段的 effective 值（`submitCount===0 ? Form.validateOn : Form.reValidateOn`）；
  - 显式声明：覆盖默认（例如 `[]` 表示不参与 onChange/onBlur，仅在 submit/root 或手动 validate 时运行）。
  - `validateOn/reValidateOn` 与 `deps` 正交：`deps` 决定依赖图/最小执行集，`validateOn` 决定当前自动阶段是否执行该 rule。
- **FR-007d**: Rule 的返回值必须与其 scope 对齐（row-scope 返回行内 patch；list-scope 返回 `$list/rows[]` 结构化 patch），不得在 rule 中返回任意 valuePath→error 的 path-map；如需命令式按 valuePath 写入错误，必须通过 controller API（例如 `setError/clearErrors`）完成。
- **FR-007e**: 系统必须提供低成本的表单级衍生状态订阅能力（例如 `useFormState(form, selector)` 或等价形态），以便 UI 以 selector 订阅 `canSubmit/isSubmitting/isValid/isDirty/isPristine/submitCount` 等最小视图；selector 的入参必须是引用稳定的只读 `FormView`（可缓存/结构共享），禁止业务在 UI 层扫描 values/errors 大树计算这些衍生状态（避免渲染 churn 与不可诊断的性能退化）。
- **FR-007f**: 系统必须提供 Form 领域的 Trait 包装（`Form.Trait.*`），且其 API 形状必须与 `@logix/core` 的 `StateTrait.*` 保持一致（computed/link/source/check 等同形状）；业务侧的联动/派生必须通过 Form 领域入口声明（例如 `derived` 槽位），并可完全降解为 StateTraitSpec/IR；Form 领域包装允许附加能力，但不得引入第二套 IR 或绕开 deps/事务/诊断约束。
- **FR-007g**: 系统必须提供一组对标 RHF `rules` 的内置校验器（例如 required/minLength/maxLength/min/max/pattern），以减少业务样板并统一错误语义；它们必须是纯函数、无 IO，且返回 `ErrorValue | undefined`（可序列化、Slim、有体积上界：JSON 序列化后 ≤256B），并可直接用于规则函数/自定义 `validate` 中（或被简写展开）。
- **FR-007h**: Rules 声明必须支持“直写形态”：在 `Form.traits(valuesSchema)({ ... })` 的 `check`（含 list 的 `item.check/list.check`）中可直接用对象声明规则，而不要求先 `Form.Rule.make(...)`；并支持 RHF 风格的内置规则简写（例如 `required:true` / `required:{ message?, trim? }` / `minLength: 2` / `pattern: /.../` 等作为顶层字段），在 build 阶段统一展开/归一化为等价的内置纯函数（不改变 deps/执行范围推导与 scope 写回约束）。当需要条件逻辑/跨字段分支时仍使用函数式 `validate` 表达。
  - 可选提供“规则挂载语法糖”：`Form.Rule.field(valuePath, ruleGroup)` / `Form.Rule.fields(...decls | decl[])`，用于更可组合地构造 `rules`（避免对象 spread 的静默覆盖；重复 valuePath 稳定失败；支持扁平化输入以便组合“已有规则集 + 新规则”而不手写 spread）。该语法糖仅改变输入形态，不改变 deps/执行范围推导/写回点；ruleGroup 内不得再重复声明 path/fieldName（避免双真相源）。
- **FR-007i**: Trait 的 `computed.get` 必须采用 deps-as-args 形态：`deps` 的每一项按顺序注入为 `get` 的入参；业务侧不得接收 `state` 入参（避免隐式依赖），从而保证“deps 即读集”的可证明性；Form.Trait 与 StateTrait 的 `computed` 形状必须一致，并可完全降解为统一 IR（不引入第二套依赖表达）。
- **FR-008**: 所有出现在“触发原因/诊断事件/IR”中的 `path` 必须与 Spec 009 的 canonical FieldPath 对齐（段数组、无索引/无 `[]`；以 `specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json` 为准）；行级范围信息必须通过 `rowId`（及可选的 index 兜底）表达，而不是把 index 编进 `path`。
- **FR-009**: 当模块启用 `traitConvergeMode=auto`（Spec 013，默认值）时，本特性涉及的“校验调度/范围收敛”必须复用 013 的控制面契约：`requestedMode=full|dirty|auto`，但执行层只允许 `executedMode=full|dirty`（`auto` 仅作为请求模式出现）。在本特性代表性场景下，`requestedMode=auto` 必须满足“full 下界”（默认噪声预算 5%）：当证据不足或 `traitConvergeDecisionBudgetMs` 止损触发时，必须以 `executedMode=full` 回退，并在 `Diagnostics Level=light|full` 时于 `trait:converge` evidence 中给出可序列化原因（例如 `budget_cutoff/unknown_write/dirty_all/cold_start`；`Diagnostics Level=off` 允许不产出 converge evidence，口径以 Spec 013 为准）。
- **FR-010**: 系统必须收敛 Form 的 Path 工具（ValuePath/ErrorsPath/FieldPath），避免散落的 path/索引/列表映射逻辑，并确保数组索引心智（如 `userList.0.x`）可稳定映射到 `$list/rows[]`（以 `rowId` 归属为锚点）。
- **FR-010a**: 对数组字段 `listPath`，errorsPath 必须采用“插入 rows 段”的规范映射：`valuePath="<listPath>.<i>.<rest>"` → `errorsPath="errors.<listPath>.rows.<i>.<rest>"`；列表级错误为 `errors.<listPath>.$list`，行级锚点为 `errors.<listPath>.rows.<i>.$rowId`。
- **FR-010b**: 系统必须提供 TypeScript 层的路径类型化与值类型推导（例如 `Form.FieldPath<TValues>` / `Form.FieldValue<TValues, P>`），并让 `useField/useFieldArray` 的 `valuePath` 在编译期可约束；默认不再出现 `unknown` 的 value/error 类型。
- **FR-010c**: 系统必须提供统一的 valuePath 解析与归一化能力，用于 scoped validate/trigger/source wiring 的一致语义：
  - 将 `userList.3.warehouseId` 这类 valuePath 解析为 scoped validate 的 target（field/list/item）；
  - 将带 index 的 valuePath 归一化为 `userList[].warehouseId` 形式用于 deps 命中（source/联动/校验触发复用同一口径）；
  - 至少支持单层数组（本 spec 的动态列表）；多层嵌套数组需保留可扩展的表达（例如 listIndexPath），避免未来破坏性演进；
  - React hooks、Logic 与 controller 的默认 wiring 必须复用该统一实现，禁止各自实现 index 解析/归一化规则，避免语义漂移与不可诊断差异。
- **FR-011**: 系统必须补齐 Form Controller 的默认动作语义（`validate/reset/handleSubmit`），且这些动作的 state/errors/ui 写回必须可回放、可诊断并遵守“事务窗口禁 IO”。
- **FR-011a**: `reset(values?)` 必须将 values 重置为“提供值或 initialValues”，并清空 `errors/ui`（含 touched/dirty）；reset 本身不得隐式触发 validate（避免热路径负优化与不可预期写回）。
- **FR-011b**: `validate/validatePaths` 必须支持 root 与 scoped 两类用法：`validate()`（root）默认运行 Rules + Schema；`validatePaths(paths)`（field/list/item）默认只运行 Rules（不运行 Schema/Resolver），避免字段级/列表级手动校验触发全量 Schema parse 的负优化。
- **FR-011c**: `setError/clearErrors` 必须通过 `errors.$manual` 提供“命令式错误覆盖层”：读取优先级 `manual > rules > schema`；同一路径发生 value 变更时自动清理对应 manual 错误；`reset()` 清空全部 manual；validate/submit 不清理 manual（只更新 rules/schema）。
- **FR-011d**: `errors.$manual` 必须参与表单有效性计算：`isValid/canSubmit` 必须把 manual errors 视为 invalid，并在 `handleSubmit` 中阻止 onValid 分支，直到 manual 被 `clearErrors`/同路径 value 变更自动清理/`reset()` 清空。
- **FR-011e**: `dirty` 默认采用 *persistent dirty*：一旦某个 valuePath 被写入即视为 dirty，并保持为 dirty，直到 `reset()`；系统不得为了“值改回默认就不 dirty”的语义在热路径做全量 deep-compare。若业务需要 non-persistent dirty，应通过 `derived`/selector 显式计算（可对比 initialValues/默认值）实现。
- **FR-011f**: `canSubmit` 默认只依赖提交态与有效性：当 `!isSubmitting && isValid` 时为 true，不强制耦合 `isDirty`；是否禁用 pristine submit 由 UI 决定（可用 `isPristine`/`submitCount` 组合实现）。
- **FR-011g**: 系统必须维护 `submitCount`（提交尝试次数）并暴露给 selector/逻辑层，用于实现“首提前/首提后”的渐进式体验策略（例如首次提交后再更积极地展示错误）；该策略应基于 `submitCount + touched` 驱动 UI 呈现，不引入第二套 `errorMap` 真相源。
- **FR-011h**: `validate/reset/setError/clearErrors` 的默认动作语义必须以 `controller.*` 作为唯一对外入口（React/Logic 一致），并且在 `$.use(Form.module)` 返回的 handle 上同样可用；内部可降解为 actions，但业务侧不得依赖 `actions.*`（避免写法分裂与 API 漂移）。
- **FR-012**: 系统必须提供 Schema/Resolver 与 Rules 的提交校验收敛：默认 submit/root validate 可同时运行 Schema + Rules，并写回同一错误树（含 `$list/rows[]`）；不得引入第二套错误真相源。
- **FR-012a**: 默认 onChange/onBlur 不运行 Schema/Resolver（避免热路径负优化）；仅运行 Rules（含 list-scope/item-scope）。如业务显式开启 Schema onChange/onBlur，必须提供性能证据并可通过诊断事件解释其开销与命中范围。
- **FR-012b**: 当 Schema 与 Rules 在同一路径产出错误时，最终写回以 Rules 为准（Schema 仅作为补充错误来源，不得覆盖 Rules 的业务语义错误）。
- **FR-012c**: 当 Schema/Resolver 默认不在 onChange/onBlur 运行时，为避免陈旧 Schema 错误残留阻塞 `isValid/canSubmit`：同一路径发生 value 变更时，系统必须自动清理该路径下由 Schema 产生的错误（不重新运行 Schema）；Schema 的最终正确性仍由 submit/root validate 保证（FR-012）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统必须为“动态列表 + 跨行校验”的热路径定义性能预算，并在实现前记录可复现基线；性能目标与验收阈值以 **SC-002** 为准（避免多处重复口径漂移）。
- **NFR-002**: 诊断信息在关闭时必须接近零开销；在开启时必须可裁剪且可序列化（避免引入不可回收的大对象引用）。
- **NFR-003**: 诊断与回放中使用的标识必须确定性生成（不以随机数/时间戳作为默认唯一来源）。
- **NFR-004**: 系统必须强制同步事务边界：事务窗口内不允许 IO/异步工作，也不允许绕过事务的写入逃逸通道。
- **NFR-005**: 本特性必须作为 Spec 013（并复用 014 跑道）的性能矩阵中的“动态列表/跨行校验”代表性场景之一；在相同脚本与统计口径下，必须提供 `requestedMode=full` vs `requestedMode=auto`（可选补充 `dirty`）的对比证据，并能在 `Diagnostics Level=light|full` 下通过 013 的 `trait:converge` evidence 解释 auto 的决策路径（至少包含 `requestedMode/executedMode/reasons`，并覆盖 `cache_hit/cache_miss` 与 `budget_cutoff` 的回退解释）。

### Assumptions & Dependencies

- **A-001（前提）**：动态列表项具有稳定 identity（例如业务 id / 行标识）；当缺失时，系统允许降级为“按索引归属”，但必须可解释且不造成错误残留。
- **A-002（依赖）**：表单存在“实时校验/提交校验”等模式；本特性要求跨行规则在实时模式下也能得到一致结论。
- **A-003（依赖）**：事务 IR + Patch/Dirty-set（Spec 009）已落地；本特性的诊断事件与 path 口径必须复用 009 的协议（以 009 的 FieldPath 段数组与 DynamicTrace 事件信封为准，不再发明另一套 string path / 双锚点字段）。
- **A-004（依赖）**：auto converge planner（Spec 013）会先行实施并在 `Diagnostics Level=light|full` 下提供事务级最小可序列化摘要（`requestedMode/executedMode/reasons/decisionBudgetMs`、cache 证据与回退原因等）与 `trait:converge` 事件；本特性需复用 013 的证据口径解释“为何命中这次列表级校验与其范围”，不得自定义第二套 auto 证据字段。
- **A-005（依赖）**：010 的代表性性能矩阵点复用 Spec 014 的跑道与统计口径；010 只补充必要的“动态列表/跨行校验”场景输入与断言，不新增第二套跑道。
- **A-006（依赖）**：运行时 trait 基础设施会提供统一的 valuePath 解析/归一化能力（见 FR-010c），供 form/react/logic 共用；010 的实现必须以“补齐基础设施”为优先，而不是在 `@logix/form` 侧加专家开关或复制逻辑。

### Scope

**In scope**:

- 列表级规则的声明、触发与结果写回（含列表级与行级错误）。
- Form API（`@logix/form`）作为默认入口的规则组织与错误/路径映射收口（Rules/Errors/Path）。
- Form 领域层的联动/派生声明（`derived` + `Form.Trait.*`），并可完全降解为 trait 的 `computed/link/source`（业务侧不直接写 StateTrait）；默认写回点只允许 `values/ui`，不允许写 `errors`（错误仍由 `rules/schema/$manual` 管）。
- Form 消费外部数据快照（如 Query 的 ResourceSnapshot）：010 只保证“本模块 source 写回快照 → local deps 消费”的闭环（例如写回 `ui.$query.*`）；禁止在 rule/trait 内直接访问全局 store/隐式 Context。
- `Form.traits(valuesSchema)`：允许在数组字段路径上声明 list 结构（`{ identityHint, item, list }`）作为“动态列表语义”入口（rowId/结构触发/校验 scope）；不再需要额外的 `fieldArrays/Form.fieldArray` 表面。
- Form Path 工具收敛与类型化（ValuePath/ErrorsPath/FieldPath），以及 React hooks/controller 的默认消费口径。
- Schema/Resolver 与 Rules 的提交校验链路收敛（不引入第二套错误真相源）。
- 跨行规则的典型场景：互斥/唯一性/聚合类校验。
- 增删/重排场景下的错误归属稳定与清理。
- 可序列化的校验诊断摘要。

**Out of scope**:

- 异步数据加载与 options 获取（它们不属于“校验规则”的职责）。
- UI 交互细节（例如具体组件如何禁用选项），但错误结果必须足以支撑 UI 做确定性渲染。
- Focus management（自动聚焦/滚动到首个错误字段）等 DOM/渲染树耦合能力：010 不提供内置实现与对外 API；如需该能力，放到 UI/React 层按宿主环境实现（不影响本 spec 的统一错误树/Path/稳定归属）。
- 跨模块 Form 消费 Query 的示例/脚手架，以及按 `resourceId+keyHash` 的跨模块缓存/in-flight 去重：后续在 `StateTrait.source`/`@logix/query` 跑道单独加强并补齐示例（010 仅固化模块内闭环）。

### RHF / TanStack Form 对齐（吸收 / 转化 / 不采纳）

本节用于把“对标业界表单库”的结论固化为本 spec 的可交接取舍：要么吸收为 API/DX，要么转化为 Logix/IR/事务语义内的实现约束，要么明确不采纳并给出理由。

**吸收（保持类似 DX）**

- 保留 valuePath 心智（例如 `userList.0.warehouseId`），并通过 Path 工具完成内部 errors 映射与 IR 口径转换（FR-010，SC-005）。
- 对标 TanStack Form 的“路径类型化”体验：提供 `Form.FieldPath<TValues>` / `Form.FieldValue<TValues, P>` 等推导能力，让 `useField/useFieldArray` 在 TS 下具备编译期路径约束与 value/error 类型推导（FR-010b）。
- 对标 RHF `rules`：提供 `Form.Rule` 的内置规则（required/minLength/maxLength/min/max/pattern 等）作为默认校验器库，减少业务样板且保证错误值 Slim/可序列化（FR-007g）。
- 提供 RHF 风格命令式错误 API：`setError/clearErrors`，但写入落到 `errors.$manual` 覆盖层（优先级 `manual > rules > schema`），并具备可证明的清理语义（FR-011c/FR-011d，Clarifications 2025-12-17）。
- 对标 TanStack Form 的 Subscribe/selector：提供表单级 selector 订阅能力，且 selector 入参为引用稳定的 `FormView`（避免 UI 层扫描大树导致 churn，FR-007e）。
- 对标 TanStack 的 persistent dirty：默认 dirty 为 persistent，并通过 `isPristine/submitCount` 支持“渐进式披露”的 UI 策略（FR-011e/FR-011g）。

**转化（把“隐式约定”提升为运行时契约）**

- 多阶段校验：用 `validateOn/reValidateOn`（Form 默认 + rule 覆盖）表达“首提前/首提后”的自动校验触发策略；submit/root validate 作为确定性链路，且 `validatePaths(paths)` 默认不跑 Schema（FR-007b/FR-007c/FR-011b）。
- 数组稳定 identity：不接受 index 作为长期 identity；以 `$rowId` 作为错误归属锚点，并给出缺失 `trackBy` 的降级与诊断口径（FR-003c/FR-003e）。
- 跨行规则：不接受“每次 onChange 全表扫描”的隐式实践；强制收敛为 list-scope check（一次扫描、多行写回），deps 作为唯一依赖事实源并自动补齐结构依赖（FR-002a/FR-004/FR-007）。
- 错误树：不采用任意 path-map 的 errorMap 作为唯一事实源；统一 `$list/rows[]`（含 `$list` 与 `$rowId`），以支撑可诊断、可回放与增删/重排稳定（FR-003d/FR-005）。
- 对标 TanStack 的 `ListenTo/listeners`：跨字段依赖用 `deps` 表达；字段联动/副作用用 `derived + computed/link`（事务内纯同步写回）或 Task/source（事务外 debounce/IO）表达（不引入新的 listener 真相源）。
- 对标 TanStack 的 “按来源保留错误”诉求：不引入第二套 `errorMap` 作为 state 真相源；来源/阶段信息以诊断事件（`mode`/ruleId/summary）+ UI 策略（`touched/submitCount`）承载。

**不采纳（并给出理由）**

- 不允许 rule 返回任意 valuePath→error 的 path-map（如 `{ "userList.3.warehouseId": "..." }`）：写回点不可预测、合并/覆盖/清理难以证明、且难以在热路径做定向优化；需要命令式写入时走 controller `setError/clearErrors`（FR-007d）。
- Schema/Resolver 默认不进入 onChange/onBlur 热路径：schema parse 往往是全量形状校验，容易拖入负优化；默认仅在 submit/root validate 运行（FR-012a，Clarifications 2025-12-16 / 2025-12-17）。

**后置（不进 010，但保留方向）**

- TanStack 的 `createFormHook`/`withFieldGroup` 等“工程级脚手架”更偏 React 生态层：可在 010 之后把推荐写法固化为 `@logix/form/react` 的脚手架（不改变内核 IR/语义）。

### Key Entities _(include if feature involves data)_

- **动态列表字段**: 表单中可增删/重排的列表型数据（例如 `userList[]`）。
- **列表项（Row）**: 动态列表中的一行数据，可能具备稳定 identity。
- **列表级规则（List-scope Rule）**: 一次评估整张列表、产出跨行约束结果的规则。
- **错误报告（Error Report）**: 错误树以 `$list/rows[]` 表达列表级与行级错误，并以 `$rowId` 作为行级归属锚点，确保增删/重排不漂移。
- **FieldPath（canonical）**: Spec 009 统一的字段路径表示（段数组、无索引/无 `[]`），用于 deps/dirty-set/patch/诊断等 IR 交互口径。
- **触发原因（Trigger）**: 导致一次校验执行的原因（例如字段变化、失焦、提交）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在动态列表 demo 中，仅通过声明一条列表级规则即可完成跨行互斥/唯一性校验，无需额外“触发开关/手写扫描逻辑”。
- **SC-002**: 在 `Diagnostics Level=off` 下，100 行规模时 95% 的输入事件在 50ms 内得到一致错误反馈（出现/清除均一致）。
- **SC-003**: 在包含增删/重排操作的回归用例中，错误不会漂移到错误行，也不会残留在已删除行（0 例）。
- **SC-004**: 每次列表级校验都能产出可序列化诊断摘要，使开发者能在 5 分钟内定位“哪个规则、因何触发、影响了哪些行”。
- **SC-005**: Path 工具与映射不再散落在 install/hooks/schema mapping 内部：关键映射测试覆盖数组索引、深层路径与列表场景，且业务侧仍只使用 valuePath 心智。
- **SC-005a**: `useField/useFieldArray` 的 valuePath 在 TypeScript 下具备编译期约束，且 value/error 类型可推导（示例与类型测试中不再出现 `unknown`，非法路径在编译期失败）。
- **SC-006**: Controller 提供 `validate/reset/handleSubmit` 的默认语义，并能在 demo 中独立演示（无需手写“清空 errors → 多次写回 errors”流程）。
- **SC-006a**: `reset(values?)` 后 `errors/ui` 为空且 touched/dirty 归零；若随后执行 `validate/handleSubmit`，应产生与规则/Schema 一致的错误写回（无残留、无隐式校验）。
- **SC-006b**: demo 与 quickstart 中，`canSubmit/isSubmitting/isValid/isDirty` 等表单级衍生状态通过 selector 订阅能力获取（例如 `useFormState(form, selector)`），而不是在 UI 层扫描 values/errors 大树计算。
- **SC-007**: submit/root validate 默认可同时运行 Schema + Rules，最终写回同一错误树（含 `$list/rows[]`），并输出可序列化诊断摘要。
- **SC-007a**: 当 Schema 与 Rules 在同一路径均产出错误时，最终错误以 Rules 为准（可通过用例验证优先级稳定）。
