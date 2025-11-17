# Reference: StateTrait Core (Spec → Program)

> 作用：细化 `StateTrait` 内核的类型与实现边界，为 Phase 1（StateTrait 内核）提供可直接映射到代码结构的设计说明。  
> 对应 spec：FR-001 ~ FR-004、FR-012，Key Entities 中的 StateTraitSpec / StateTraitProgram / StateTraitGraph / StateTraitPlan。

---

## 1. API 入口与命名空间

- 外部唯一入口：`StateTrait` 命名空间，由 `packages/logix-core/src/StateTrait.ts` 导出：

  ```ts
  export namespace StateTrait {
    function from<S>(schema: Schema.Schema<S, any>): (spec: StateTraitSpec<S>) => StateTraitSpec<S>

    function build<S>(
      schema: Schema.Schema<S, any>,
      spec: StateTraitSpec<S>,
    ): StateTraitProgram<S>

    function install<S>(
      $: BoundApi<S, any>,
      program: StateTraitProgram<S>,
    ): Effect.Effect<void>

    // DSL 组合子：统一声明形状（node/list/$root），build 时展开为标准 entries
    function node<Input, Ctx>(
      spec: StateTraitNodeSpec<Input, Ctx>,
    ): StateTraitNode<Input, Ctx>

    // 语法糖：便于 Module 图纸书写
    function computed<S, P extends StateFieldPath<S>>(
      derive: (state: Readonly<S>) => unknown,
    ): StateTraitEntry<S, P>

    // 语义糖：校验本质仍是 computed（写入 errors/诊断子树），不引入新的运行时 kind
    function check<S, P extends StateFieldPath<S>>(
      validate: (state: Readonly<S>) => unknown,
    ): StateTraitEntry<S, P>

    function source<S, P extends StateFieldPath<S>>(meta: {
      resource: string
      key: (state: Readonly<S>) => unknown
    }): StateTraitEntry<S, P>

    function link<S, P extends StateFieldPath<S>>(meta: {
      from: StateFieldPath<S>
    }): StateTraitEntry<S, P>

    // 数组一等公民：DSL 层的 list node，build 时会展开为标准 Program/Graph/Plan（computed/source/link 步骤）
    function list<S, TItem>(
      spec: StateTraitListSpec<S, TItem>,
    ): StateTraitListNode<S, TItem>
  }
  ```

- 内部实现拆分：
  - `internal/state-trait/model.ts`：核心类型定义与纯数据结构（不含逻辑），与 `data-model.md` 中的实体保持对齐；
  - `internal/state-trait/field-path.ts`：`StateFieldPath` / `StateAtPath` 等类型工具与相关实现；
  - `internal/state-trait/build.ts`：从 `stateSchema + spec` 构造 StateTraitProgram/Graph/Plan 的纯函数入口；
  - `internal/state-trait/install.ts`：从 Program 构造具体行为（Phase 1 可先直接基于 `$` 安装 watcher，不依赖 EffectOp 总线，后续 Phase 再调整为通过 EffectOp/Middleware 执行）。

---

## 2. StateFieldPath / StateAtPath 实现要点

### 2.1 目标

- 在 TS 层为 `StateTrait.from(StateSchema)({...})` 提供：
  - key 的自动补全与错误检查（仅允许合法路径，如 `"profile.name"`）；  
  - 每个路径对应字段类型的推导（用于约束 computed/linked 字段类型）。

### 2.2 实现建议（类型层）

- `StateFieldPath<S>`：
  - 基于条件类型与模板字符串递归展开对象结构；
  - 初版可限定：
    - 仅展开 `Schema.Struct` / `Schema.Tuple` / 简单嵌套对象；
    - 对数组字段必须支持 `items[]` 段的“任意元素”路径（例如 `"items[].amount"`），并与 `StateTrait.list` 的 item/list 两种 scope 语义保持一致；Map/Set 等仍可先视为叶子字段；
  - 为避免 TS Server 性能问题，在实现中设置最大路径深度（例如 3~4 层）。

- `StateAtPath<S, P>`：
  - 通过 `P extends \`${K}.${Rest}\`` 模式匹配递归取类型；
  - 对不存在的路径返回 `never`，以触发类型错误。

> 具体类型实现细节由 `internal/state-trait/field-path.ts` 提供，并在 data-model 中保持文档同步。

---

## 3. StateTraitSpec / StateTraitEntry 设计

### 3.1 StateTraitSpec<S>

- 定义：

  ```ts
  type StateTraitSpec<S> =
    & {
        [Path in StateFieldPath<S>]?: (
          | StateTraitEntry<S, Path>
          | StateTraitNodeSpec<any, any>
          | StateTraitListSpec<S, any>
        )
      }
    & {
        // 保留键：根级 node（跨字段/跨列表规则）
        readonly $root?: StateTraitNodeSpec<Readonly<S>, RootCtx<S>>
      }
  ```

- 约束：
  - 仅允许在现有字段路径上声明 Trait（路径错误在编译期报错）；
  - spec 本身不要求所有字段都有 Trait，Raw 字段无需显式声明；
  - `node/list/$root` 都是 DSL 组合子：build 阶段必须展开为等价的 `StateTraitEntry` 列表（computed/source/link，以及写 errors 的 check），Runtime/Devtools 只感知展开后的 kernel。

补充：node/list 的最小形态（概念）：

