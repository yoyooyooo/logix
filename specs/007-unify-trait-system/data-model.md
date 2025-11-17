# Data Model: 007 Trait 系统统一（Kernel/Perf）×（Form/Query）×（可回放/可解释）

**Branch**: `007-unify-trait-system`  
**Source Spec**: `specs/007-unify-trait-system/spec.md`  
**Source Plan**: `specs/007-unify-trait-system/plan.md`  
**Source Research**: `specs/007-unify-trait-system/research.md`

> 作用：以“实体/关系/状态机/协议”视角，把 007 要固化的内核形状与 Form/Query 的领域落点统一成同一条可回放链路，便于实现者、Devtools、以及后续 `tasks.md` 拆分对齐。

---

## 1. 总览：统一链路（唯一事实源）

```text
Trait（内核：computed/source/link/check）
        │  （可选）
        ▼
StateTrait（支点 DSL：node/list/$root）
        │  编译为
        ▼
Program + DependencyGraph + Plan（可解释 IR）
        │  安装到
        ▼
ModuleRuntime / StateTransaction / EffectOp
        │
        ▼
state（values/errors/resources） + state.ui（touched/dirty/query-ui）
        │
        ▼
UI Adapter（订阅投影 + 事件派发）→ Devtools/Replay（按事件重赛）
```

强约束：

- 不引入第二套运行时：Form/Query 只是“领域糖 + 默认逻辑”，最终必须回落为同一套内核原语与同一条事务提交链路。
- 可回放事实源唯一：所有可见行为（资源结果、错误树、交互态、触发来源、失效请求）必须进入 `state`/`state.ui` 或可回放事件日志，UI 不得维护第二套不可回放状态。

---

## 2. Core IR：Rule / Spec / Program

### 2.1 Rule Kind（内核原语固定）

```ts
type TraitKind = "computed" | "source" | "link" | "check"
```

- `check` 是“写错误树”的语义糖：其执行/依赖/传播与 `computed` 同属一套图与事务语义。

### 2.2 FieldPath 与 deps（显式依赖）

```ts
type FieldPath = string

type Deps = ReadonlyArray<FieldPath>
```

约束：

- `computed/source/check` MUST 显式声明 `deps`，Graph/diagnostics/replay 只认 `deps` 作为依赖事实源。

### 2.3 Spec（编译前 DSL 形态）

概念：

- `StateTrait.node({...})`：在某个 scope（field/item/list/root）下声明 `computed/source/link/check`。
- `StateTrait.list({ item?, list? })`：数组字段一等公民，提供 item/list 两个可选 scope。

```ts
type StateTraitNodeSpec<Input, Ctx> = {
  readonly computed?: Record<
    FieldPath,
    {
      readonly deps: Deps
      readonly derive: (input: Input, ctx: Ctx) => unknown
    }
  >

  readonly link?: Record<
    FieldPath,
    {
      readonly from: FieldPath
    }
  >

  readonly source?: Record<
    FieldPath,
    {
      readonly resourceId: string
      readonly deps: Deps
      readonly key: (input: Input, ctx: Ctx) => unknown | undefined
      readonly concurrency?: "switch" | "exhaust"
      readonly triggers?: ReadonlyArray<
        "onMount" | "onValueChange" | "manual"
      >
      readonly debounceMs?: number
      readonly meta?: RuleMeta
    }
  >

  readonly check?: Record<
    string,
    {
      readonly deps: Deps
      readonly validate: (input: Input, ctx: Ctx) => ErrorPatch | undefined
      readonly meta?: RuleMeta
    }
  >
}

type StateTraitSpec<S> = Record<string, unknown> // 由 build 阶段归一化成 Entry
```

> 注：具体 TypeScript 类型以 `@logix/core` 实现为准；此处仅定义“数据模型边界”与关键字段。

### 2.4 Program（编译后 IR）

```ts
type TraitEntry = {
  readonly id: string
  readonly kind: TraitKind
  readonly target: FieldPath
  readonly deps: Deps
  readonly meta?: RuleMeta
  readonly impl: unknown
}

type Program = {
  readonly entries: ReadonlyArray<TraitEntry>
  readonly graph: DependencyGraph
  readonly plan: Plan
}
```

---

## 3. Dependency Graph：最小触发 / 反向闭包 / 拓扑批处理

### 3.1 Graph

```ts
type GraphNodeId = string

type GraphNode = {
  readonly id: GraphNodeId
  readonly entryId: string
  readonly target: FieldPath
}

type GraphEdge = {
  readonly from: FieldPath
  readonly to: FieldPath
  readonly kind: "dep" | "link"
}

type DependencyGraph = {
  readonly nodes: ReadonlyArray<GraphNode>
  readonly edges: ReadonlyArray<GraphEdge>
  readonly reverseAdj: ReadonlyMap<FieldPath, ReadonlyArray<FieldPath>>
}
```

