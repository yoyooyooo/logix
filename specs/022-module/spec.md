# Feature Specification: Module（定义对象）+ ModuleTag（身份锚点）

**Feature Branch**: `022-module`
**Created**: 2025-12-21
**Status**: Draft
**Input**: User description: "升级 Module：引入 Module（定义对象）统一形状并支持挂载 Logic/Actions；旧 Module 更名为 ModuleTag（方案A）"

## 命名矩阵（本特性裁决）

- `ModuleDef`：`Logix.Module.make(...)` 返回；带 `.tag`；可 `.logic(...)` 产出逻辑值；`.implement(...)` 产出 `Module`；不带 `.impl`。
- `Module`：wrap module（通常由 `ModuleDef.implement(...)` 或领域工厂返回）；带 `.tag` + `.impl`；支持 `withLogic/withLayers`；`.logic(...)` 仍只产出逻辑值。
- `ModuleTag`：身份锚点（Context.Tag）；用于 Env 注入与“全局实例”解析。
- `ModuleImpl`：装配蓝图（`layer` + imports/processes 等）；用于创建局部实例。
- `ModuleRuntime`：运行时实例（真正的“实例”语义）。
- `ModuleHandle`：`yield* $.use(...)` 返回的只读句柄（可含 controller 等扩展）。
- `ModuleRef`：React `useModule(...)` 返回的 ref（含 state/actions/dispatch + 扩展）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 领域模块可直接挂载逻辑并运行 (Priority: P1)

业务/领域开发者创建一个领域模块（例如 Form），希望在“同一个领域对象（Module 定义对象）”上直接挂载逻辑（联动、校验策略、领域流程），并交给 UI 集成或运行时装配使用，而不需要额外创建一个“包装 ModuleTag”再 imports 这个领域模块。

**Why this priority**: 这是“万物皆是 logic”的核心落地，直接减少样板与心智负担，提升领域能力的可组合性与可复用性。

**Independent Test**: 只实现 Module（定义对象）+ withLogic 的最小闭环，即可用一个 Form 场景验证“创建→挂载→运行→可调用 actions（模块 action dispatchers）与 controller”。

**Acceptance Scenarios**:

1. **Given** 一个 Form Module（定义对象），且其上挂载了一段领域逻辑，**When** 通过既有方式运行该 Form（UI 集成或 Runtime 装配），**Then** 逻辑会按确定性顺序运行，并能通过“同一领域对象”访问到该 Form 暴露的 actions（模块 action dispatchers）/controller。
2. **Given** 一个已存在的 Module（定义对象）实例，**When** 调用 `withLogic/withLogics` 追加逻辑得到新实例，**Then** 原实例行为不变，新实例包含追加逻辑且两者可并行使用（不可变、无共享副作用）。

---

### User Story 2 - 领域工厂产物统一形状（替代早期 pattern） (Priority: P2)

架构/平台开发者希望把常见 ToB 领域能力（例如 CRUD 场景）封装成一个领域工厂（例如 `CRUD.make()`），其返回值与 Form 等领域模块一致，具备统一的“领域模块形状 + 可枚举的 action tags（对应 ModuleHandle.actions）+ 可挂载逻辑/依赖 + 可选 controller”的能力，从而在工程实践中逐步替代“pattern 作为独立抽象”的概念。

**Why this priority**: 统一形状让上层工具（装配、调试、UI 适配）不需要为每个领域特化分支，同时为未来更多领域工厂铺路。

**Independent Test**: 只要能证明“两个不同领域工厂返回的对象具有一致形状，且被同一套装配/适配入口消费”，即可独立验证价值。

**Acceptance Scenarios**:

1. **Given** 两个不同来源的领域模块（例如 Form 与 CRUD），**When** 将它们交给同一套通用装配/适配入口，**Then** 均可被消费且暴露各自的 actions（模块 action dispatchers），同时都支持 `withLogic/withLayers` 的链式组合。

