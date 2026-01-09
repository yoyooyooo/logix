# References: `@logixjs/form` 完整业务 API（方案 B：Blueprint + Controller）

> 本文是 `specs/004-trait-bridge-form/spec.md` 的辅助材料：把 “业务侧怎么用 Form” 的 API 形态定下来，同时保证所有语义都能回落到 TraitLifecycle + StateTrait IR（单一事实源），不引入第二套运行时/第二套事实源。

---

## 0. 目标与非目标

### Goals

- 业务开发默认只需要面对 `@logixjs/form` 的 **高层入口**，而不是每次手写 `Logix.Module.make + actions + reducers + StateTrait.install wiring`。
- Form 的 **values/errors/ui** 都落在 Module state 上，满足全双工可回放：不允许在 React 组件本地维护第二套错误/交互态事实源。
- 允许可控的 escape hatch：可以局部插入 raw `StateTrait.node/list` 与自定义 Logic，但不破坏主线。
- React 侧复用 `@logixjs/react`（`RuntimeProvider/useLocalModule/useSelector/useDispatch`），Form 不再发明新的 runtime/hook 基建。

### Non-Goals

- 不做 RHF 的 1:1 API 兼容层（例如 `register/getValues/setValue` 全套复刻）。目标是 **体验 ≥ RHF**，但不为了兼容引入第二套心智或第二套事实源。
- 不把 “所有 ergonomics 细节” 一次性锁死；但必须把 **顶层入口形状**与**边界**定清楚，避免实现走偏。

---

## 1. 分层（Layering）

- **Layer 0 · Kernel（`@logixjs/core`）**  
  Module/Runtime/Flow/Bound + StateTrait IR（computed/source/link/check）+ Resource/EffectOp/Middleware。

- **Layer 1 · Module（`@logixjs/form`）**  
  业务 API：`Form.make`（Blueprint）、`Form.Controller`、`Form.Rule/Form.Error/Form.Trait`（领域糖与 helper；默认入口是 `rules/fieldArrays/derived`）、默认 logics（可选）；`Form.traits/Form.node/Form.list` 仅作为最小 escape hatch（示例不推荐）。

- **Layer 2 · React Bindings（`@logixjs/form/react` 或 `@logixjs/form` 的子导出）**  
  `useForm/useField/useFieldArray`：只做订阅投影 + DOM 事件适配；内部复用 `@logixjs/react` hooks。

---

## 2. 核心方案（Blueprint + Controller）

该方案把 Form 的“完整业务 API”拆成两块：

1) **Blueprint（构造期）**：一次性把模块图纸（state/actions/traits）+ 默认 logics + bridge wiring 组合出来；  
2) **Controller（运行期）**：把 `ModuleRuntime` 投影为业务可用的 field/array/submit/validate 操作集合。

### 2.1 `Form.make`：Blueprint 入口

建议形状（不锁死最终字段命名，但必须满足语义）：

```ts
import type * as Logix from "@logixjs/core"
import type { Schema } from "effect"

export interface FormBlueprint<TValues> {
  readonly id: string

  // 用于接入 AppRuntime / useLocalModule / useModule 等现有体系
  readonly module: Logix.ModuleTagType<any, any>

  /**
   * 默认 ModuleImpl（桥接“模块图纸 → 可 imports 的实现单元”）：
   * - 等价于 `form.module.implement({ initial: form.initial(), logics: form.logics })`
   * - 业务侧可直接用于 Root imports，避免每次手写 module.implement。
   */
  readonly impl: Logix.ModuleImpl<any, any, any>

  // 生成初始 state（确保 values/errors/ui 形状一致）
  readonly initial: (values?: TValues) => unknown

  // 默认建议挂载的 logics（可空；但形状要固定，便于业务按需启用/替换）
  readonly logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>>

  // 纯数据：由 `rules/fieldArrays/derived` 编译得到的 trait 声明（归一化为等价 StateTraitSpec；允许业务 mix-in 少量 raw StateTrait 片段作为 escape hatch）
  readonly traits: unknown

  // Controller 工厂：用于 non-React 环境或测试环境
  readonly controller: {
    readonly make: (runtime: Logix.ModuleRuntime<any, any>) => FormController<TValues>
  }
}

export interface FormMakeConfig<TValues> {
  readonly values: Schema.Schema<TValues>
  readonly initialValues: TValues

  // 默认自动校验阶段：不写 rule.validateOn 的规则会继承它（仅影响 onChange/onBlur；submit 总是 root validate）
  readonly validateOn?: ReadonlyArray<"onChange" | "onBlur">

  // 核心领域配置（默认入口）：`rules/fieldArrays/derived`
  readonly rules?: unknown
  readonly fieldArrays?: ReadonlyArray<unknown>
  readonly derived?: Readonly<Record<string, unknown>>

  // escape hatch：业务注入少量 raw StateTraitSpec 片段（不建议作为默认写法）
  readonly traits?: unknown
}

export declare const make: <Id extends string, TValues>(
  id: Id,
  config: FormMakeConfig<TValues>
) => FormBlueprint<TValues>
```

关键约束：

- Blueprint 必须保证：最终落到 Module 的 `traits` 槽位仍然是 **等价的 StateTraitSpec**（或可归一化为它的结构）。
- Blueprint 不得在内部引入第二套 store；所有状态都在 Module state 中。