约束：

- Graph MUST 同时支持 forward（用于传播顺序）与 reverse（用于 scoped validate 最小集合）。

### 3.2 Reverse Closure（scoped validate 最小集合）

```ts
type ReverseClosure = ReadonlySet<FieldPath>
```

- `ReverseClosure(target)` 包含所有“直接或间接依赖 target”的节点集合；
- validate(target) 的执行范围必须等于该集合（最小必要），不得退化为全量。

### 3.3 Plan（执行计划）

```ts
type PlanStep = {
  readonly id: string
  readonly entryId: string
  readonly kind: TraitKind
  readonly target: FieldPath
  readonly deps: Deps
}

type Plan = {
  readonly steps: ReadonlyArray<PlanStep>
}
```

执行策略（抽象）：

- Mark：把本次窗口需要执行的节点标记为 Pending（来自输入变更、validate 请求、source 触发等）。
- Sort：对 Pending 节点做拓扑排序（或稳定排序），保证确定性与可解释性。
- Flush：按顺序执行并收集 patch。
- Commit：将 patch 合并为一次事务提交（0/1 次可观察提交）。

---

## 4. StateTransaction：操作窗口与可观察提交

```ts
type TxnId = string

type StatePatch = {
  readonly path: FieldPath
  readonly from?: unknown
  readonly to?: unknown
  readonly reason: string
  readonly entryId?: string
  readonly stepId?: string
}

type StateTransaction<S> = {
  readonly txnId: TxnId
  readonly origin: { readonly kind: string; readonly name?: string }
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly patches: ReadonlyArray<StatePatch>
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
}
```

约束：

- 单窗口对外可观察提交次数必须为 0 或 1；
- 窗口内所有派生/校验/资源状态写回必须落在同一事务（同一 `txnId`）中，便于 Devtools 聚合解释；
- “超预算”（默认 200ms）触发软降级：基础字段提交，派生冻结为上一次稳定结果，并产出诊断标记影响范围。

---

## 5. Arrays：index 语义 × RowID 虚拟身份层

### 5.1 对外语义：index

- `items[i]` 仍是对外身份语义；
- 错误树与 UI 交互态树与 values 同构，以 index 对齐。

### 5.2 对内优化：RowID

```ts
type RowId = string

type ListIdentityMapping = {
  readonly ids: ReadonlyArray<RowId> // index -> RowId
}
```

约束：

- Graph/cache 节点可按 RowId 定位；
- 插入/删除/重排只更新 mapping，不强制整体节点失效；
- 可选 `identityHint/trackBy` 提供“稳定 identity”线索（仅优化，不改变对外语义）。

---

## 6. Error Tree 与 UI State（全双工同构）

### 6.1 ErrorTree

```ts
type ErrorLeaf = string | { readonly message: string; readonly code?: string }

type ErrorNode = {
  readonly $list?: ErrorLeaf
  readonly $item?: ErrorLeaf
  readonly [k: string]: ErrorNode | ErrorLeaf | undefined
}
```

约束：

- 结构同构：字段级错误落在对应字段叶子；列表级错误落在列表节点固定位置（例如 `$list`）；
- 清理语义：当 scope “无错误”时必须清理该 scope 的错误子树，避免残留。

### 6.2 UI State（touched/dirty 等）

```ts
type BoolTree = {
  readonly [k: string]: BoolTree | boolean | undefined
}
```

约束：

- 进入 `state.ui`（或等价专用子树），并以与 values 同构的布尔树表达；
- UI 不得维护第二套事实源。

---

## 7. Resource：快照状态机、keyHash、并发与同步 idle

### 7.1 ResourceSpec（IO 唯一入口）

```ts
type ResourceId = string
type ResourceSpec<Key, Out, Err> = {
  readonly id: ResourceId
  readonly keySchema: unknown
  readonly load: (key: Key) => unknown
}
```

### 7.2 ResourceSnapshot

```ts
type ResourceSnapshot<Key, Out, Err> =
  | { readonly status: "idle"; readonly key?: undefined; readonly data?: undefined; readonly error?: undefined }
  | { readonly status: "loading"; readonly key: Key }
  | { readonly status: "success"; readonly key: Key; readonly data: Out }
  | { readonly status: "error"; readonly key: Key; readonly error: Err }
```

约束：

- `keySelector` 返回 `undefined` 时必须同步写回 idle 并清空 data/error（避免 tearing）；
- 竞态门控：写回 success/error 前必须比较最新 `keyHash`，stale 结果必须丢弃；
- 并发策略至少支持 switch（只认最新）与 exhaust(trailing) 两种。

