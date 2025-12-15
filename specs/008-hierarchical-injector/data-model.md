# Data Model: 008 层级 Injector 语义统一（Nearest Wins + Root Provider）

**Branch**: `008-hierarchical-injector`
**Source Spec**: `specs/008-hierarchical-injector/spec.md`
**Source Plan**: `specs/008-hierarchical-injector/plan.md`
**Source Research**: `specs/008-hierarchical-injector/research.md`

> 作用：以“实体/关系/解析模式/错误口径”视角，统一描述 008 的层级 injector 语义，便于 core/react 两侧实现与测试在同一事实源下对齐。

---

## 1. 总览：唯一解析链路（最小完备）

```text
Token（ModuleTag / ServiceTag）
        │
        │  ResolutionRequest（mode + entrypoint + startScope）
        ▼
Resolver（Nearest Wins + strict/global）
        │
        ├─ success → ResolutionResult（value + sourceScope）
        └─ failure → ResolutionError（diagnostic + fix suggestions）
```

核心约束：

- **最近 wins**：同一 Token 在多个层级存在时，默认解析必须选择最近一层（strict 模式）；不得静默跳到更远层级。
- **显式 root/global**：当调用方选择 root/global 语义时，解析必须稳定落在 root provider，不受更近 scope 覆盖影响。
- **多实例靠句柄而非 Tag**：Tag 不能表达“同模块多实例”的实例选择；`Root.resolve(ModuleTag)` 只表达 root 单例（如果提供了）；需要精确实例时必须传递显式实例句柄（`ModuleRuntime` / `ModuleRef`）。

---

## 2. Key Entities

### 2.1 Token

Token 是可被解析的依赖标识，至少包含两类：

- **ServiceToken**：`Context.Tag<Id, Service>`（effect 原生服务 Tag）。
- **ModuleToken**：`Logix.ModuleInstance<Id, Sh>`（同时也是 `Context.Tag`；用于解析 `ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>`）。

> 注：008 聚焦 ModuleToken 的“多实例/多 root”正确性；ServiceToken 在 effect 的 Context/Layer 语义下天然满足最近 wins。

### 2.2 Provider

Provider 描述“在某个 scope 内提供某个 Token 的值”的关系：

```ts
type Provider = {
  readonly token: unknown
  readonly scope: ScopeId
  readonly kind: 'service' | 'module-runtime'
}
```

- Service provider 通常来自 Layer（`Layer.succeed(Tag, impl)` 等）。
- Module runtime provider 通常来自 Module 的 live Layer（`module.live(...)`）或 root runtime 组合层（`Runtime.make` 等）。

### 2.3 Scope / Injector

Scope 是 provider 的归属边界；injector 是“在该边界内解析 Token 的能力”。

```ts
type ScopeKind =
  | 'root' // root runtime provider 的 Env/Context（每棵运行时树独立）
  | 'instance' // 某个 local module instance 的 scope（含其 imports）
  | 'unknown'

type ScopeId = string // 诊断友好：可由 moduleId/runtimeId/key 等拼出

type Injector = {
  readonly id: ScopeId
  readonly kind: ScopeKind
}
```

`ImportsScope`（实例 scope 的“模块 injector”）：

```ts
type ImportsScope = {
  readonly kind: 'imports-scope'
  readonly id: ScopeId
  readonly get: (module: ModuleToken) => unknown | undefined
}
```

现实映射（代码事实对齐）：

- root scope：由 AppRuntime/Runtime.make 组装得到的 root Env/Context（每棵运行时树一份，不跨 root），并通过 RootContextTag 供 `Root.resolve` 读取。
- instance scope：由 core 在构造 `ModuleRuntime` 时捕获并保存“imports-scope 的 injector”（下文称 `ImportsScope`），用于解析该实例 scope 内的 **ModuleToken → ModuleRuntime**。
  - 约束：`ImportsScope` **不得**持有完整的 `Context`（避免把 root/base services 一并引用导致内存压力）；只保留与“子模块解析”相关的最小信息（模块 runtime 映射）。
  - 生命周期：与该实例 scope 绑定；在 `Scope.close` 后必须释放引用（避免 React 卸载/HMR 场景泄漏）。
  - React 侧不再维护外部 registry，而是从 `parentRuntime` 读取 `ImportsScope` 来解析 `imports.get` / `useImportedModule`（strict）。