---

### User Story 3 - 迁移可控且心智模型一致 (Priority: P3)

维护者希望从现有的“领域蓝图（含 `.module/.impl`）+ 手工包装”迁移到 Module（定义对象）时，能够明确知道哪些用法发生变化、如何最小代价迁移，以及迁移后在逻辑/装配/调试层面拥有一致的心智模型。

**Why this priority**: 本仓允许破坏性演进，但必须可交接；迁移说明是并行开发的安全阀。

**Independent Test**: 以现有 Form demos 作为样本，完成一次“机械迁移 + 行为不变验证 + 文档对齐”即可独立验收。

**Acceptance Scenarios**:

1. **Given** 一段使用旧蓝图形状的示例代码，**When** 按迁移说明迁移到 Module（定义对象），**Then** 不需要额外创建包装 ModuleTag，且行为与可观察结果保持一致。

---

### Edge Cases

- 同一 Module（定义对象）上挂载多段逻辑时，如何保证执行顺序可预测且可解释？
- 当同一个领域模块被多次装配/运行（不同实例）时，领域模块的身份与诊断锚点是否稳定且不串扰？
- 当 Module（定义对象）同时追加 layers 与 logics 时，是否存在“顺序不同导致行为不同”的隐式陷阱？若有，应给出一致的规则与文档说明。
- 当 Logic 内通过 `$.self/$.use(SelfModule)` 获取句柄并 dispatch actions 时，如何避免/诊断自触发闭环？（至少应有可解释的告警/事件与最佳实践说明）

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 引入新的 `Module`（定义对象）概念（由当前的领域蓝图形态演进而来），作为领域能力的统一承载：包含 `ModuleTag` 身份锚点、可装配蓝图（ModuleImpl）、以及可选领域扩展（例如 controller/policies/descriptor）。其中 `actions` 语义复用模块 action tags（`ModuleHandle.actions`），不引入第二套同名 actions。
- **FR-002**: `Module` 提供的 `logic` 能力 MUST 保持与旧 `Module.logic` 一致的语义（旧 `Module` 在本特性中更名为 `ModuleTag`）：仅产出可复用的逻辑单元（值），不隐式修改/挂载到蓝图。
- **FR-003**: `Module` MUST 提供 `withLogic/withLogics` 用于将逻辑单元挂载到该领域模块的“可运行形态”上，并返回新的 `Module`（不可变）。
- **FR-004**: `Module` MUST 提供 `withLayer/withLayers` 用于注入依赖能力，并返回新的 `Module`（不可变）。
- **FR-005**: `Module` MUST 可被“逻辑侧 use”直接消费（不要求调用方手动取 `.tag`），并在返回的句柄上保持完整的 `ModuleHandle` 能力（含 `actions`），同时按需附加领域扩展（例如 controller）。同时，在 `Module.logic(build, { id? })` 中传入的 `$` MUST 提供 `$.self` 用于获取当前 Module 的句柄（等价于 `yield* $.use(module)`），以避免在本模块逻辑中反复显式传入自身 module。
- **FR-006**: `Module` MUST 可被“装配/运行侧入口”直接消费（不要求调用方手动取 `.impl`），从而支持“只创建领域模块对象也能像模块一样玩”的用法。
- **FR-007**: `Form.make()` MUST 产出 `Module`（Form 领域模块），并确保其 actions（模块 action dispatchers）/controller 在逻辑侧与装配侧具有一致可用性。
- **FR-008**: 系统 MUST 支持至少一个额外领域工厂（例如 CRUD）以验证“领域工厂返回的也是 `Module`”，并能承载该领域的 action tags（通过 module actionMap）与逻辑挂载能力（可选 controller），从而替代早期 pattern 抽象。
- **FR-009**: 系统 MUST 提供迁移说明与示例更新，覆盖：旧蓝图形态到 `Module`（定义对象）的映射、常见用法替换、以及不提供兼容层时的破坏性变更说明；对于“Module 语义从 Tag（身份锚点）切换为 wrap（定义对象）”导致的全仓迁移（典型：原先可 `yield* SomeModule` / `Layer.succeed(SomeModule, ...)`，迁移后需 `yield* $.use(SomeModule)` 或显式 `.tag`），MUST 提供 codemod（建议基于 ts-morph）以降低人工迁移出错率。codemod MUST 支持 dry-run/check 模式与变更摘要输出；codemod MUST 有 fixture 级测试用例；迁移完成后允许删除该 codemod（不作为长期兼容层保留）。
- **FR-010**: 系统 MUST 在 `Module` 上预留一组“SDD/平台反射”字段（可选、非运行必需）：
  - `schemas`：显式 Schema 反射；
  - `meta`：可序列化链路追踪元数据；
  - `services`：该 Module 对外暴露的依赖契约（ports/service tags；业务侧用 Layer 提供实现）；
  - `dev.source`：源码位置锚点（仅 dev；预计由构建工具插件（vite/rsbuild/webpack）注入；本特性不实现自动注入）。
  这些字段缺省可为空，且不应要求平台通过静态 AST 分析才能获取结构信息。
