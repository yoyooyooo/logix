# Data Model: Trait 生命周期桥接 × StateTrait（支点）× Form（Rules/ErrorTree/安装）

**Branch**: `004-trait-bridge-form`  
**Source Spec**: `specs/004-trait-bridge-form/spec.md`  
**Source Quickstart**: `specs/004-trait-bridge-form/quickstart.md`

> 作用：从「概念实体 + 关系」角度，把本特性在 trait 内核链路上要固化的通用形状梳理清楚：  
> - 以 **StateTrait** 作为支点跑通数组/错误树/资源/事务；  
> - 在其上构建 **Form 领域系统**（`@logix/form`：Rules/Error helpers/迁移映射）；  
> - 同时把“trait 生命周期桥接”下沉成可复用能力，便于未来更多 `xxxTrait` 复用同一条链路（install / refs / validate / cleanup）。  
> 优先面向：Trait/Runtime 实现者、Devtools / Studio 维护者。
>
> 相关 reference：  
> - StateTrait kernel 主模型与 Program/Graph/Plan：`specs/000-module-traits-runtime/data-model.md`  
> - StateTrait kernel API 形状（computed/source/link/check/list）：`specs/000-module-traits-runtime/references/state-trait-core.md`  
> - Resource / Query 约束：`specs/000-module-traits-runtime/references/resource-and-query.md`  
> - Txn / Runtime 主线（表单最终落点）：`specs/003-trait-txn-lifecycle/spec.md`
>
> 平行领域（Query）的外链规划：  
> - Query 领域规划：`specs/004-trait-bridge-form/references/02-query-module-plan.md`  
> - Query 数据模型：`specs/004-trait-bridge-form/references/03-query-data-model.md`  
> - Query quickstart：`specs/004-trait-bridge-form/references/04-query-quickstart.md`

---

## 1. 总览：Form 领域能力如何回落到 trait kernel

本特性不引入第二套表单运行时。**唯一运行时主线仍是 StateTrait → Program/Graph/Plan → Runtime/Txn/EffectOp。**

概念链路：

```text
（可选）Form 领域包（基于 trait 生命周期桥接）
  - Form.traits(...)
  - Form.Rule.make(...)
  - （未来可扩展）RHF 映射/迁移 helper
        │  编译为
        ▼
StateTraitSpec<S>（含 node/list/$root 组合子）
        │
        ▼
StateTrait.build
        │
        ▼
StateTraitProgram<S> + Graph + Plan
        │
        ▼
ModuleRuntime / StateTransaction / EffectOp
```

要求（对齐“Trait 生态”大目标）：

- `Form.traits / Form.Rule / Form.Error` 只负责生成/组合 kernel 友好的 `StateTraitSpec` 片段与 ErrorTree helper；  
- StateTrait.build/install 继续作为唯一的编译/安装入口；  
- Runtime / Devtools 只感知 kernel（computed/source/link/check/list）与 EffectOp，不感知 Form 领域糖的存在。
- `Form.*` 的落点为独立包 `@logix/form`（见 spec Clarifications 2025-12-12），以便把“表单领域能力”与 core kernel 解耦；`@logix/form` 只依赖 `@logix/core` 与 `effect`，不依赖 React 适配层。

---

## 2. 数组 Trait：StateTrait.list IR

### 2.1 StateTraitListSpec<S, TItem>

**角色**：描述某个数组字段在 `item` / `list` 两个输入域上的 Trait 能力集合（单行 / 整列）。

本特性把「resourceId」升级为可携带蓝图元信息的入参形态，但运行时事实源仍然是 string id：

