# Data Model: 010 Form API（设计收敛与性能边界）

> 本文定义“list-scope Rule”的最小可序列化数据模型（请求、目标、错误树与诊断摘要），供 runtime / form / devtools / sandbox 共同对齐。

## 0) API 形态（终态草案）

本特性的“用户侧 API”以 `@logixjs/form` 为默认入口；核心心智是三层配置：

- `values` / `initialValues`：只描述**值树**（业务 values 的结构与初始值），不包含 `errors/ui`。
- `traits`：统一的声明入口（对齐 `StateTraitSpec`），用于表达字段级校验（`check`）与数组字段的 list 语义（`{ identityHint, item, list }`），以及 `computed/link/source` 等能力。
- `derived`：联动/派生声明入口（业务侧不直接写 `StateTrait`），用于表达可完全降解为 trait `computed/link/source` 的能力；默认只允许写回 `values/ui`（不写 `errors`）。

因此出现 `values.userList` 与 `traits.userList = { identityHint, item, list }` 并不是“重复定义”，而是“对 `values.userList` 这个数组字段附加列表语义（rowId/校验 scope/触发推导）”。

### 0.1 Form.make（配置形态）

以终态为目标（伪类型）：

```ts
type FormConfig<TValues extends object> = {
  values: Schema.Schema<TValues, any>
  initialValues: TValues
  // 两阶段自动校验策略（对标 RHF mode/reValidateMode）
  // - submitCount===0：使用 validateOn
  // - submitCount>0：使用 reValidateOn
  validateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  reValidateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>

  // traits：统一声明入口（字段 check / list 语义 / computed-link-source）
  traits?: StateTraitSpec<TValues>

  // (提案) 联动/派生入口：key = 写回路径（valuePath/uiPath），value = `Form.Trait.*` 产物（同形状于 `StateTrait.*`）
  derived?: Readonly<Record<string, unknown>>
}
```

> 注：终态业务写法默认只用 `traits/derived` + `Form.Rule/Form.Error/Form.Trait`（仍可完全降解到 StateTraitSpec/IR）；数组字段的 list 语义通过 `traits.<listPath> = { identityHint, item, list }` 显式声明。

### 0.2 RuleDecl（用户声明形态）

默认写法支持“直写形态”：在 `traits.<path>.check`（含 list 的 `item.check/list.check`）里直接用对象声明规则；当需要复用/组合时，可提取为 `Form.Rule.make/merge` 的产物复用。

以终态为目标（伪类型）：

```ts
type RuleDecl<Input = unknown, Ctx = unknown> =
  | RuleSet<Input, Ctx>
  | RuleConfig<Input, Ctx>

type RuleConfig<Input = unknown, Ctx = unknown> = {
  // deps/validateOn 可选：未提供时继承当前阶段的 effective 值（validateOn/reValidateOn）
  deps?: ReadonlyArray<string>
  validateOn?: ReadonlyArray<"onChange" | "onBlur">

  // RHF-like：内置规则简写（build 阶段展开为等价纯函数）
  required?: boolean | string | { message?: string; trim?: boolean }
  minLength?: number | { min: number; message?: string }
  maxLength?: number | { max: number; message?: string }
  min?: number | { min: number; message?: string }
  max?: number | { max: number; message?: string }
  pattern?: RegExp | { re: RegExp; message?: string }

  // RHF-like：自定义校验（用于条件逻辑/跨字段分支/复杂约束）
  validate?:
    | ((input: Input, ctx: Ctx) => ErrorPatch | undefined)
    | Readonly<Record<string, (input: Input, ctx: Ctx) => ErrorPatch | undefined>>
}
```

### 0.2.1 RuleSet（归一化形态）

`Form.Rule.make/merge` 的产物必须可直接挂到 `StateTrait.node({ check })`，并可完全降解为 kernel `CheckRule`：

```ts
type RuleSet<Input = unknown, Ctx = unknown> = Readonly<Record<string, CheckRule<Input, Ctx>>>

type CheckRule<Input, Ctx> = {
  deps: ReadonlyArray<string>
  // rule 级自动校验阶段（未提供则继承 effective validateOn）
  validateOn?: ReadonlyArray<'onChange' | 'onBlur'>
  validate: (input: Input, ctx: Ctx) => ErrorPatch | undefined
  meta?: unknown // 必须可序列化（用于诊断展示）
}
```

deps 语义（收敛心智）：

- item scope：`deps:["warehouseId"]` 表示“当前行的 warehouseId”。
- list scope：`deps:["warehouseId"]` 表示“行元素的 warehouseId”（语义等价 `userList[].warehouseId`），并由 build 阶段自动补齐结构依赖（insert/remove/reorder 也触发）。