### 2.4 ResolutionRequest / Mode / Entrypoint

```ts
type ResolutionMode =
  | 'strict' // 必须在 startScope 内命中；缺失即失败
  | 'global' // 显式 root/global：必须从 root scope 解析（忽略更近 override）

type ResolutionEntrypoint =
  | 'react.imports.get'
  | 'react.useImportedModule'
  | 'react.useModuleTag'
  | 'logic.$.use'
  | 'logic.link.make'
  | 'logic.root.resolve'
  | 'internal'

type ResolutionRequest = {
  readonly token: unknown
  readonly mode: ResolutionMode
  readonly entrypoint: ResolutionEntrypoint
  readonly startScope: Injector
  readonly rootScope: Injector
}

// 约束：rootScope 表示“当前 runtime 树的 root provider”，不受 React RuntimeProvider.layer 等局部 override 影响。
```

> 约束补充：React 的 `react.imports.get` / `react.useImportedModule` 不暴露 `global` 选项，固定为 strict（只解析 host 的 imports-scope）；root/global 单例语义统一由 `logic.root.resolve`（以及 React 侧的 `runtime.run*` 执行）承担。

### 2.5 ResolutionResult / SourceScope

```ts
type ResolutionResult = {
  readonly value: unknown
  readonly sourceScope: Injector
  readonly diagnostics?: {
    readonly tokenId?: string
    readonly moduleId?: string
    readonly runtimeId?: string
  }
}
```

关键不变量：

- strict：`sourceScope.id` 必须等于 `startScope.id`（或其等价“最近 wins”层级）；不得落到 rootScope。
- global：`sourceScope.kind` 必须是 `root`；且不受更近 scope 覆盖影响。

### 2.6 ResolutionError（诊断与修复建议）

```ts
type ResolutionError = {
  readonly name: 'MissingModuleRuntimeError' | 'MissingImportedModuleError' | 'AmbiguousModuleInstanceError'
  readonly message: string
  readonly request: {
    readonly tokenId?: string
    readonly entrypoint: ResolutionEntrypoint
    readonly mode: ResolutionMode
    readonly startScopeId?: string
    readonly rootScopeId?: string
  }
  readonly fix: ReadonlyArray<string>
}
```

约束：

- dev 环境 message 可多行（包含 fix 列表）；prod 环境 message 保持短且稳定。
- fix 至少包含两条“可执行动作”（例如“补 imports”“改用 global 模式”“把实例句柄透传到子组件”）。

---

## 3. Link（跨模块胶水逻辑）

> Link 是“显式跨模块协作”的承载体：它不是 token，也不是解析模式；它是一段会被 Runtime 统一 fork 的长期流程（Effect）。

### 3.1 LinkId / LinkConfig

```ts
type LinkId = string

type LinkConfig = {
  readonly id?: LinkId
  readonly modules: ReadonlyArray<ModuleToken>
}
```

约束：

- `modules` 是显式依赖清单：便于工具链/IR/Devtools 理解“这段胶水触达了哪些模块”。
- Link 的运行时解析完全依赖其被 fork 时所在的 Env（Nearest Wins）；不得引入任何“按 Tag+key 全局查找实例”的隐式魔法。

### 3.2 LinkHandle / LinkHandles

```ts
type LinkHandle = {
  readonly read: <A>(selector: (s: any) => A) => Effect.Effect<A, never, never>
  readonly changes: unknown // 运行时 Stream（与 ModuleRuntime.changes 同构）
  readonly dispatch: (action: any) => Effect.Effect<void, any, any>
  readonly actions$: unknown // 运行时 Stream（与 ModuleRuntime.actions$ 同构）
  readonly actions: Record<string, (payload: any) => Effect.Effect<void, any, any>>
}

// key 来自 Module.id（字符串），Link.make 会把 modules 变为 record 并注入到逻辑中
type LinkHandles = Record<string, LinkHandle>
```

语义边界：

- `$.use(ModuleTag)`：用于“父模块实例 scope 下访问 imports 子模块”（strict 默认）。
- `Link.make`：用于“显式跨模块胶水逻辑/IR 承载”（process 形式）；它并不替代 imports 关系，也不用于实例选择。