```ts
type ResourceMetaHint = {
  readonly label?: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly owner?: string
  readonly docUrl?: string
}

type ResourceRef = {
  readonly id: string
  readonly meta?: ResourceMetaHint
}

// DSL 层允许 string 或 ResourceRef；build 阶段必须归一化成 string resourceId。
type ResourceIdLike = string | ResourceRef

// 运行时约束（与 @logix/core/ResourceRegistry 对齐）：
// - 在同一 Runtime 作用域内，resourceId MUST 唯一（重复注册且实现不一致应在 dev 下报错）；
// - 跨 Runtime 作用域允许复用同一 resourceId（不同子树可注入不同实现），不视为冲突。
//
// 注入方式（组织最佳实践）：
// - 推荐：在 Runtime.make 的 Layer 中通过 Resource.layer([...specs]) 注入；
// - 局部场景也可在 ModuleImpl.imports 中注入 Layer（更贴近模块实现），语义等价。

// meta 冲突处理（只影响 Devtools/生成/诊断，不影响执行语义）：
// - 若同一 resourceId 在同一 Program 内出现多个不同 meta，dev 环境应 warning；
// - 采用确定性的 first-wins：按 ownerFields（引用该 id 的 fieldPath）字典序最小的那一处作为 canonical meta；
// - 不做 deep-merge，避免扩大心智与引入隐式规则。
//
// Devtools 展示优先级（只影响展示/诊断，不影响执行语义）：
// - ResourceRef.meta 优先；
// - 缺失字段再 fallback 到 ResourceSpec.meta 的同名字段（例如 description）；
// - 不做深合并、不引入语义字段。
// - 若同名展示字段同时存在且值不一致，dev 环境应 warning（按 resourceId+字段去重），提示“展示元信息分叉”。
// - tags 语义为分类标签（用于过滤/分组/检索）；Devtools 展示与索引时应对 tags 去重并按字典序排序，保证稳定可对比。
```

概念定义（IR 草图）：

```ts
/**
 * StateTrait.node：统一 DSL 形状（纯编译期组合子）。
 *
 * - 对标量字段：挂在字段路径上，input 是该字段值；
 * - 对 list.item：input 是单行（数组元素）；
 * - 对 list.list：input 是整列（ReadonlyArray<TItem>）；
 * - 对 $root：input 是整份 state。
 */
type StateTraitDeps = ReadonlyArray<string>

/**
 * computed/source 的最小单元：显式依赖 + 纯函数。
 *
 * 约束（004 硬语义）：
 * - deps MUST 显式声明（不从函数体/derive/key 隐式推导），用于触发收敛 + 图构建 + 可解释性；
 * - equals 缺省为 Object.is：值不变则不得写回，避免无意义 patch 与自激循环。
 */
type StateTraitComputedSpec<Input, Ctx> = {
  readonly deps: StateTraitDeps
  readonly get: (...depsValues: Array<unknown>) => unknown
  readonly equals?: (prev: unknown, next: unknown) => boolean
}

type StateTraitSourceSpec<Input, Ctx> = {
  readonly deps: StateTraitDeps
  readonly resource: ResourceIdLike
  // 允许返回 undefined 表示“当前无有效 key”：不触发 IO，snapshot 回到 idle。
  readonly key: (...depsValues: Array<unknown>) => unknown | undefined
  // 触发集合：Form.traits 默认 ["onMount", "onKeyChange"]；kernel 默认 ["manual"]。
  // 约束：若包含 "manual"，则必须严格等于 ["manual"]（与其它 trigger 互斥）。
  // 说明：kernel 统一用“状态语义”命名，避免与 UI 层事件混淆；UI 适配层可把 onChange/onBlur 映射为 onKeyChange/onBlur。
  readonly triggers?: ReadonlyArray<"manual" | "onMount" | "onKeyChange" | "onBlur">
  readonly debounceMs?: number
  readonly concurrency?: "switch" | "exhaust"
}

type StateTraitNodeSpec<Input, Ctx> = {

  /**
   * computed：按“目标字段”产值（不得返回任意 patch）。
   *
   * - key 为相对路径（相对当前 node scope）；
   * - value 必须显式声明 deps + get（避免隐式依赖，便于诊断/生成/性能收敛）。
   */
  readonly computed?: Record<
    // target：相对路径（相对当前 node scope）
    string,
    StateTraitComputedSpec<Input, Ctx>
  >

  /**
   * check：命名规则集合（ruleName -> 纯校验函数），返回错误树 patch。
   *
   * - 返回值 MUST 是“相对当前 scope 的错误 patch”（见 spec Clarifications 2025-12-12）；build/install 负责把它写回到 `state.errors` 的同构子树；
   * - 返回 `undefined` 表示该 scope “无错误”，运行时 MUST 清理该 scope 对应的错误子树（避免错误残留）；
   * - 规则可以读取更大 scope 的只读 state 以完成跨字段/跨行判断，但写入位置仍必须遵守 scope（例如 list.list 只能写该列表节点下的 `$list` 或各行错误）。
   */
  readonly check?:
    | ((input: Input, ctx: Ctx) => unknown)
    | Record<string, (input: Input, ctx: Ctx) => unknown>

  /**
   * source：按“写回目标字段”声明资源依赖。
   *
   * - key 为相对路径（写回目标字段）；
   * - value 是资源依赖声明（不包含 IO 实现）。
   */
  readonly source?: Record<
    string,
    StateTraitSourceSpec<Input, Ctx>
  >

  /**
   * link：按“目标字段”声明联动来源（from 可为绝对路径或相对路径，编译期归一化）。
   */
  readonly link?: Record<
    string,
    {
      readonly from: string
    }
  >
}

/**
 * StateTrait.list：数组字段一等公民。
 *
 * - item：单行 scope（数组元素）；
 * - list：整列 scope（跨行/列表级）。
 */
type StateTraitListSpec<S, TItem> = {
  readonly kind: "list"
  readonly path: StateFieldPath<S> // 指向数组本身，如 "items"、"sections.items"

  // item/list 两个 scope 都是可选的：只写 item 即可覆盖绝大多数“行内表单”场景；
  // 当需要“跨行/列表级”规则/摘要时再声明 list（避免不必要的 API 表面积）。
  readonly item?: StateTraitNodeSpec<TItem, ItemCtx<S, TItem>>
  readonly list?: StateTraitNodeSpec<ReadonlyArray<TItem>, ListCtx<S, TItem>>
}
```