```ts
type RootCtx<S> = { readonly state: Readonly<S> }

type StateTraitNodeSpec<Input, Ctx> = {
  computed?: Record<string, ((input: Input, ctx: Ctx) => unknown) | Record<string, (input: Input, ctx: Ctx) => unknown>>
  check?: ((input: Input, ctx: Ctx) => unknown) | Record<string, (input: Input, ctx: Ctx) => unknown>
  source?: Record<string, { resource: string | { id: string }; key: (input: Input, ctx: Ctx) => unknown | undefined }>
  link?: Record<string, { from: string }>
}

type StateTraitListSpec<S, TItem> = {
  kind: "list"
  path: StateFieldPath<S>
  item?: StateTraitNodeSpec<TItem, any>
  list?: StateTraitNodeSpec<ReadonlyArray<TItem>, any>
}
```

### 3.2 StateTraitEntry<S, P>

- 定义（概念）：

  ```ts
  interface StateTraitEntry<S, P extends StateFieldPath<S>> {
    readonly fieldPath: P
    readonly kind: "computed" | "source" | "link"
    readonly meta: ComputedMeta<S, P> | SourceMeta<S, P> | LinkMeta<S, P>
  }
  ```

- 关键约束：
  - `computed.meta.derive` 必须是纯函数，只读访问 `Readonly<S>`，不访问 Env/Service；
  - `source.meta` 中只允许出现 `resourceId` 与 `key(state)`，不嵌入具体 HTTP/DB 调用；
  - `link.meta.from` 受 `StateFieldPath<S>` 约束，首版仅支持单向 link。

---

## 4. Program / Graph / Plan 构造（build 阶段）

### 4.1 StateTraitProgram<S>

- 构造函数签名（概念）：

  ```ts
  function makeProgram<S>(
    schema: Schema.Schema<S, any>,
    spec: StateTraitSpec<S>,
    graph: StateTraitGraph,
    plan: StateTraitPlan,
    meta?: ProgramMeta,
  ): StateTraitProgram<S>
  ```

- `StateTrait.build` 的职责：
  - 校验 spec 与 schema 一致（不存在的字段路径、类型不匹配等）；
  - 从 spec 构建 `StateTraitField` / `StateTraitFieldTrait` 集合；
  - 构建 Graph（节点/边）：
    - computed/link/source-dep 边；
    - 检测并报错 link/computed 环；
  - 基于 Graph 构建 Plan：
    - 对 computed：生成 `computed-update` 步骤；
    - 对 link：生成 `link-propagate` 步骤；
    - 对 source：生成 `source-refresh` 步骤；
  - 返回 `StateTraitProgram<S>`。

### 4.2 build 的纯函数约束

- `StateTrait.build` 必须：
  - 不访问任何全局可变状态、不依赖 Env/Layer；
  - 对于相同输入（schema + spec）始终产生相同 Program；
  - 失败时仅通过抛出错误或返回结构化错误对象，不做 I/O。
- 目的：
  - 使 build 逻辑可以在 Studio/Parser 中直接复用（或通过编译为 WASM）；  
  - 避免 Studio 侧重新实现一套「Trait → Graph」解析规则。

---

## 5. install 阶段（Phase 1 视角）

> 完整的 EffectOp 集成见 `effectop-and-middleware.md`，本节只描述 Phase 1 中 StateTrait.install 的最小目标。

### 5.1 最小职责

- 在 Bound API `$` 上：
  - 为 computed 字段注册 watcher：当依赖字段变化时，重新计算并更新目标字段；
  - 为 link 字段注册 watcher：当源字段变化时，将值写入目标字段；
  - 为 source 字段预留刷新入口（例如暴露 `$.traits.source.refresh(field)` 之类的标准加载函数，后续由 Middleware/EffectOp 接管）；在 v001 中，source-refresh 仅在该显式入口被调用时执行，不在模块挂载或任意 State 变化时隐式触发（详见 FR-019）。

### 5.2 与 Runtime 的耦合点

- StateTrait.install 不直接持有 Runtime 引用，仅通过 `$`（Bound API）与内部工具函数完成：
  - 订阅状态变化（`$.onState` 或等价 API）；
  - 更新状态（`$.state.update` 或等价 API）；
  - 发起占位的外部调用（后续由 EffectOp 层接管）。

### 5.3 Phase 2 过渡

- 在 Phase 2 中，StateTrait.install 将从“直接 watcher + 更新”迁移到：
  - 基于 Plan 构造 EffectOp；
  - 通过 Middleware 总线执行；
  - 将 Debug/Devtools 能力统一挂在 EffectOp 上。
- 设计时需避免在 Phase 1 中写死与 EffectOp 无关的内部通道，以便迁移成本最小。

---

## 6. 测试与验证建议（针对 StateTrait 内核）

- 单元测试：
  - `StateFieldPath` 与 `StateAtPath` 在典型 StateSchema 上的推导结果；
  - StateTrait.build 对各种合法/非法 spec 的行为（成功构建 / 抛错）；
  - link 环检测与错误信息完整性。
- 集成测试：
  - 在一个小模块上，使用 StateTraitSpec 声明 computed/link/source，验证：
    - Program/Graph/Plan 结构符合预期；
    - install 后行为与预期一致（至少在 Phase 1 使用简单 watcher/更新逻辑）。