### 2.2 Controller：业务运行期入口

Controller 是业务侧实际在“提交/改值/增删行/触发校验”时交互的对象。

建议最小形状：

```ts
export interface FormController<TValues> {
  readonly getState: () => unknown
  readonly dispatch: (action: unknown) => void

  readonly field: (path: string) => {
    readonly get: () => unknown
    readonly set: (value: unknown) => void
    readonly blur: () => void
    readonly focus: () => void
    readonly validate: () => void
  }

  readonly array: (path: string) => {
    readonly append: (value: unknown) => void
    readonly prepend: (value: unknown) => void
    readonly remove: (index: number) => void
    readonly swap: (indexA: number, indexB: number) => void
    readonly move: (from: number, to: number) => void
  }

  readonly submit: () => void
  readonly reset: (values?: TValues) => void
  readonly validate: (paths?: ReadonlyArray<string>) => void
}
```

约束：

- `field/array/submit/validate/reset` 的实现必须只通过 “领域事件 → Module state” 达成；不能在 Controller 里偷存本地状态。
- “局部校验 / scoped validate” 需要能对接 TraitLifecycle（见主 spec 的 FR-021）。

---

## 3. React API（薄投影，复用 @logixjs/react）

React 层不自建 store，只复用现有能力：

- 运行时：`RuntimeProvider`
- 局部表单：`useLocalModule(form.module, { initial, logics, deps })`
- 细粒度订阅：`useSelector(runtime, selector)`
- 派发：`useDispatch(runtime)`

建议提供：

- `useForm(blueprint, options?) -> FormController`
- `useField(controller, path) -> { value, error?, touched?, dirty?, onChange, onBlur, ... }`
- `useFieldArray(controller, path) -> { fields, append, remove, ... }`

其中 `useFieldArray().fields[].id` 只用于 React key，**不得写回 values**（与 004 的 Clarifications 保持一致）。

---

## 4. 与 004 IR 的映射（必须成立）

- 所有校验最终回落为 `StateTrait.check`（写 `state.errors` 同构错误树）。
- 异步资源约束最终回落为 `StateTrait.source`（写回 `ResourceSnapshot`），并遵守 keyHash 门控与并发策略。
- `computed/source` 最终必须具备显式 `deps`（依赖字段路径）与写回门控（默认 `equals = Object.is`），用于触发收敛与 Devtools 可解释性。
- UI 交互态最终写入 `state.ui`（全双工可回放），React 层不维护平行状态。

---

## 5. 与 Module/Runtime 的集成（关键落点）

先统一术语（避免把“模块图纸”和“已实现模块”混为一谈）：

- `form.module`：`Logix.ModuleTagType`（身份锚点/Tag，本质是 `Module.make(...)` 返回值的 `.tag`）
- `FormImpl`：`Logix.ModuleImpl`（`form.module.implement(...)` 的结果，可被 Root `imports` 引入）

### 5.1 Blueprint 本质上就是 `Logix.Module`

`Form.make` 的职责是把「业务表单需要的模块图纸」一次性组装好：

- 内部等价于 `Logix.Module.make(id, { state, actions, reducers?, traits })`，并把 traits（由 rules/fieldArrays/derived 编译 + 可选 raw StateTrait mix-in）归一化为等价的 `StateTraitSpec`。
- 只要 `traits` 槽位存在，`Logix.Module.make` 当前实现会在模块构造期 build `StateTraitProgram`，并在 `implement(...)` 时自动注入 `StateTrait.install`（无需业务侧再写 wiring）。参见：`packages/logix-core/src/Module.ts`。
- Blueprint 的 `logics` 只负责 Form 领域协议：把 `field/change|blur|focus|array/*|form/*` 映射为 `state.ui` 与（可选）scoped validate/submit 流程；不重复承担 StateTrait 的安装职责。

### 5.2 AppRuntime（全局模块）接入

把 Blueprint 变成可被根模块 imports 的 `ModuleImpl`：

```ts
const RootModule = Root.implement({
  initial: { /* ... */ },
  imports: [form.impl],
})
```

约定：

- FormImpl 的 `logics` 由 Blueprint 提供默认值；业务可以追加/替换其中某些逻辑，但不应绕开 “领域事件 → state” 的主线。
- Root program module（或其 `.impl`）仍然是唯一的 `Runtime.make(root, ...)` 入口；Form 只是被 imports 的普通模块，不单独拥有 Runtime。

### 5.3 React（局部表单）接入

局部表单（组件级生命周期）直接复用 `@logixjs/react` 的 `useLocalModule`：

```ts
const runtime = useLocalModule(form.module, {
  initial: form.initial(),
  logics: form.logics,
  deps: [/* 依赖 */],
})
const controller = form.controller.make(runtime)
```

约定：

- Hook 侧只做投影：`useField/useFieldArray` 从 runtime selector 读状态，并把 DOM 事件派发成 FormAction。
- `useFieldArray().fields[].id` 只用于 React key，不写回 `values`。

### 5.4 非 React / 测试环境接入

非 React 代码可以直接使用 Blueprint 的 module/live/implement：

- 构造 Layer：`form.module.live(form.initial(), ...form.logics)`
- 或构造 ModuleImpl：`form.module.implement({ initial: form.initial(), logics: form.logics })`