说明：

- `node/list` 都是 DSL 组合子：不引入新的运行时 kind；  
- build 阶段会把 node/list 展开为一组等价的 kernel Entry（computed/source/link，以及写 errors 的 check）：  
  - 主要落在 `items[]` 与 `items[].field` 级路径上的 computed/source/link/check；  
  - Graph 中可以看见「列表节点」以及 item/list scope 的依赖边；  
- `check` 仍是 computed 的语义糖：输出的错误 patch 会被写入 `errors` 子树（见第 4 节）。

### 2.2 source 写回：ResourceSnapshot

Form 场景中，source 目标字段写回的不是 raw data，而是可直接被 UI/Devtools 消费的快照。

概念定义（最小形态）：

```ts
type ResourceSnapshot<Key, Out, Err = unknown> =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly key: Key }
  | { readonly status: "success"; readonly key: Key; readonly data: Out }
  | { readonly status: "error"; readonly key: Key; readonly error: Err }
```

约定：

- `StateTrait.source` 与 `node.source`（字段级 / list.item / list.list）写回的目标字段类型 SHOULD 是 `ResourceSnapshot<Key, Out, Err>`；  
- `resource` 入参允许 `ResourceIdLike`，但 build/plan/runtime 必须仅保留 string resourceId（`typeof resource === "string" ? resource : resource.id`）；`ResourceRef.meta` 只用于 Devtools/文档/生成，不得参与执行语义；  
- `computed/check` 通过读取 snapshot 来派生 options/disabled/错误提示等表单友好字段；  
- snapshot 的 status 变迁应可被 Devtools Timeline 观测（至少：进入 loading，成功/失败落盘）。
- `key` 允许返回 `undefined` 表示“当前无有效 key / 禁用”：此时不得触发 IO，目标字段写回 `{ status: "idle" }`（该禁用语义为 kernel 通用能力）；  
- 必须处理 key 竞态：当 refresh 返回时若当前 keySelector 推导的 key 已变化，则该返回结果视为 stale，必须丢弃（不得覆盖当前 snapshot）。  
  注意：所有比较/去重/竞态判断都必须基于 keySchema 规范化后的稳定 `keyHash`（见 2.3）。

