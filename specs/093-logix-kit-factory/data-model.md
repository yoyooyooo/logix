# Data Model: Logix Kit Factory（语法糖机器）

> 本文描述 Kit 的“最小结构模型”（纯组合、无副作用），用于对齐实现与文档，避免概念重叠与语义漂移。

## 1) 基础实体

### 1.1 ServiceKit（基于 `Context.Tag` 的端口 kit）

ServiceKit 是 `Kit.forService(tag)` 的返回物，用于把一个稳定端口（Tag）接到不同入口：

```ts
type ServiceKit<Tag> = {
  readonly tag: Tag
  readonly layer: (service: ServiceOf<Tag>) => Layer.Layer<Tag, never, never>
  readonly use: ($: BoundLike) => Effect.Effect<ServiceOf<Tag>, never, any>
  readonly input: <T>(pick: (svc: ServiceOf<Tag>) => ExternalStore<T>) => InputKit<T>
}
```

语义边界：

- 仅做组合：`layer = Layer.succeed(tag, service)`，`use = $.use(tag)`，`input = ExternalStore.fromService(tag, pick)`。
- **禁止**：在 kit 创建时调用 `pick()` 或触发订阅（`subscribe`）。

### 1.2 InputKit<T>（外部输入 kit）

InputKit 代表一个外部输入源（ExternalStore），以及把它接到 StateTrait 的标准化写法：

```ts
type InputKit<T> = {
  readonly store: ExternalStore<T>
  readonly externalTrait: <S, P extends StateFieldPath<S>>(opts?: {
    readonly select?: (snap: T) => StateAtPath<S, P>
    readonly equals?: (a: StateAtPath<S, P>, b: StateAtPath<S, P>) => boolean
    readonly coalesceWindowMs?: number
    readonly priority?: "urgent" | "nonUrgent"
    readonly meta?: TraitMeta
  }) => StateTraitEntry<S, P>
}
```

语义边界：

- 读侧真相源仍属于宿主/上游模块；InputKit 只是提供 “写回 state graph 的声明”。
- `externalTrait` 等价展开到 `StateTrait.externalStore({ store, ... })`，并继承 073 的 external-owned 纪律。
- `meta` 不承诺“原样进入 Root IR”：Static IR 导出时会按 `TraitMeta.sanitize` 白名单裁剪（不在白名单内的字段会被忽略）。

#### TraitMeta（可导出 meta 白名单，Slim JSON）

事实源：`packages/logix-core/src/internal/state-trait/meta.ts`（`TraitMeta` + `sanitize`）。

```ts
type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

type TraitMeta = {
  readonly label?: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly group?: string
  readonly docsUrl?: string
  readonly cacheGroup?: string
  readonly canonical?: boolean
  /**
   * 仅接受 `x-*` keys；值必须是 JsonValue（函数/闭包会被裁剪掉，且不会进入 Root IR）。
   */
  readonly annotations?: Readonly<Record<string, JsonValue>>
}
```

### 1.3 ModuleInputKit（Module-as-Source）

`Kit.forModule(module, readQuery)` 直接产出一个 `InputKit<V>`：

- `store = ExternalStore.fromModule(module, readQuery)`
- 约束：`selectorId` 必须稳定；否则 fail-fast（复用 073 的门禁）

## 2) Identity（稳定标识）

Kit 相关的稳定标识必须来自既有合同（不平行定义）：

- `serviceId`：由 `Workflow.call({ service: Tag })` / `Workflow.callById({ serviceId })` 确定（遵守 `specs/078`）。
- `storeId`：由 `ExternalStore` 的 descriptor 计算（例如 `{ kind: 'service', tagId }`）。
- `selectorId`：来自 `ReadQuery.make/compile` 的 stable lane（禁止 `unstableSelectorId`）。
- `stepKey`：Workflow step 的稳定锚点，必须显式传入或由上层确定性生成（Kit v1 不做隐式补全）。

## 3) 命令端口（Command Port）口径

Kit 不定义新的命令协议；推荐把“写侧”建模为服务方法（Effect）：

```ts
type CommandPort<I> = (input: I) => Effect.Effect<void, never, any>
```

并由业务 logic 在事务外触发，再由外部输入（ExternalStore）写回状态图，保证：

- 事务窗口禁 IO；
- 单一真相源（UI 只读 Logix state；外部源只作为 input）；
- 可解释链路（Workflow/EffectOp 可追踪）。