validateOn/reValidateOn 语义（收敛心智）：

- Form 级 `validateOn/reValidateOn` 用于表达“首提前/首提后”的自动校验触发策略（对标 RHF `mode/reValidateMode`）：`effectiveValidateOn = submitCount===0 ? validateOn : reValidateOn`。
- `onSubmit` 表示“只在提交/root validate 时校验”，不会额外在 change/blur 自动触发 scoped validate。
- rule 级 `validateOn` 是“自动校验阶段白名单”（仅含 onChange/onBlur），用于表达常见的 onChange/onBlur 体验差异（单独字段的 mode 本质就是 rule 级 validateOn）。
- 当一次 scoped validate 由 onChange/onBlur 触发时，若当前阶段不在该 rule 的 `validateOn` 内，则该 rule 应被跳过执行（避免把“只想 onBlur 出错”的规则每次 onChange 都跑一遍）。
- submit/root validate 与手动 `controller.validate(...)` 不受 `validateOn` 影响（总会执行），因此 `validateOn: []` 可表达“仅提交/手动时运行”。
- 若不提供 rule 级 `validateOn`：默认继承 `effectiveValidateOn`（由 submitCount 决定取 `Form.make.validateOn` 或 `Form.make.reValidateOn`）。

错误收集策略（对标 RHF `criteriaMode` / AntD `validateFirst`）：

- 默认采用 **firstError**：同一字段/同一 scope 下若多条规则均失败，只保留“稳定顺序下的首个错误”，以保持 errors Slim、写回可压缩并利于性能止损。
- all-errors（收集全部错误）作为后置能力：优先考虑在诊断/Devtools 层展开，而不是把多错误常态化塞进 errors 真相源（避免膨胀与不可控 churn）。

### 0.2.2 内置规则（对标 RHF `rules`）

为减少业务样板并收敛“必填/长度/范围/正则”等常见校验写法，`@logixjs/form` SHOULD 在 `Form.Rule` 下提供一组与 RHF 命名习惯对齐的内置校验器（本质是 `validate` 里可复用的纯函数）：

- `Form.Rule.required({ message?, trim? })`
- `Form.Rule.minLength({ min, message? })` / `Form.Rule.maxLength({ max, message? })`
- `Form.Rule.min({ min, message? })` / `Form.Rule.max({ max, message? })`
- `Form.Rule.pattern({ re, message? })`

约束：

- 这些内置规则必须是**纯函数**、无 IO、返回 `ErrorValue | undefined`；
- 错误值必须满足“Slim + 可序列化”的约束（对齐本文件的 ErrorValue 约定与 010 的诊断/回放要求）；
- 内置规则不改变 deps/执行范围推导：跨字段/跨行依赖仍由 rule 的 `deps` 显式声明（对齐 010：deps 唯一事实源）。

### 0.2.3 内置规则简写（RHF-like，DX）

除“以纯函数形式复用”外，Rules 还 SHOULD 支持在规则声明对象中直接用简写声明这些内置规则，以降低样板（更接近 RHF `register(..., rules)` 的心智）：

- `required: true` / `required: "message"` / `required: { message?, trim? }`
- `minLength: 2` / `minLength: { min, message? }`
- `maxLength: 10` / `maxLength: { max, message? }`
- `min: 1` / `min: { min, message? }`
- `max: 10` / `max: { max, message? }`
- `pattern: /.../` / `pattern: { re, message? }`

约束：

- 简写只是语法糖：必须在 build 阶段展开为等价的内置纯函数（不引入第二套语义）。
- 简写不改变 deps/执行范围推导与 scope 写回约束：deps 仍是唯一依赖事实源；list-scope 仍只允许写回 `$list/rows[]`。
- 需要条件逻辑/跨字段分支时使用 `validate`（函数或具名函数表），而不是把条件塞进“内置简写”里（保持可推导与可诊断）。

### 0.3 React hooks（消费形态）

终态建议只暴露四个入口（其余能力走 controller/逻辑层，不在 UI 侧拼装）：

- `useForm(blueprint)`：安装 Form blueprint，返回 controller（携带 runtime/dispatch/submit 等）。
- `useField(form, valuePath)`：字段绑定（valuePath=ValuePath 字符串）。
- `useFieldArray(form, listPath)`：数组操作（listPath 指向值树中的数组字段，返回 `fields[i].id`=rowId）。
- `useFormState(form, selector)`：订阅表单级衍生状态（selector 入参是“最小表单视图”，避免在 selector 内扫描 values/errors 大树）。

组件外（Logic/Link）同样需要触发校验与默认动作：当 Form 作为 Host 的 imports 子模块装配时，Logic 可通过 `$.use(blueprint.module)` 得到 ModuleHandle，并调用其 `actions.validate/validatePaths/reset/setError/clearErrors` 触发默认动作语义（controller/React 侧只是薄封装，对齐 FR-011h）。