### 2.3 keySchema 规范化与 keyHash（相等性 / 去重 / 竞态判断的唯一依据）

**目标**：让 Resource 的 key 在全双工链路中可对比、可回放、可诊断，避免对象引用或不稳定序列化导致的“误判相等/误判不等”。

约束：

- 运行时在执行 `source` 刷新前，必须先用 `ResourceSpec.keySchema` 对 key 做规范化（decode/normalize），得到规范形态的 `keyNormalized`；
- 运行时必须对 `keyNormalized` 计算稳定的 `keyHash: string`，并以 `keyHash` 作为：
  - 去重依据（相同 keyHash 可跳过重复 refresh）；
  - 竞态判断依据（stale 丢弃）；
  - Devtools Timeline/诊断事件的关联 id（建议展示 keyHash）。
- 禁止用对象引用相等或不稳定的 `JSON.stringify` 直接作为相等性依据。

实现层可以选择任何稳定方案（例如 canonical JSON + hash），但必须满足：

- 对同一个 `keyNormalized`，不同运行环境/不同进程/不同执行时刻得到的 keyHash 必须一致；
- 对不同的 `keyNormalized`，keyHash 冲突概率在工程上可忽略（允许记录在实现约束中）。

### 2.4 source 并发策略（concurrency）

`source` 的并发策略用于描述“同一 source 规则在 in-flight 时收到新的 refresh 触发该怎么办”，它不改变最终的竞态正确性（stale 丢弃仍然必须做）。

```ts
type SourceConcurrency = "switch" | "exhaust"
```

- `switch`（默认）：以最新 key 为准；in-flight 时触发新的 refresh，运行时 SHOULD 尽量取消旧 in-flight；无论能否取消都必须通过 keyHash 门控写回，丢弃 stale 结果。
- `exhaust`：in-flight 期间抑制新的 refresh 触发，但必须记录一次 trailing refresh（只保留最后一次）。当前请求结束后自动补发一次“最新 key”的 refresh（同样通过 keyHash 门控写回）。

### 2.5 list 相关路径语义

路径推导与合法性约束以 kernel SSoT 为准（`StateFieldPath<S>` / `StateAtPath<S, P>`）。本 spec 只强调数组的两类路径：

- **到数组本身**：`"items"`、`"sections.items"`，用于挂载 list；  
- **到任意元素及子字段**：`"items[].amount"`、`"sections[].items[].name"`，用于 item scope 内部依赖与 Devtools 展示。  
  `[]` 仅表示“任意 index 的元素”，元素身份语义默认按 index 理解（与 RHF 对齐）。

### 2.6 node/list/$root 的“展开”（编译映射，概念）

`StateTrait.node` / `StateTrait.list` / `$root` 都是 **DSL 组合子**：build 阶段必须把它们展开成 kernel 可执行的规则集合（computed/source/link + check 写 errors），以保证 Runtime/Devtools 只有一条主线。

本 spec 在 data-model 侧只固化以下几条“展开规则”（不锁死 TypeScript 具体 API）：

1. **相对路径解析**  
   - `node.computed` / `node.source` / `node.link` 的 key 是相对路径（相对当前 scope），build 阶段必须解析成绝对 target path；  
   - 对 list.item scope：相对路径只允许落在“单行元素子树”内（例如 `"ui.hideLevelAndScore"`）；  
   - 对 list.list scope：相对路径 SHOULD 优先落在“列表级目标字段”（如写回某个 `itemsMeta.*` / `meta.xxx` 字段），避免隐式地“批量 patch 多行字段”造成心智漂移；如确有“跨行计算后写回多处字段”的需求，优先通过显式的字段级 computed/link 规则表达，或退回 `$root` 统一编排。