---

## 8. Query：对照领域（触发/缓存/失效/外部引擎）

### 8.1 QueryBlueprint 与 QuerySnapshot

```ts
type QueryId = string

type QuerySnapshot<Params, Out, Err> = {
  readonly params: Params
  readonly result: ResourceSnapshot<unknown, Out, Err>
  readonly lastTrigger?: { readonly kind: "onMount" | "onValueChange" | "manual" }
}
```

### 8.2 InvalidateRequest

```ts
type InvalidateRequest =
  | { readonly kind: "byResource"; readonly resourceId: string }
  | { readonly kind: "byParams"; readonly queryId: QueryId; readonly keyHash: string }
  | { readonly kind: "byTag"; readonly tag: string }
```

### 8.3 外部查询引擎（默认 TanStack Query）

数据模型层的边界：

- 外部引擎可提供：缓存、in-flight 合并、可选取消/重试；
- Logix 必须提供：keySchema/keyHash、触发/并发语义、写回门控、可回放事件与诊断解释；
- 外部引擎行为不得反向成为“对外语义事实源”。

DI 约束（全局 Runtime 注入）：

- `@logix/query` 暴露 `Query.Engine`（Effect Tag）作为运行时依赖；
- `@logix/query` 提供 `Query.Engine.layer(engine)` 便捷 Layer，用于宿主在全局 Runtime Layer 注入 Engine（默认 `Query.TanStack.engine(new QueryClient())`）；
- 同一 Runtime 作用域内 SHOULD 只有一个 Engine；跨 Runtime 作用域允许不同 Engine（缓存隔离），但 keyHash 门控与回放/诊断口径必须一致。

---

## 9. Replay & Diagnostics：事件日志与解释口径

### 9.1 Replay Log（事件溯源）

```ts
type ReplayEvent =
  | { readonly kind: "resource:loading"; readonly resourceId: string; readonly keyHash: string; readonly at: number }
  | { readonly kind: "resource:success"; readonly resourceId: string; readonly keyHash: string; readonly payload: unknown; readonly at: number }
  | { readonly kind: "resource:error"; readonly resourceId: string; readonly keyHash: string; readonly payload: unknown; readonly at: number }
  | { readonly kind: "query:invalidate"; readonly request: InvalidateRequest; readonly at: number }
```

约束：

- Replay Mode 下按事件重赛快照变化，不触发真实网络请求；
- 诊断信号与回放事件应共享同一套关键字段（resourceId/keyHash/txnId/trigger）。

### 9.2 Diagnostics

诊断需要回答：

- 本次窗口触发了哪些规则、哪些被跳过（等价）、最高成本的规则是谁；
- 对 Query：每次触发来源是什么、是否命中缓存/复用、为何丢弃 stale；
- 对降级：超预算/运行时错误影响范围与冻结点是什么。

---

## 10. TraitLifecycle：install / Ref / scoped validate / scoped execute / cleanup

> 作用：把“领域事件（Form/Query）”统一桥接到 Trait IR 的执行语义上，避免领域各自发明 glue，保证回放/诊断口径一致。

### 10.1 FieldRef（字段实例引用）

```ts
type FieldRef =
  | { readonly kind: "field"; readonly path: string }
  | { readonly kind: "list"; readonly path: string; readonly listIndexPath?: ReadonlyArray<number> }
  | { readonly kind: "item"; readonly path: string; readonly listIndexPath?: ReadonlyArray<number>; readonly index: number; readonly field?: string }
  | { readonly kind: "root" }
```

### 10.2 ValidateRequest

```ts
type ValidateMode = "submit" | "blur" | "valueChange" | "manual"

type ValidateRequest = {
  readonly mode: ValidateMode
  readonly target: FieldRef
}
```

### 10.3 ExecuteRequest（用于 Query/资源操作）

```ts
type ExecuteRequest =
  | { readonly kind: "source:refresh"; readonly target: FieldRef }
  | { readonly kind: "query:invalidate"; readonly request: InvalidateRequest }
```

### 10.4 CleanupRequest

```ts
type CleanupRequest =
  | { readonly kind: "field:unregister"; readonly target: FieldRef }
  | { readonly kind: "list:item:remove"; readonly target: FieldRef }
  | { readonly kind: "list:reorder"; readonly target: FieldRef }
```

### 10.5 TraitLifecycle.install（模块逻辑）

- `TraitLifecycle.install(module, opts)` 产出可直接挂到 `ModuleImpl.logics` 的逻辑；
- 在消费到领域事件时更新 `state.ui`，并发起 `ValidateRequest / ExecuteRequest / CleanupRequest`；
- 所有写入必须落在同一 Operation Window 的事务内（0/1 次可观察提交）。
