# Research: Module（定义对象）+ ModuleTag（身份锚点）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/022-module/spec.md`

## Decisions

### 1) Module 选择“定义对象（wrap）”，旧 Module 更名为 ModuleTag（方案 A）

**Decision**: Module 是一个领域模块“定义对象”（wrap），内部复用既有 `ModuleTag`（Tag identity）与 `ModuleImpl`（可装配蓝图），并额外携带领域扩展（例如 controller）与 fluent 组合能力；`actions` 语义复用模块 action tags（`ModuleHandle.actions`），不引入第二套同名 actions。

**Rationale**:

- 旧 `Module` 的身份等价于 Tag identity；若让新 Module（定义对象）自身成为 Tag，本质上会引入“再造身份”的风险，导致多实例与诊断锚点混淆。
- fluent（`withLogic/withLayers`）需要不可变返回“新对象”；对 Tag 做不可变会逼迫每次都创建新 Tag（身份不稳定）或走 mutative builder（共享引用副作用）。
- 包装方案可以保持“领域对象统一形状”与“运行时身份稳定”同时成立，并天然支持迁移期逐步替换。

**Alternatives considered**:

- Module 直接 `extends Context.Tag`：链式组合与稳定 identity 难同时满足。
- Module 原地 mutate：难以在并行开发/复用场景保证无副作用，且难诊断。

### 2) 维持 `.logic()` 的既有语义：只产出逻辑值

**Decision**: Module 的 `logic(build)` 与旧 `Module.logic(build)`（即 `ModuleTag.logic(build)`）语义保持一致：仅产出可复用的逻辑单元（值）；“挂载到可运行形态”通过 `withLogic/withLogics` 完成。

**Rationale**:

- 现有 `Module.logic` 已被心智模型与文档固定为“产生 `ModuleLogic` 值”；改为返回蓝图会引入不一致与误用成本。
- 把“定义”与“挂载”拆开后，Module 可以同时支持：复用逻辑值、组合逻辑集合、以及不可变的蓝图构建。

**Alternatives considered**:

- `.logic()` 返回 Module：链式很爽，但与现有语义冲突；并且会掩盖“这只是逻辑值还是已经装配可运行蓝图”的边界。

### 3) `$.use(...)` 支持直接消费 Module（拆壳规则必须显式）

**Decision**: 允许 `yield* $.use(module)`，等价于 `yield* $.use(module.tag)`；拆壳规则以显式的 Module 结构契约实现（例如 `_kind` + `tag` 字段），不依赖随机的 duck-typing 或散落 magic 字段。

**Rationale**:

- 目标是让“只创建一个 Form/CRUD 领域对象也能像 module/logic 那样玩”，降低样板（不再显式 `.tag`；旧蓝图是 `.module`）。
- `BoundApi.use` 是核心路径之一：拆壳判定必须 O(1) 且可控；显式契约更利于类型、诊断与长期演进。

**Alternatives considered**:

- 仅提供 `module.tag`：更保守但不满足“免拆壳”的关键用户体验目标。
- 通过 `Context.isTag(module)` 伪装为 Tag：会回到身份问题与不可变问题。

### 4) 领域扩展（controller 等）暴露复用既有 handle extend 机制（Symbol 协议）

**Decision**: 领域扩展（例如 controller）通过既有 `Symbol.for(\"logix.module.handle.extend\")` 机制挂到 `$.use(...)` 返回的 handle 上；同时 `actions` 保持为 `ModuleHandle.actions`（模块 action dispatchers）的语义，不引入第二套同名 actions。

**Rationale**:

- 现有 Form 已通过该机制把 `controller` 注入到 `$.use(Form.module)` 的返回值上；Module 扩展应复用这一协议，避免引入第二套“领域 handle 真相源”，同时避免覆盖/重载 `actions` 的既有语义。
- 该机制是 O(1) 的扩展点，且只在 `$.use` 路径触发，便于做性能与诊断约束。

### 4.1) 在 Module.logic 中提供 `$.self`（获取当前 ModuleHandle）

**Decision**: 在 `Module.logic(build, { id? })` 传入的 Bound API `$` 上提供 `$.self`，用于在本模块逻辑内直接获取当前 Module 的句柄（等价于 `yield* $.use(module)`）。

**Rationale**:

- 解决“在自身 logic 里还要 `$.use(SelfModule)`”的样板；更贴近直觉，也更利于示例与业务代码可读性。
- 保持解耦：不把 controller 等扩展直接塞进 `$` 的结构性 API，而是通过 `ModuleHandle` 这一层统一承载；未来出现不同扩展形态的 Module 时更容易复用。