2. **check 的写回位置（errors）**  
   - `field/node.check`：返回 FieldError（或命名错误 Record），写入 `errors.<fieldPath>`；  
   - `list.item.check`：返回 ItemErrorTree patch，写入 `errors.<listPath>[index]`（可包含 `$item`）；  
   - `list.list.check`：返回 ListErrorNode（数组节点 + `$list`），写入 `errors.<listPath>`；并允许同时写多行/多字段错误；  
   - `$root.check`：返回 GlobalErrorTree，从 `errors` 根写入（允许跨域写入多个位置）。  
   - 任意 scope 的 check 返回 `undefined` 表示“该 scope 无错误”，Runtime MUST 清理该 scope 对应的 errors 子树（避免残留）。
   - 当 `check` 使用命名规则集合（Record 形态）时，执行顺序与合并语义必须确定性（参见 spec FR-014）：按 `ruleName` 字典序执行并合并；同一路径 leaf 可合并为 `Record<ruleName, message>` 以保留多条错误。

3. **source 的写回位置（快照字段）**  
   - `source` 的 target 字段必须写回 ResourceSnapshot（见 2.2），并遵守 keyHash 去重/竞态门控（见 2.3）与并发策略（见 2.4）。

---

## 3. 上下文：ItemCtx / ListCtx / FormCtx

上下文类型用于在 list 的 computed/check/source/link 中向开发者暴露必要的只读信息。

### 3.1 ItemCtx<S, TItem>

```ts
interface ItemCtx<S, TItem> {
  readonly state: Readonly<S>              // 当前完整 State 快照（含 errors/meta）
  readonly path: StateFieldPath<S>         // 列表字段路径，如 "items"
  readonly listIndexPath: ReadonlyArray<number> // list 实例锚点（用于嵌套数组，如 [sectionIndex]）
  readonly index: number                        // 当前元素 index（0-based）；完整 indexPath = [...listIndexPath, index]

  // 实现层 MAY 提供便捷视图：
  // readonly items: ReadonlyArray<TItem>
  // readonly prevItem?: TItem
  // readonly nextItem?: TItem
}
```

### 3.2 ListCtx<S, TItem>

```ts
interface ListCtx<S, TItem> {
  readonly state: Readonly<S>
  readonly path: StateFieldPath<S>
  readonly listIndexPath: ReadonlyArray<number> // list 实例锚点（用于嵌套数组，如 [sectionIndex]）
  // 实现层 MAY 暴露 env/items 等扩展信息（不进入 SSoT 固定字段）
}
```

### 3.3 FormCtx<S>

```ts
interface FormCtx<S> {
  readonly state: Readonly<S>
  // 实现层 MAY 扩展 env / formId / locale 等
}
```

FormCtx 仅用于根级 check（跨字段/跨列表校验）。

### 3.4 FieldRef / ListRef（上层桥接的可序列化定位）

为了让 `@logix/form` / `@logix/react` 在不理解 kernel 内部实现细节的前提下，仍能做到 RHF 级别的局部校验、unregister、滚动到首错等能力，需要一套可序列化、可比较的“字段实例定位”。

概念草图：

```ts
type ListIndexPath = ReadonlyArray<number>

type ListRef<S> = {
  readonly path: StateFieldPath<S> // 指向数组字段本身，如 "items" / "sections.items"
  readonly listIndexPath: ListIndexPath // 嵌套数组锚点：外层 list 的 indexPath（如 [sectionIndex]）
}

type FieldRef<S> =
  | (ListRef<S> & {
      readonly kind: "list"
    })
  | (ListRef<S> & {
      readonly kind: "item"
      readonly index: number // 当前行 index
      readonly field?: string // 可选：行内相对字段路径（如 "amount" / "ui.hideLevelAndScore"）
    })
  | {
      readonly kind: "field"
      readonly path: StateFieldPath<S> // 标量/对象字段路径，如 "profile.email"
    }
  | {
      readonly kind: "root"
    }
```