- **FR-011**: 系统 MUST 为 `withLogic/withLogics` 的“逻辑单元挂载”提供确定性的 `logicUnitId`（slot key）解析与裁决：
  - `Module.logic(build, { id? })` 允许为逻辑值提供可选的默认 id；
  - 挂载到 Module 时的 `logicUnitId` 解析优先级：挂载时显式 id > 逻辑值默认 id > 系统可复现推导 id（如由构建工具注入的 dev.source/callsite 指纹、或函数名 + 确定性序号作为冲突消解）；
  - 禁止默认使用 `Math.random()/Date.now()` 生成 id；禁止仅以数组 index 作为默认 id；
  - 重复 id 的裁决必须确定且可诊断：默认 `last-write-wins`（后挂载覆盖前者，作为“有意覆盖默认逻辑”的正式能力）；dev 模式 SHOULD 产出可解释告警/诊断事件（包含被覆盖的 `logicUnitId`、来源锚点与覆盖顺序），用于发现“无意覆盖”（有意覆盖可忽略）。建议以 `Debug.record({ type: "diagnostic", code: "module_logic::override", severity: "warning", ... })` 形式落地，便于 Devtools/证据导出统一消费。
- **FR-012**: 系统 MUST 提供库作者侧的“模块工厂命名空间衍化器”（`Logix.Module.Manage.make(...)`）：
  - 允许库作者以 `{ kind?, define }` 的最小描述，标准化衍化出 `CRUDModule/Form/...` 这类命名空间对象（`kind` 仅用于反射/Devtools 分类，不影响运行时语义）；
  - 命名空间对象至少暴露 `make(id, spec, options?)`，并允许库作者定义额外参数（策略/调优/标识等）透传给 `define(...)`；
  - 领域包必须能通过该命名空间对象导出稳定的 `services`（ports/service tags），业务开发只负责用 `Layer` 提供实现；
  - React 侧不强制提供“controller 投影 hook”：在 方案B 下 `useModule(module)` 应能直接返回带扩展（如 controller/services）的 ref；领域 hooks 更推荐聚焦于 selector/交互封装（例如 `useField/useFieldArray/...`）。

### Assumptions & Dependencies

- **Assumption**: 本特性以“方案 A”为裁决：`Module` 保留对既有模块身份锚点的复用（即 `ModuleTag`；不引入新的身份锚点），避免因“再造身份”带来的实例/诊断混淆。
- **Assumption**: “定义逻辑”与“挂载逻辑”必须分离：`logic` 产出逻辑值；`withLogic/withLogics` 才改变可运行形态。
- **Dependency**: 至少更新一个现有领域模块（Form）与一个新增/抽取的领域工厂（CRUD）作为验证样本，并同步更新示例与用户文档，形成可回归的心智模型。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: System MUST define performance budgets for the affected hot paths
  and record a measurable baseline (benchmark/profile) before implementation.