**Alternatives considered**:

- 通过 runtime 私有字段注入 controller：违反“内部契约显式化”的宪法要求，且难以 mock/隔离。

### 5) “装配/运行侧入口”支持直接消费 Module

**Decision**: 支持把 Module 直接交给常用入口（例如 React hooks / Runtime 装配工具），由这些入口统一 `unwrap` 到 `module.impl`。

**Rationale**:

- 这是减少样板的第二条主路径：不仅 Logic 侧不需要 `.tag`（旧蓝图是 `.module`），装配侧也不需要 `.impl`。
- 统一的 unwrap 规则可避免各处自行判断/拆壳造成漂移。
- 说明（React 语义）：`useModule(module)` 默认走 `module.impl` 的“局部/会话级”路径；若要取 `RuntimeProvider` 中的全局实例，应显式传 `module.tag`（ModuleTag）。

**Alternatives considered**:

- 只在 React 侧做特化：会导致 Node/脚本/平台工具侧仍然需要 `.impl`，心智模型不统一。

### 5.1) 库作者衍化器：模块工厂命名空间（CRUDModule）

**Decision**: 提供一个库作者侧的“模块工厂命名空间衍化器”（`Logix.Module.Manage.make(...)`），用于把领域工厂的最小构造描述标准化为 `CRUDModule/Form/...` 这类命名空间对象（至少暴露 `make(id, spec, options?)`，并允许自定义 options 透传给 `define(...)`），同时统一导出 `services`（ports/service tags），让业务侧只负责用 `Layer` 提供实现。

**Rationale**:

- 领域包最常见的对外 API 形态就是“命名空间 + make() + services ports”；用统一衍化器可把样板压到最少，同时把未来扩展点（schemas/meta/descriptor/controller 规则）集中到一处演进。
- 避免把 React 依赖引入 core：领域包在 React 侧通常只需 `useModule`（可选提供别名），而不是维护一套 controller 投影 hook。

**Alternatives considered**:

- 每个领域包手写命名空间：短期可行，但扩展点会在多个包之间漂移，后续治理成本高。
- 在 `@logix/core` 里直接生成命名空间：会把领域演进点散落到 core，且更难按 kind 做治理。

### 5.1.1) 业务侧扩展：actions/reducers 的合并语义（默认能力保留）

**Decision**: `Logix.Module.make(id, def, extend?)` 支持“库默认 + 业务扩展”两段式组合：

- `extend.actions` 仅支持新增（不支持覆盖已有 action schema）；
- `extend.reducers` 做浅合并且允许覆盖（覆盖等价于对默认 reducer 的显式裁决）；
- 若 `extend.reducers` 出现“actionMap 中不存在的 key”，视为配置错误并在构造期抛出（避免运行期静默漂移）。

**Rationale**:

- 区分角色：库作者负责定义“默认能力”与稳定 action contract；业务开发只能在不破坏默认能力的前提下扩展与覆盖 reducer 行为。
- 合并规则可复用：避免每个领域包重复实现 merge/冲突检测，且测试可以锁在 core。

### 5.2) React：`useModule` 直接返回“扩展后的 ref（含 controller）”（方案B）

**Decision**: `useModule(module)` 作为“通用 runtime/ref 管理”入口（创建/缓存局部实例、接入 Provider 全局实例、提供 selector/dispatch/actions 等）的同时，必须应用 handle extend 协议，把领域扩展（如 controller/services）合并到返回的 ref 上；因此领域包不必再提供 `useForm/useCrud` 这类“controller 投影 hook”（可选提供 `useForm = useModule` 的 alias 仅为命名习惯）。

**Rationale**:

- 交互与心智模型更统一：拿到的就是“这个模块在 React 里的句柄”，逻辑侧 `$.use(module)` 与 React 侧 `useModule(module)` 返回值语义一致（都能直接用 controller）。
- 领域 hooks 更聚焦：`useField/useFieldArray/...` 这类 selector/交互封装继续存在，但它们依赖的是“带 controller 的 ref”，无需再引入额外的 controller 投影层。

**Alternatives considered**:

- 继续用 `useForm/useCrud` 做 controller 投影：会产生两套入口与缓存语义（`useModule` vs `useForm`），并把“扩展协议”分散到领域包；不利于 Devtools/一致性治理。

### 6) 诊断/解释链路：提供可序列化的 Module 描述（Descriptor）

**Decision**: 定义一个最小可序列化的 `ModuleDescriptor`（包含 `id`（可读定义 id）、moduleId、instanceId、actionKeys（模块 action tags）/逻辑单元摘要等），用于 Devtools/Sandbox 对齐与“为什么会这样”的解释链路。