### 0.4 FormView（selector 订阅输入）

为对标 TanStack 的 `Subscribe/useStore` 且避免“扫大树”负优化，本特性定义一个只读的 **FormView** 作为 `useFormState(form, selector)` 的唯一输入：

- `canSubmit`：是否允许提交（默认不与 `isDirty` 强耦合；是否禁用 pristine 提交由 UI 决定）。
- `isSubmitting`：提交中（用于按钮禁用/防重复提交）。
- `isValid`：是否无错误（含 `errors.$manual`，对齐 FR-011d）。
- `isDirty`：是否发生过值变更（默认采用 *persistent dirty*：一旦 dirty 就保持为 true，直到 `reset()`）。
- `isPristine`：`!isDirty`（便于 UI 表达）。
- `submitCount`：提交尝试次数（用于“首提前/首提后”渐进式体验策略；不要求用户引入第二套 errorMap）。

约束：

- FormView 必须具备缓存与结构共享：当相关输入未变时复用引用，避免每次 dispatch 生成新对象导致全局重渲染。
- selector 必须是强烈建议/默认：不建议提供“省略 selector 自动订阅全量 state”的入口（等价负优化）。

## 1) FieldPath（路径）

本特性需要区分三类路径心智：

- **ValuePath（业务/React 心智）**：点分字符串 + 数字索引（例如 `userList.0.warehouseId`），用于 `useField/useFieldArray` 的取值与交互定位。
- **ErrorsPath（内部写回口径）**：写入 `state.errors.*` 的路径字符串（对外不可见），用于把 ValuePath 映射到 `$list/rows[]` 错误树。
- **FieldPath（canonical，IR/诊断口径）**：对齐 Spec 009 的段数组表示（例如 `["userList","warehouseId"]`），用于 deps/dirty-set/patch/诊断事件中的唯一事实源口径。

FieldPath（canonical）用于表达：

- 触发字段（例如 `["userList","warehouseId"]`）
- scope 路径（例如 `["userList"]`）
- deps 路径（例如 `userList[].warehouseId` 的语义在 IR 中对应 `["userList","warehouseId"]`）

约束（最小集合）：

- FieldPath 必须是可序列化的 **段数组**，且段中不允许出现索引/`[]`（列表索引不稳定，不进入 canonical path）；
- 不允许使用 `*` 作为未知路径（未知写入应通过明确的降级标记表达，而不是把 `*` 当路径值；对齐 009：`dirtyAll: true`）；
- 行级范围信息必须通过 `rowId`（及可选的 index 兜底）表达，而不是把 index 编进 `path`。

ErrorsPath（最小约束）：

- 非数组路径：`valuePath="profile.name"` → `errorsPath="errors.profile.name"`。
- 数组字段 `listPath`：采用“插入 rows 段”的规范映射：`valuePath="<listPath>.<i>.<rest>"` → `errorsPath="errors.<listPath>.rows.<i>.<rest>"`。
- 列表级错误：`errors.<listPath>.$list`。
- 行级锚点：`errors.<listPath>.rows.<i>.$rowId`（用于诊断/回放/重排对齐）。

## 2) ValidateTarget（校验目标）

ValidateTarget 是“scoped validate”的目标表达（与 `TraitLifecycle.FieldRef` 对齐）：

- `root`：全量校验
- `field(path)`：单字段校验
- `list(path)`：整列校验（`path` 为列表根，例如 `userList`）
- `item(path, index, field?)`：单行/单字段校验（`path` 为列表根；`index` 为当前索引；`field` 为行内相对字段）

说明：业务与 React 层仍以 ValuePath 驱动交互；runtime 将其映射为最小校验目标（ValidateTarget.path 为 canonical FieldPath 段数组，索引通过 index/listIndexPath 表达），并结合 deps 图收敛最终执行范围（ReverseClosure）。

## 3) Trigger（触发原因）

Trigger 用于诊断/回放解释（本特性澄清结果）：

- `kind`：事件类型（例如 `action:setValue` / `action:blur` / `submit`）
- `path`：触发字段路径（canonical FieldPath，例如 `["userList","warehouseId"]`）
- `op`：变更类型（`set`/`unset`/`insert`/`remove`）

Trigger 不参与业务逻辑分支的唯一事实源；它只用于解释“为什么触发了这次校验、命中了哪些规则与范围”。

## 4) ErrorValue（错误值）

ErrorValue 是 Slim、可序列化的错误载荷：

- `null`：无错误
- `string`：简洁错误消息
- `{ code?, message, details? }`：结构化错误（details 必须可序列化）

