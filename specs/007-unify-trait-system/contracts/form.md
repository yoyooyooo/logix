# Contract: `@logix/form`（业务入口）→ StateTrait（中间表示）→ Trait（最小 IR）

> 目标：业务层尽快只接触 Form（高层抽象）。Form 提供“高表达但默认安全”的领域 DSL，并能完全降解到统一的最小中间表示（Trait IR）；降解后仍保持一致的冲突检测、合并与诊断口径。

## 0. API 分层原则（Form > StateTrait > Trait）

- 业务层：只用 `@logix/form`（Blueprint/Controller/React 投影），不直接写 StateTrait/Trait。
- 中间层：StateTrait 作为“强表达但安全的领域语言”（最小集合、可组合、可诊断），供领域包实现与生成器使用。
- 底层：Trait 最小 IR 作为实现细节，仅供工具链/生成器/内核使用；不得要求业务代码直接接触。

## 1. Blueprint

### 1.1 Form.make

Blueprint SHOULD 包含：

- `id`：业务标识
- `valuesSchema`：values 的 Schema
- `initialValues`
- `traitsSpec`：由 `Form.traits(valuesSchema)(...)` 的领域 DSL 产出（业务默认仅使用 Form DSL）；必须可降解为 StateTraitSpec，再降解为统一 Trait IR
- `module` / `impl` / `logics` / `controller`：按 Logix Module 标准入口暴露

### 1.1.1 Form 作为“特殊的 Module”（同源集成）

- FormBlueprint 本质上就是一套“模块图纸 + 默认逻辑 + 领域控制器”的打包：
  - `form.module`：`Logix.ModuleInstance`（模块图纸/Tag），可被 `useLocalModule/useModule/imports` 等现有机制消费；
  - `form.impl`：`Logix.ModuleImpl`（可 imports 的实现单元），用于 Root 模块组合；
  - `form.initial()`：生成初始 state（确保 values/errors/ui 形状一致）；
  - `form.logics`：默认建议挂载的 logics（可替换/追加）；
  - `form.controller.make(runtime)`：把 ModuleRuntime 投影为业务操作集合。
- Form 的 values/errors/ui 都必须落在 Module state 上；不得引入第二套 store，也不得在 UI 本地维护第二套事实源，从而避免“Form 与 Store 何时同步”的长期不确定性。
- 允许可控的 escape hatch：业务可以在局部 mix-in raw `StateTrait.node/list` 或追加自定义 Logic，但必须仍能完全降解到统一 Trait IR，并继续受同一套冲突检测、合并、诊断与回放口径约束。

### 1.1.2 TraitLifecycle（统一下沉接口）

- Form 的默认 logics MUST 基于 `TraitLifecycle.install` 实现（见 `contracts/trait-lifecycle.md`）：
  - UI 事件 → FormAction（领域事件）→ TraitLifecycle（更新 `state.ui` + scoped validate/cleanup）→ 写回 `state.errors`；
  - scoped validate 的执行范围必须由依赖图收敛（Reverse Closure），而不是全量校验或 UI 层手写。
- Form MAY 为 DX re-export：
  - `Form.Ref = TraitLifecycle.Ref`（FieldRef 构造器）
  - `Form.install = TraitLifecycle.install`（供自定义模块或高级场景复用）

## 1.2 表达力与组织形状（可推导中间表示）

- Form DSL 必须把常见组织形状显式化：字段节点（field/node）、列表（list：item/list scope）、检查（check：命名规则集）。
- 关键要求不是“靠编码约定推导含义”，而是让这些形状在中间表示中可直接读出并用于类型推导、诊断与生成。

## 1.3 可降解（统一 IR + 一致冲突检测/合并）

- 所有 Form DSL 必须 **完全降解** 到统一 Trait IR（不引入第二套运行时）。
- Form.traits MUST 产出可被 `StateTrait.from(schema)({ ... })` 直接 `spread` 的 kernel fragment（StateTraitSpec 片段），并允许与少量 raw StateTrait 片段混用（escape hatch）。
- 降解后仍需支持一致的冲突检测与合并：
  - 路径重复定义必须可被检测；
  - 若允许覆盖，则覆盖优先级必须是显式且确定性的，并可被诊断解释；
  - 对错误树（check）允许“命名规则集合”合并；对非错误字段写回不允许静默 last-writer-wins。

## 1.4 Rules & Error helpers（领域糖，仍可降解）

- `Form.Rule.make(input => ...)`/`Form.Rule.make({ validate: ... })` 用于组织命名规则集合：
  - 规则必须是纯函数（状态/输入 → 错误 patch 或 undefined），不得触发 IO；
  - 命名规则集合的合并顺序必须确定性，并可在诊断中看到“哪条规则产出了错误”。
- `Form.Error.*` 用于构造同构错误树与列表/行级错误（隐藏 `$list/$item` 等底层细节），并提供 Schema 解码错误的归属能力：
  - 支持 `errorMap` 逃生舱：复杂 transform 失败时由开发者显式把错误归属到字段路径集合，保证错误展示与回放稳定。
  - 应提供默认的 Path Mapping 能力，覆盖大多数常见的重命名与结构映射（含数组内路径对齐）场景，使“无需手写 errorMap 的自动归属”覆盖大多数日常用例；超出覆盖面时再回退到 errorMap。

## 2. Errors（同构树）与写入语义

- 错误模型为与 values 同构的树；
- 字段级错误写入叶子；
- 列表级错误写入列表节点的固定位置（例如 `$list`），并允许 item 级写 `$item`；
- 当某个 scope 无错误时必须清理该 scope 的错误子树（避免残留）。

## 3. UI State（全双工）

- `touched/dirty/...` MUST 进入 `state.ui`（或等价专用子树）；
- 表达形状 SHOULD 与 values 同构的布尔树；
- UI 层不得维护第二套不可回放事实源。

## 4. Validate & Lifecycle（桥接到 StateTrait）

- `validate(target)` 的执行范围以 Reverse Closure 最小集合为准；
- `mode` 至少支持：submit/blur/valueChange/manual；
- unregister/删行/重排必须触发清理（errors 与 ui），并门控 in-flight 回写。

## 5. React 适配（薄投影）

- `@logix/form/react` 仅做订阅投影与 DOM 事件适配（如 `useForm/useField`）；
- 不得在组件内通过 `useEffect` 造第二套“自动触发/自动校验”事实源；
- 触发/并发/竞态/回放语义由 Blueprint 默认 logics + runtime 约束保证。

## 6. 与 Module/Runtime 的组合方式（必须复用既有玩法）

- Root 组合（推荐）：把 `form.impl` 当作普通模块一样 imports 到 Root 模块中；Form 不单独拥有 Runtime。
- 局部表单：使用 `useLocalModule(form.module, { initial: form.initial(), logics: form.logics })`，再通过 `form.controller.make(runtime)` 得到 controller；`useForm(blueprint)` 只是这条路径的薄糖。
- 非 React / 测试：可直接使用 `form.module.implement({ initial: form.initial(), logics: form.logics })` 或等价入口复用同一套运行时语义与回放/诊断口径。