**Rationale**:

- Module（定义对象）本体不可序列化（含函数/Tag/Layer），但 Devtools 需要可序列化证据；Descriptor 作为“对外证据”形态更符合统一 IR/证据导出的原则。
- 支撑 spec 的 SC-005：解释“一个运行中的领域模块由哪些逻辑单元与哪些 action tags（模块 actions）组成”。
- `logicUnits` 需要确定性的 id/name：显式 `logicUnitId` 作为最佳实践；未提供时允许 derived（可复现但不承诺跨重排稳定）；禁止默认随机/时间。
- Descriptor 的发布通道复用既有 DebugSink 的 `trace:*` 事件：以 `type: "trace:module:descriptor"` 发出，`data` 为 `ModuleDescriptor`；当 `diagnosticsLevel != "off"` 时可被 Devtools 展示，同时也必须能被 `trialRun(...)` 的 evidence collector 收集并导出（不依赖进程级全局单例）。

**Alternatives considered**:

- 不做诊断：会让该特性在平台化阶段缺失解释链路，且违背“可诊断性优先”的强约束。

### 7) 显式 Schema 反射（可选但推荐）

**Decision**: Module 形状上预留 `schemas`（reflection）字段：领域工厂在构造 Module 时，把关键 Schema 显式挂回到返回值上，使下游（Studio/Devtools/脚本）可以通过 `import module` 直接读取结构信息，而不需要静态 AST 分析工厂入参。

**Rationale**:

- 平台侧“动态加载拿到最终对象”比“静态分析猜类型”更稳：可处理动态 Schema 组合、推导与封装。
- 对 LLM/SDD 友好：可直接把 Schema 投影成 JSON Schema 做上下文压缩与对比，避免把大量源码喂给模型。
- 成本低：本质是透传引用；序列化/转换放到平台侧（loader pattern），不进入运行时热路径。

### 8) Traceability meta 容器（可选但标准化）

**Decision**: Module 预留 `meta` 字段用于链路追踪（specId/scenarioId/version/generatedBy 等），并允许在诊断 Descriptor 中以 slim、可序列化形式透出。

**Rationale**:

- 让错误/红绿灯/漂移检测能回到 Spec/Scenario 维度归因。
- 不掺业务语义：属于研发链路数据，缺省为空，不影响运行。

### 9) 源码位置锚点（Dev Optional）

**Decision**: `Module.dev.source` 作为可选字段预留（file/line/column），用于 devtools click-to-code；该字段仅 dev 使用，不参与运行时语义。

**Scope**: 自动注入 `dev.source` 预计由未来构建工具插件（vite/rsbuild/webpack）提供；本特性只定义字段与消费约定，默认留空。

### 10) 平台消费（Loader Pattern，未来能力）

**Decision**: 平台（Studio/CLI）获取 `schemas/meta` 的标准姿势是“动态 import + 运行时反射读取”（loader pattern），而不是自己实现 TS 静态分析。Loader 可运行在受控容器中（Effect DI 注入 mock 环境）以降低副作用风险，并把结果序列化为 slim JSON（例如 JSON Schema + meta）。

### 11) 迁移工具（Codemod）：必须可测试、可预演、可删除

**Decision**: 对 `Module → ModuleTag` 这类全局重命名与“把 Module 当 Tag 用”的大面积调用点迁移，必须提供 codemod（推荐 ts-morph），并配套 fixture 级测试用例；codemod 必须支持 check/dry-run（不写文件）与变更摘要输出；迁移完成后允许删除 codemod（不作为长期兼容层保留）。

**Rationale**:

- 手工批改全仓调用点易漏改/误改，且并行开发中极难 review；codemod + fixtures 能把迁移规则“锁死”并可复跑。
- check/dry-run 可以在迁移前预览影响面与风险（让迁移是可控动作，而不是一次性赌博）。
- 一次性迁移工具不应长期残留：迁移完成后删除可降低维护成本与误用风险。

**Alternatives considered**:

- 提供长期 legacy shim：会引入双路径与长期维护负担，同时让调用侧心智模型更模糊（与本仓“允许破坏但要可交接”的方向冲突）。
- 纯手工迁移：成本高且错误率不可控，不符合 DX 与可交接要求。

## Post-design Constitution Re-check

- 结论：通过（无新增未解释的 magic 字段依赖；拆壳协议显式；诊断证据采用可序列化 Descriptor；对 `$.use` 热路径的性能预算在 plan 中明确，后续实现需补齐可复现测量证据）。