说明：

- FieldRef 是“上层与 runtime 的桥接货币”，必须能稳定序列化（用于 Devtools、缓存、定位首错）。
- 不强求首版暴露 `field` 的完整类型推导；但必须能表达：field / list / item / root 这四种 target。

### 3.5 ValidateRequest（局部/全量校验触发）

为了支撑 “blur 才显示错误 / submit 全量 / change 局部复校验” 等策略，runtime 必须支持 scoped validate（见 spec FR-021）。

概念草图：

```ts
type ValidateMode = "submit" | "blur" | "valueChange" | "manual"

type ValidateRequest<S> = {
  readonly mode: ValidateMode
  readonly target: FieldRef<S>
  // 实现层 MAY 扩展：reason、traceId、sourceEvent 等
}
```

行为约束（概念）：

- validate 必须只执行“可能影响 target 的 check”（由 Graph/Plan 推导），避免无谓全量计算；
- validate 的写回仍然遵守本 spec 的 scope 规则：非 `$root` 不得跨域写 errors。

### 3.6 unregister / 行删除 / 重排（清理语义，概念）

为了避免“幽灵错误/幽灵请求回写”，runtime 必须在结构变更时做确定性清理（见 spec FR-021）：

- **unregister 字段**：必须清理对应 `errors` 子树与 `ui.touched/dirty` 标记；若该字段承载 source 快照，也必须把快照回收为 idle（或等价“未激活”状态），并确保 in-flight 结果不会再写回；
- **删除行**：必须按 index 身份语义移除该行对应的 `errors.items[index]` 与 `ui.*.items[index]`；并对受影响的 list.list 规则重新计算（至少在下一次 validate/submit 时保证一致）；
- **重排**：默认按 index 身份语义重新归属（与 RHF 一致）；errors 与 ui 标记必须随 index 移动保持同构。

---

## 4. 错误模型：ErrorTree for Arrays

本特性沿用 kernel 的「与值结构同构」错误树模型，并对数组做额外约定。

### 4.1 基本类型

```ts
type FieldError = string | Record<string, string> | undefined

// 单个元素的错误树（与元素值结构同构）
type ItemErrorTree<TItem> = {
  [K in keyof TItem]?: FieldError | ItemErrorTree<any>
} & {
  readonly $item?: FieldError // 行级聚合错误（可选）
}

// 列表字段错误节点：就是与值结构同构的数组（可附带 $list）
type ListErrorNode<TItem> = ReadonlyArray<ItemErrorTree<TItem> | undefined> & {
  readonly $list?: FieldError // 列表级聚合错误（至少一行/跨行唯一性等）
}

// 面向整份 State 的错误树
type GlobalErrorTree<S> = {
  [P in StateFieldPath<S>]?: unknown
} & {
  readonly $form?: FieldError // 表单级错误（可选）
}
```

约定：

- 数组字段错误节点直接是数组：`errors.items[i].field`；  
- 列表级错误统一挂在同一节点下的 `$list`：`errors.items.$list`；  
- `list.list.check` 允许返回“同时包含 `$list` 与多行错误”的 `ListErrorNode`：既能表达列表级摘要，也能准确落到具体行/字段（例如“orderNo 必须单调递增”需要标记若干行）；  
- 为了让 `ListErrorNode` 在 TypeScript 中可读、可写、可复用，`@logix/form` SHOULD 提供 `Form.Error.list(items, { list?: FieldError })` 一类的 helper 用于构造该形状，避免业务代码中出现类型强转或对数组对象的“魔法挂属性”；  
- 为了避免用户侧 API 入参出现 `$`，该 helper 的 opts SHOULD 使用更友好的字段名（例如 `{ list?: FieldError }`），并在 helper 内部写入 `$list`；错误树事实源仍然是 `errors.items.$list`；  
- 同理，行级聚合错误（`errors.items[i].$item`）也 SHOULD 提供对称 helper：`Form.Error.item(fields, { item?: FieldError })`，内部写入 `$item`，避免用户侧出现 `$item`；  
- 根级错误可使用 `$form` 表达“整张表单无效”；  
- 允许实现层用“路径字典”作为内部表示，但对外 SSoT 仅承认同构树模型。