约束：

- ErrorValue 必须满足“可 JSON 序列化”（可视为 `JsonValue` 的子集），且体积上界为 **JSON 序列化后 ≤256B**（避免把大对象图塞进 errors 影响回放/诊断与性能）。

## 4.1) ManualErrors（命令式错误覆盖层）

为支持 `controller.setError/clearErrors`（RHF 风格）且不把“命令式写回”塞进 rule 返回值，本特性定义 `errors.$manual` 作为独立槽位：

- 结构：`errors.$manual` 的子树形态与 `errors` 一致（含数组的 `$list/rows[]` 与 `$rowId` 锚点）。
- 读取优先级：`manual > rules > schema`（manual 覆盖自动校验结果）。
- 默认清理：当同一 valuePath 发生 value 变更时，自动清理对应的 manual 错误；`reset()` 清空全部 manual。
- 校验不清理：validate/submit 只更新 rules/schema，不清理 manual（避免自动校验“意外吃掉”外部错误）。
- 有效性：manual errors 必须参与 `isValid/canSubmit`（manual 存在即视为 invalid），用于阻止 submit。

## 5) `$list/rows[]`（数组错误树）

数组字段（例如 `userList`）的错误节点统一为：

- `errors.userList.$list`：列表级错误（可选）
- `errors.userList.rows[i]`：第 i 行的错误对象（允许空洞，即 `null`）
  - `errors.userList.rows[i].$rowId`：稳定归属锚点（可选，但推荐必有）
  - `errors.userList.rows[i].<field>`：字段级错误（ErrorValue）

关键语义：

- 跨行冲突时，所有参与冲突的行必须标错（而不是只标触发行）。
- 空值不参与跨行冲突检测；“必填”由独立规则表达。
- 当缺失稳定 identity 时，允许降级为按 index 归属，但必须在诊断摘要中说明降级原因，且不得导致残留/漂移不可解释。
- `rowIdStore` 生成的 `$rowId` 必须去随机化（禁止 `Date.now/Math.random`），使用单调序号（保证同一操作链路可重放/可比对）。

嵌套字段的表达（行内相对路径）：

- list-scope/row-scope 规则在产出“行内错误”时，允许用“行内相对 valuePath”表达嵌套叶子（例如 `address.city`），最终写回到 `errors.<list>.rows[i].address.city`（写回与映射必须由统一 Path 工具承担，避免业务自己拼接 errorsPath）。

## 6) TraitCheckEvent（诊断事件）

list-scope check 的最小诊断事件（Slim & 可序列化）应包含（对齐 Spec 009 DynamicTrace.events 的事件信封，`kind="trait:check"`）：

- 产出档位：仅在 `Diagnostics Level=light|full` 产出；`Diagnostics Level=off` 不产出（避免 off 热路径负优化）。
- `ruleId`：稳定规则标识（例如 `userList#uniqueWarehouse`）
- `scopeFieldPath`：规则作用域（canonical FieldPath，例如 `["userList"]`）
- `mode`：校验阶段（`submit`/`blur`/`valueChange`/`manual`）
- `trigger`：本次触发原因（kind+path+op）
- `summary`：受影响范围/数量与错误变化摘要（例如 scannedRows/affectedRows/changedRows）
- `rowIdMode`：行 identity 来源（`trackBy|store|index`；`store` 表示 runtime `rowIdStore`；`index` 为降级兜底）
- `degraded`：降级信息（例如缺失 `trackBy` 且发生“整体替换列表根”导致 rowId 重建）

详细字段以 `specs/010-form-api-perf-boundaries/contracts/schemas/trait-check-event.schema.json` 为准。

## 7) Schema + Rules（submit 合并）

- Schema/Resolver 默认只在 submit/root validate 运行（onChange/onBlur 只运行 Rules），避免热路径负优化。
- controller `validate()`（root）可复用同一条 Rules + Schema 管线；controller `validatePaths(paths)` 默认只运行 Rules（不运行 Schema/Resolver），避免字段级/列表级手动校验引入 Schema 全量 parse 的负优化。
- 默认 onChange/onBlur 不运行 Schema/Resolver 时，同一路径发生 value 变更必须清理该路径下由 Schema 产生的错误（不重新运行 Schema），避免陈旧 Schema 错误残留阻塞 `isValid/canSubmit`。
- Schema 的 issue path 更接近 ValuePath（可能含 index）；写回时必须先映射为 ErrorsPath（尤其数组插入 `rows`），并落到同一份错误树。
- 当 Schema 与 Rules 在同一路径产出错误时，最终写回以 Rules 为准（Schema 仅作为补充来源，不得覆盖 Rules 的业务语义错误）。