- **NFR-002**: System MUST provide structured diagnostic signals for this feature’s key behaviors, and diagnostics MUST have near-zero overhead when disabled (diagnosticsLevel="off"). Minimum set for 022:
  - `trace:module:descriptor`（可序列化、slim、可导出）；
  - `logicUnitId` 覆盖告警（见 FR-011；优先走 `diagnostic` 事件而不是 console-only）。
- **NFR-003**: System MUST use deterministic identifiers for instances/transactions
  in diagnostic and replay surfaces (no random/time defaults). ModuleDescriptor `logicUnits` MUST have deterministic `id`/`name`：
  - 若需要跨组合/跨版本的 diff/replay 对齐，调用方 SHOULD 显式提供 `logicUnitId`（slot key）；
  - 若调用方未提供，系统 MAY 生成可复现的推导 id，并在 descriptor/诊断中标注为 derived（不承诺跨重排稳定）；
  - 禁止默认随机/时间；禁止仅以数组 index 作为默认 id 源。
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO/async
  work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes runtime performance boundaries or introduces
  an automatic policy, the project MUST update user-facing documentation to provide
  a stable mental model: (≤5 keywords), a coarse cost model, and an “optimization ladder”
  (default → observe → narrow writes → stable rowId → module/provider override & tuning → split/refactor).
  Vocabulary MUST stay aligned across docs, benchmarks, and diagnostic evidence fields.
- **NFR-006**: If this feature relies on internal hooks or cross-module collaboration
  protocols, the system MUST encapsulate them as explicit injectable contracts
  (Runtime Services) that are mockable per instance/session, and MUST support exporting
  slim, serializable evidence/IR for a controlled trial run in Node.js or browsers
  without relying on process-global singletons (e.g. via runtime reflection fields like `schemas/meta` rather than static analysis).

### Key Entities _(include if feature involves data)_

- **Module**: 领域模块统一形状（`ModuleTag` 身份锚点 + 可运行蓝图 + 可选 controller/诊断 descriptor + 可挂载逻辑/依赖；`actions` 语义复用模块 action tags）。
- **Controller/Extensions**: 领域模块暴露给上层（逻辑、装配、UI 集成）的专属操作投影（例如表单校验、CRUD 聚合操作等），通过统一入口附加到 handle，且不与 `actions` 语义冲突。
- **Module Factory**: 生成 `Module` 的工厂（例如 Form.make / CRUD.make），用于定义模块 actionMap（action tags）与封装领域默认逻辑（install）/可选 controller。
- **Services/Ports**: 由领域包导出的依赖契约（service tags）；业务侧通过 Layer 注入实现；推荐统一挂在 `module.services` 以便装配与工具反射。
- **Logic Unit**: 可复用的逻辑单元（值），可被挂载到 Module，也可被独立组合与复用。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 业务开发者可以在不创建额外包装 ModuleTag 的前提下，仅凭一个 Module（定义对象）完成“创建 + 挂载逻辑 + 注入依赖 + 运行”闭环。
- **SC-002**: Form 与 CRUD 等至少两个领域工厂产物可被同一套通用入口消费，且不需要为每个领域写专门的装配分支。
- **SC-003**: 现有 Form demos 完成迁移后，“为了挂载逻辑而额外创建包装模块”的做法被移除（0 处残留），且示例行为保持一致可回归验证。
- **SC-004**: 受影响的热点路径在既有性能基线下无可测回退（例如关键 p95 指标与分配量在预算内），并产出可复现的测量证据。
- **SC-005**: 调试/诊断视角可以解释：一个运行中的领域模块由哪些逻辑单元与哪些 action tags（模块 actions）组成，并能稳定关联到实例/事务标识。