---

## 5. Rules 语法糖（可选）

Rules 是面向日常表单开发的**可选领域糖**，用于把常用规则配置编译为 kernel 的 `check(input, ctx)`。

### 5.1 RuleConfig<V>

概念定义：

```ts
interface RuleConfig<V> {
  readonly required?: boolean | FieldError
  readonly min?: number | { value: number; message?: FieldError }
  readonly max?: number | { value: number; message?: FieldError }
  readonly minLength?: number | { value: number; message?: FieldError }
  readonly maxLength?: number | { value: number; message?: FieldError }
  readonly pattern?: RegExp | { value: RegExp; message?: FieldError }

  // 命名的自定义规则集合（同步）：异步/IO 一律通过 source + check/computed 表达
  readonly validate?: Record<
    string,
    (value: V, ctx: unknown) => FieldError | undefined
  >
}
```

说明：

- 规则能力对标 RHF rules；  
- `validate` 支持多条命名规则，便于 Devtools / Studio 展示与复用；  
- 异步校验不在 Rules 层直接做 IO：若需异步校验，应通过 source 声明资源依赖，再在 check/computed 中基于资源结果派生错误。

### 5.2 Form.Rule.make<V>(config)

**角色**：唯一规范入口。根据使用位置自动推断 input 域并产出等价的 `check` 函数。

概念签名：

```ts
namespace Form.Rule {
  function make<V>(config: RuleConfig<V>): (input: V, ctx: unknown) => unknown
}
```

产物的返回结构需符合第 4 节的 ErrorTree 约定。

---

## 6. Schema（effect/Schema）在 Form 领域的角色（边界校验 + transform）

Rules 与 Schema 不是“二选一”，而是分工协作：

- **Rules**：偏“输入体验/即时反馈”，运行在 field/item/list/root 的 `check` 槽位（最终写入 `state.errors`）。
- **Schema**：偏“提交/边界校验 + 字段名映射”，在 Form ↔ 后端模型边界执行（decode/encode/transform）。

关键约束：

- 后端模型 Schema decode 失败时，必须能把错误**映射回同一套 ErrorTree**，以便 UI 只消费 `state.errors` 一处事实源；
- 该映射由 `@logix/form` 的 helper/适配层负责（例如 `Form.Error.fromSchemaError(...)`），输出形态为：
  - root 位置：`GlobalErrorTree<S>`（允许落到 `errors.$form`）；或
  - 字段位置：写入与 FormView 同构的 `errors.<fieldPath>`（优先）。

实现层可选择任何 Schema 错误结构（例如 issue/path 列表），但对外承诺必须回落到本 spec 约定的 ErrorTree。

---

## 7. Form UI 交互态（touched/dirty 等）与全双工

本 spec 约定：表单交互态属于全双工可回放链路的一部分，SHOULD 存放在 Module state 的专用子树中（推荐 `state.ui`）。

目标：

- Devtools/TimeTravel 能回放 “用户如何一步步把表单弄到当前状态”（值变化 + 校验触发 + touched 变化）；
- 校验触发策略（如 blur 才展示、submit 后改为 change 复校验）可以纯粹地由 `state.ui` 决定，而不是散落在 UI 组件本地状态里；
- UI 层只负责把 DOM 事件映射为“值变化/失焦/注销”等领域事件，并由 `@logix/form` 将其写入 `state.ui`；kernel 不直接感知 DOM。

概念草图（只表达“专用子树 + 同构树”的心智，不锁死字段清单）：

