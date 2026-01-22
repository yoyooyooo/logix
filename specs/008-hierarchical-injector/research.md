# Research: 008 层级 Injector 语义统一（Nearest Wins + Root Provider）

**Branch**: `008-hierarchical-injector`  
**Source Spec**: `specs/008-hierarchical-injector/spec.md`  
**Source Plan**: `specs/008-hierarchical-injector/plan.md`

> 目标：把 008 的“对外行为约束”（最近 wins + strict 默认 + root provider）落到一组可实现、可验证、可交接的技术决策上，并为 Phase 1 的 `data-model.md / contracts/* / quickstart.md` 提供依据。

## 0. 现状盘点（代码事实）

### 0.1 Core：Bound API 解析存在全局注册表回退

- `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
  - `resolveModuleRuntime(tag)` 的优先级是：
    1. `Effect.serviceOption(tag)`（当前 Effect Env/Context）；
    2. `ModuleRuntime.getRegisteredRuntime(tag)`（全局运行时注册表回退）。
  - 变更前：`$.use(ModuleTag)`（以及历史上的 `$.useRemote(ModuleTag)`）都依赖 `resolveModuleRuntime`：即在“缺失提供者/装配错误”时，可能拿到来自其他 scope（甚至其他 root）的 runtime。
- 影响：当同一模块存在多实例（key）或同一进程存在多 root runtime 时，全局回退会制造“看起来能跑、实际上串实例”的隐性 bug（与 008 P1 冲突）。

### 0.2 Core：全局注册表是单槽（tag→runtime），无法表达多实例/多 root

- `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
  - `runtimeRegistry: WeakMap<Tag, Runtime>`：同一 Tag 只能对应一个 runtime。
  - 多实例/多 root 并存时，后注册的 runtime 会覆盖先注册的 runtime；这使得“按 Tag 查 runtime”在语义上不成立。
- 结论：全局 tag→runtime 注册表不能作为“正确性语义”的基础，只能作为 devtools/内部调试的辅助手段（且需要避免跨 root 污染）。

### 0.3 React：imports-scope 下沉到 core（实例自带 `ImportsScope`）

- core：`ModuleRuntime` 在构造时捕获该实例 scope 的 `ImportsScope`（只包含 **ModuleToken → ModuleRuntime** 映射，不持有完整 `Context`），并挂到 runtime 上（`__importsScope`）。
- react：`host.imports.get(Child.module)` / `useImportedModule(host, Child.module)` 在 strict 模式下只读取 `parentRuntime.__importsScope` 解析子模块；缺失提供者时抛结构化错误并给出可执行 fix（008 P3）。
- 备注：imports API strict-only；不再提供 `mode:"global"` 分支。root/global 单例语义统一使用 `Root.resolve(Tag)`，以确保不受 `RuntimeProvider.layer` 的局部 override 影响。

## 1. Decisions

### D01 — strict 默认：Module runtime 解析不得静默回退到全局注册表

**Decision**: 对“模块 runtime（ModuleTag）”的解析，默认只允许在“当前实例 scope”内解析（strict），缺失提供者时必须失败并给出修复建议；禁止默认回退到全局 tag→runtime 注册表。  
**Rationale**: 多实例/多 root 下，全局回退在语义上无法正确，属于高危隐性 bug 源；与 008 P1/P3 直接冲突。  
**Alternatives considered**:

- 保留回退但只在 dev 下告警：仍然可能在生产串实例，且行为不可预测；
- 保留回退但尝试“猜对”实例：缺乏可靠判据，会引入更多不透明魔法。

**Implementation note**:

- 移除 fallback 后，`$.use(ModuleTag)` 应尽量对齐 effect 原语：等价于 `yield* ModuleTag` / `Effect.service(ModuleTag)` 的解析语义；缺失提供者时，让 effect 的缺失语义自然发生，再在边界统一包装为 `MissingModuleRuntimeError`（并补齐 008 诊断字段与 fix 建议）。

### D02 — root provider 必须“显式选择”，不得隐式挟持 strict 入口

**Decision**: root 单例（root provider）作为一种语义必须显式选择（例如 `Root.resolve(Tag)` 或等价入口），且在 strict 语义下即使 root 有提供者也不得被隐式使用。  
**Rationale**: strict 的价值在于把“作用域边界”变成可验证约束；隐式把 root 当兜底会让边界失效。  
**Alternatives considered**:

- strict 缺失时自动降级 root：短期 DX 省事，但长期导致串实例与不可解释行为。

### D03 — 最近 wins（Nearest Wins）：从当前 scope 起点解析，允许向父回溯但不跨 root

**Decision**: 解析顺序固定为“从当前实例 scope 起点出发，按层级向外回溯；同一 token 多处存在时选择最近一层”；回溯不得跨越 root runtime 边界。  
**Rationale**: 最近 wins 是多层 injector 的最小可预测规则；跨 root 回溯会破坏隔离与可复现性。  
**Alternatives considered**:

- 只认最近，不允许回溯：会让 root provider 失去意义；
- 允许跨 root：会造成“两个应用互相串 runtime”的灾难级隐患。

### D04 — 多实例可解释：Tag 不能表达“同模块多实例”，必须要求显式实例句柄

**Decision**: 只凭 `ModuleTag` 无法可靠定位“同模块多实例”的某一份实例；因此任何需要精确实例的场景，必须通过显式实例句柄（例如 `ModuleRef/ModuleRuntime`）传递或在边界处 resolve 后透传；不得新增“按 Tag + key 全局查找”的隐式魔法。  
**Rationale**: 与 effect 的 Context/Tag 模型保持一致；避免引入第二套 DI 与新的隐式缓存层。  
**Alternatives considered**:

- 新增全局 registry：`(moduleId,key) -> runtime`：语义更复杂、回收/隔离更难、容易再次跨 root 污染；
- 自动把 key 编进 Tag：会扩大 API 表面积并引入大量“动态 Tag”管理成本。

### D05 — 错误诊断口径统一：入口同构、字段齐全、prod 精简

**Decision**: 解析失败错误在 Logic/React 两侧保持同构字段与修复建议：包含请求 token、入口（Logic/React）、当前 scope 标识（moduleId/instanceId/key/parentId）、以及最少两条可执行修复路径；prod 环境保持短消息与稳定 error name。  
**Rationale**: 这是把“严格语义”落到可用 DX 的关键，否则开发者会用更隐蔽的方式绕开约束。  
**Alternatives considered**:

- 只抛通用 `Error("not found")`：无法自助修复，导致错误长期存在；
- prod 也输出长错误：影响性能与日志噪音，不符合宪章“诊断默认接近零成本”。

### D06 — 统一入口语义：`$.use`、`imports.get`、`useImportedModule` 必须等价

**Decision**: 对“解析一个被 imports 提供的子模块 runtime”这件事，Logic 侧 `$.use(ChildModule)`、React 侧 `host.imports.get(ChildModule)` 与 `useImportedModule(host, ChildModule)` 的 strict 行为必须一致；root/global 单例语义统一通过 `Root.resolve(Tag)`（而不是把 global 挂在 imports API 上）。  
**Rationale**: 入口差异会让用户形成“靠碰运气的经验法则”，造成 API 心智负担与错误复用。  
**Alternatives considered**:

- 允许不同入口不同规则：短期实现更容易，但长期会放大错误与文档负担。

### D09 — 收敛跨模块协作入口：删除 `$.useRemote`，统一为 `Link.make`

**Decision**: 跨模块协作（读取对方 state、监听变化、触发对方 actions）的默认入口只保留 `Link.make`；`$.useRemote` 不再作为公共 API 暴露并将被删除。  
**Rationale**: 与 `docs/ssot/handbook/reading-room/reviews/02-mental-model-and-public-api.md` 的结论一致：双入口会导致“等价写法分裂”，且 `useRemote` 更容易被误用为隐式解析兜底。  
**Migration shape**:

- 若目标模块实际上是“父模块 imports 的子模块”：用 `$.use(Child.module)` / `imports.get(Child.module)` 代替 `$.useRemote`（strict 默认，缺失提供者即失败）。
- 若目标模块不在 imports 关系中且属于“跨模块胶水逻辑”：将协作逻辑提升为显式 `Link.make(...)`（process），并挂到 root 模块的 `processes` 中；示例在 `specs/008-hierarchical-injector/quickstart.md`。
  **Alternatives considered**:
- 同时保留但分层：仍会带来协作分裂与长期维护成本；
- 保留 `$.useRemote` 删除 `Link.make`：会削弱工具链/IR 承载的表达能力与可解释性边界。

### D07 — 全局注册表的定位下调：仅用于内部调试，不作为语义兜底

**Decision**: `ModuleRuntime` 的全局注册表不再承载“正确性语义”，仅允许用于 devtools/内部调试定位；对外解析不得依赖它作为兜底。  
**Rationale**: 单槽注册表与多实例/多 root 不相容；将其定位下调能减少误用面。  
**Alternatives considered**:

- 继续把注册表当“方便的兜底”：会持续制造串实例。

### D08 — 迁移策略：以错误暴露误用，用文档/示例迁移替代兼容层

**Decision**: strict 默认会把历史误用暴露为错误（breaking）；不保留兼容层与 deprecation 期，迁移用“修复建议 + 文档 + 示例”承接。  
**Rationale**: 本仓拒绝向后兼容；并且“误拿到别的实例”属于必须尽快消灭的错误类型。  
**Alternatives considered**:

- 加兼容层：会长期保留危险路径，阻碍体系收敛。

### D10 — imports-scope injector 下沉到 core：实例自带 `ImportsScope`，React 不再维护外部 registry

**Decision**: 由 core 为每个模块实例 scope 构造并保存一个“imports-scope 的 injector”（`ImportsScope`），作为实例自带的最小可解释依赖：它只用于解析该 scope 内的 **ModuleToken → ModuleRuntime**，不得持有完整 `Context`（避免把 root/base services 一并引用造成内存压力）。React 的 `useImportedModule/host.imports.get` 在 strict 模式下只读取该实例的 `ImportsScope` 来解析子模块，不再维护 `ImportedModuleContext.ts` 的 WeakMap registry。  
同时，React 侧不在 imports API 上提供 `global` 选项；root/global 单例语义统一使用 `Root.resolve(Tag)`（通过 `runtime.run*` 执行），以保证不受 `RuntimeProvider.layer` override 影响。  
**Rationale**: imports-scope 是 runtime 实例的固有属性，不应依赖 React 的进程级桥接；把 `ImportsScope` 生命周期绑定到 Scope（close 即清理）更安全、更可解释，也与 008 的 rootContext / `Root.resolve` 语义同构。  
**Alternatives considered**:

- 保留 React registry：会把“实例作用域”变成 React 私货，且更难在非 React 入口复用；也更容易引入泄漏与跨 root 污染的误用面。
- 新增全局 (moduleId,key)->runtime registry：会再次引入隐式兜底与回收/隔离复杂度，违背 strict by default。