```ts
type BoolTree<T> = unknown

// 建议的“同构布尔树”心智（概念）：字段就是字段、数组就是数组。
// 实现层允许内部用路径字典优化，但对外应保持同构读写体验。
//
// type BoolTree<T> =
//   T extends ReadonlyArray<infer A>
//     ? ReadonlyArray<BoolTree<A> | undefined>
//     : T extends object
//       ? { readonly [K in keyof T]?: BoolTree<T[K]> }
//       : boolean

type FormUiState<S> = {
  readonly touched?: BoolTree<S>
  readonly dirty?: BoolTree<S>
  readonly submitCount?: number
}

type StateWithFormUi<S> = S & {
  readonly ui?: FormUiState<S>
}
```

说明：

- `BoolTree<S>` MUST 与 FormView 值结构“同构”：字段就是字段、数组就是数组；不引入 `$list/$item`。以便开发者按同一路径读写（字段/数组元素同构）与 Devtools 可视化；实现上允许内部用路径字典优化，但对外心智建议同构树。
- `@logix/form` 负责维护 `state.ui` 的写入，以及在需要时触发 StateTrait 的局部/全量校验（validate）。

---

## 8. Form.traits 领域糖（可选）

Form.traits 用于把“表单视角的配置”收敛为可 spread 的 StateTraitSpec 片段，提升可读性，但**不增加新的 verbs**。

概念形态：

```ts
namespace Form {
  function traits<S>(
    schema: Schema.Schema<S, any>,
  ): (spec: {
    [P in StateFieldPath<S>]?: StateTraitEntry<S, P> | StateTraitListSpec<S, any>
  }) => StateTraitSpec<S>
}
```

说明：

- traits 只是帮助编排 list/check/source 的小工具；  
- 输出仍然是 kernel 的 `StateTraitSpec<S>`，最终交给 StateTrait.build/install。

---

## 9. TraitLifecycle.install（桥接 UI 事件 → state.ui → scoped validate）

本小节刻意把 “install” 从 Form 领域叙事里抽出来：它应该是 **Trait 生命周期**提供的通用桥接能力（见 spec FR-020/FR-021），用于把“上层领域事件”接到某个具体 ModuleRuntime 上执行。

Form 只是第一个吃到这套桥接能力的领域包：`@logix/form` 可以选择性地 re-export 这一能力（例如 `Form.install = TraitLifecycle.install`），但 API 的语义与所有权属于更底层的 Trait 生命周期。

概念职责：

- 监听（或约定）一组标准的 form action（例如 `form/valueChange`、`form/blur`、`form/validate`、`form/unregister`）；
- 在对应 action 到来时：
  - 更新 `state.ui`（touched/dirty/submitCount…，同构布尔树）；
  - 触发一次 scoped validate（向 runtime 发出 `ValidateRequest`），由 Graph/Plan 推导“需要执行哪些 check”；
  - 写回 `state.errors`（遵守 scope 规则与清理语义）。

示意（API 形状，不锁死实现）：

```ts
type FormInstallOptions = {
  readonly uiPath: string    // 推荐 "ui"
  readonly errorsPath: string // 推荐 "errors"
}

// install 的最小产物必须是可直接塞进 ModuleImpl.logics 的一段逻辑（ModuleLogic）
declare const TraitLifecycle: {
  install: <S>(module: unknown, opts: FormInstallOptions) => unknown
  Ref: {
    field: <S>(path: string) => FieldRef<S>
    list: <S>(path: string, listIndexPath?: ListIndexPath) => FieldRef<S>
    item: <S>(
      path: string,
      args: { readonly listIndexPath?: ListIndexPath; readonly index: number; readonly field?: string },
    ) => FieldRef<S>
    root: <S>() => FieldRef<S>
  }
}
```

说明：

- `TraitLifecycle.install` 必须发生在 **ModuleImpl/Runtime 作用域内**，因为 scoped validate 需要读取该模块的 StateTraitProgram/Graph/Plan 并对当前 state 执行；
- UI 层只负责 dispatch 领域 action（携带 FieldRef/ValidateRequest），不直接操作 `state.errors`。
