# Feature Specification: 层级 Injector 语义统一（Nearest Wins + Root Provider）

**Feature Branch**: `[008-hierarchical-injector]`  
**Created**: 2025-12-15  
**Status**: Draft  
**Input**: User description: "保留现有函数式 DI 的优势，吸收 Angular 的层级 injector 核心（最近 wins + root provider），并为分形模块实例提供清晰一致的解析语义。"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 层级解析可预测且一致 (Priority: P1)

作为模块作者/应用集成者，我希望在“根作用域 + 父模块实例作用域 + 局部多实例”同时存在时，依赖解析遵循明确且一致的规则：**最近作用域优先（Nearest Wins）**，并在所有运行入口（业务逻辑、跨模块编排、UI 读取）下表现一致，从而避免“拿到错误实例/串实例”的隐性 bug。

**Why this priority**: 这是可维护性与正确性的地基；没有确定的解析规则，任何多实例/分形组合都会变成高概率的隐性故障。

**Independent Test**: 用最小示例构造 3 层作用域（root + host 实例 + 孙子 imports），验证同一个 token 在不同作用域可同时存在，且解析结果始终选择最近一层；同时验证“缺失提供者”时能稳定失败并给出可执行修复建议。

**Acceptance Scenarios**:

1. **Given** root 作用域提供了 token `T` 的实例 `T_root`，且某个 host 实例作用域也提供了 `T_host`，**When** 在 host 作用域内解析 `T`，**Then** 必须得到 `T_host`（最近 wins），且不得隐式回退到 `T_root`。
2. **Given** host 作用域未提供 token `T`，但 root 作用域提供了 `T_root`，**When** 在 host 作用域内解析 `T`，**Then** 必须得到 `T_root`（向父作用域回溯），且结果稳定一致。
3. **Given** 在同一 root 下存在两个不同 host 实例，各自都提供 `T_hostA` 与 `T_hostB`，**When** 分别在 hostA/hostB 作用域内解析 `T` 并执行读写操作，**Then** 两者必须完全隔离，且任何事件/状态不应跨实例串扰。

---

### User Story 2 - Root Provider（单例）语义清晰可用 (Priority: P2)

作为应用集成者，我希望能够用“Root Provider”的方式提供全局单例（例如跨页面/跨模块共享的基础设施），并确保当我选择单例语义时，不会被子作用域意外覆盖或误用；当我选择“必须来自子作用域”的严格语义时，也不会误拿到单例。

**Why this priority**: 单例是必要能力，但它必须是“显式选择”的结果；否则多实例场景下会产生难排查的串用。

**Independent Test**: 构造一个 root 单例 token 与一个被 imports 的子模块 token，验证“显式单例解析”与“子作用域严格解析”各自按预期工作，并能用诊断信息解释差异。

**Acceptance Scenarios**:

1. **Given** root 提供了 token `T` 的单例，且某个子作用域也提供了 `T_child`，**When** 用户明确选择“root 单例语义”解析 `T`，**Then** 必须得到 root 实例，且结果不受 `T_child` 影响。
2. **Given** root 提供了 token `T` 的单例，子作用域未提供 `T`，**When** 用户明确选择“子作用域严格语义”解析 `T`，**Then** 必须失败并提示“缺失子作用域提供者”，而不是静默使用 root 单例。

---

### User Story 3 - 缺失/冲突时错误可读可修复 (Priority: P3)

作为开发者，当依赖解析失败（缺失提供者、作用域选择错误、存在多个可能来源等）时，我希望系统给出稳定、可读、可操作的诊断信息，帮助我快速定位“应该在哪里提供/如何选择正确语义”，避免靠猜。

**Why this priority**: 解析规则再正确，没有可读诊断也会导致开发效率低、误用持续发生。

**Independent Test**: 人工制造缺失与冲突场景，断言错误信息包含关键字段（请求 token、发生位置/所属模块、可选修复路径），并在不同入口下保持一致。

**Acceptance Scenarios**:

1. **Given** 某处解析 token `T` 失败，**When** 系统抛出错误，**Then** 错误信息必须包含：请求的 token 标识、解析发生的作用域（如来自哪个模块实例/入口）、以及至少两条可执行修复建议（例如“在 root 提供单例”/“在父模块 imports 提供子实现”）。
2. **Given** 同一个 token 在多个作用域都存在，且用户选择的语义与实际提供不匹配，**When** 系统抛出错误，**Then** 错误信息必须指出“当前选择的语义”与“可用提供者所在作用域”的差异，并提示用户切换语义或补齐提供者。

---

### Edge Cases

- 同一应用中存在多个 root（例如多颗运行时树）：同一 token 在不同 root 下必须互不影响。
- 子作用域对 root 的覆盖：必须遵循最近 wins；且“显式 root 单例语义”不应被覆盖影响。
- 多实例场景下的错误诊断：错误信息必须能区分不同实例，不得只显示模糊的“找不到”。
- 解析时机差异（初始化期/运行期）：规则必须一致，且错误语义一致（不能初始化时静默、运行时才爆）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 支持“层级作用域”的依赖提供与解析，至少包含：root 作用域、模块实例作用域（imports-scope）、局部多实例作用域（同一模块的多份实例）。
- **FR-002**: 系统 MUST 实现“最近 wins（Nearest Wins）”解析：当同一 token 在多个层级存在时，解析结果必须选择最近一层，并且结果稳定可预测。
- **FR-003**: 系统 MUST 支持“Root Provider”语义：允许在创建 runtime tree 时通过 root layer/provide 提供全局单例，并能在需要时明确解析到该单例。
- **FR-004**: 系统 MUST 支持“严格子作用域语义”：当调用方声明依赖必须来自某个更近的作用域（例如 imports-scope）时，若该作用域缺失提供者，系统必须失败而不是回退到更远作用域。
- **FR-005**: 系统 MUST 在不同入口/集成形态下保持一致的解析语义（例如：业务逻辑执行、跨模块协作逻辑、UI 读取/派发）。
- **FR-010**: 系统 MUST 收敛跨模块协作的默认入口：业务层仅保留 `$.use`（strict）与 `Link.make`（显式跨模块/IR 承载），并移除 `$.useRemote` 作为公共 API，避免“双入口等价”导致语义分裂与误用。
- **FR-011**: 系统 MUST 提供显式 root provider 解析入口（例如 `Root.resolve(Tag)`），且该入口只解析“当前 runtime 树的 rootContext”，不受 React `RuntimeProvider.layer` 等局部 override 影响；当 `Tag` 为 `ModuleTag` 时语义固定为“root 单例 module runtime”，不得用于选择 imports-scope 或多实例实例。
- **FR-006**: 系统 MUST 在解析失败时提供可读、可操作的诊断信息，至少包含：请求 token 标识、解析发生的作用域/入口、以及修复建议。
- **FR-007**: 系统 MUST 对“多实例并存”提供一等支持：同一模块/同一 token 的不同实例不得串扰，且诊断信息必须能区分实例。
- **FR-008**: 系统 MUST 明确并文档化“作用域边界”的语义：何时是 root、何时是 imports-scope、何时需要显式 key 才能表达多实例；并明确 React `useModule(Impl,{ key })` 的 key 语义（同 key 复用、异 key 隔离、缺省 key 为组件级独立实例）；同时明确 React `useModule(Impl)` 不得隐式复用 root 单例（root 单例语义必须显式通过 `useModule(ModuleTag)` / `useModule(Impl.module)` / `Root.resolve(ModuleTag)` 选择）；并明确 `ModuleDef.implement({ imports })` 的 imports 仅用于“提供实现/实例构造”，因此只接受 `Child.impl`（ModuleImpl），`Child.module`（ModuleTag）仅作为解析 token 使用。
- **FR-009**: 系统 MUST 提供最小化的概念与 API 表面积：在不引入第二套 DI 模型的前提下完成上述能力（以现有 DI 原语为基底）。

### Scope Boundaries & Assumptions

- **In scope**: 统一并固化“层级作用域 + 最近 wins + root provider + 严格语义 + 诊断信息”的产品级行为，并在所有入口保持一致。
- **Out of scope**: 不新增与该语义无关的领域功能；不引入第二套并行的依赖注入体系；不要求一次性重写既有业务模块，只要求可渐进迁移到一致语义。
- **Assumption**: 系统已经具备“可组合的依赖提供”与“从某个起点 scope 解析 token”的基础能力，本特性只负责把规则与体验收敛为单一事实源。

### Key Entities _(include if feature involves data)_

- **Token**: 一个可被解析的依赖标识（模块或服务），在多个作用域中可能各自拥有实例。
- **Scope（作用域）**: token 实例的归属边界；至少包含 root、imports-scope、局部多实例 scope。
- **Provider（提供者）**: 在某个 scope 内声明 token→实例的关系（可能是单例或按实例生成）。
- **Resolution（解析）**: 从某个起点 scope 出发，按既定规则（最近 wins、向父回溯、严格/显式语义）得到 token 实例或失败诊断。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在至少 3 层嵌套作用域的示例中，所有 token 解析结果均满足最近 wins，并通过自动化验收场景验证。
- **SC-002**: 在多实例并存的示例中（至少 2 个 host 实例），实例隔离通过自动化验收场景验证：任一实例的状态/事件不得影响另一实例。
- **SC-003**: 当解析失败时，诊断信息满足 FR-006 的字段要求，并能让开发者在 5 分钟内根据提示完成修复（通过可重复的“缺失提供者”演练脚本验证）。
- **SC-004**: 文档能让新接入的开发者在不查源码的情况下正确选择“root 单例 / imports-scope / 多实例 key”三种语义（通过文档演练用例验证通过率≥90%）。

## Clarifications

### Session 2025-12-15

- Q: `useModule(Host.impl)` 是否必须传 `key`？ → A: 默认 strict，`useModule(Host.impl,{key})` 用于构造/区分局部实例，缺失 `key` 仍会创建局部 scope；只有 `useModule(Host.module)` / `useModule(ModuleTag)` 直接拿 root 单例。
- Q: `useModule(Impl,{ key })` 的 `key` 是 label 还是实例标识？ → A: `key` 作为实例标识参与实例复用：同一 `RuntimeProvider` 下同 `key`（+同 deps）复用同一局部实例；异 `key` 隔离；未提供 `key` 时按组件生成临时 key（每组件独立）。
- Q: `useModule(Impl)`（不传 options）是否允许隐式复用 root 单例？ → A: 不允许；`useModule(Impl)` 永远走局部实例语义，root 单例必须显式使用 `useModule(ModuleTag)` / `useModule(Impl.module)`（以及 `Root.resolve(ModuleTag)`）。
- Q: 在嵌套 `RuntimeProvider` 并追加 `layer` 的子树中，`useModule(ModuleTag)` 是否受 override 影响？ → A: 受影响；`useModule(ModuleTag)` 按当前运行环境解析（最近 wins），要忽略 override 并强制 root 单例则使用 `Root.resolve(Tag)`。
- Q: `ModuleDef.implement({ imports: [...] })` 的 imports 应接收 `Child.impl` 还是 `Child.module`？ → A: 只接收 `Child.impl`（ModuleImpl）作为“提供实现/构造子实例”的声明；`Child.module`（ModuleTag）只用于解析（`$.use`/`imports.get`/`Root.resolve`）。
- Q: strict 默认下，`host.imports.get(Child.module)` / `useImportedModule(host, Child.module)` 是否支持 host 为 root 单例？ → A: 支持；root 也是一种模块实例，`imports.get` 只依赖该 host 实例的 imports-scope injector（`ImportsScope`），不区分 root/local。
- Q: 是否保留 `$.useRemote` 作为跨模块协作入口？ → A: 不保留；删除 `$.useRemote`，跨模块协作/IR 承载只保留 `Link.make`，业务层默认只使用 `$.use`（strict）。
- Q: `Root.resolve(Tag)` 是否受 `RuntimeProvider.layer` 覆盖影响？ → A: 不受影响；它固定解析当前 runtime 树的 root provider（rootContext），与 React 层的局部 override 无关。
- Q: 是否允许 `Root.resolve(ModuleTag)`？ → A: 允许；它始终解析 root 单例（root/global 语义），不用于拿父实例 scope 的子模块实例；后者必须使用 `$.use` / `imports.get` / `Link.make`（透传实例句柄）。
- Q: 全局 module（root 单例）通过什么方式“提供到 root provider”？ → A: 在创建 runtime tree（`Runtime.make` / `ManagedRuntime.make` / 最外层 `RuntimeProvider.runtime`）时把对应 `ModuleImpl.layer` 合并进 root layer/provide；业务模块用 `Root.resolve(ModuleTag)` 获取，不需要在每个业务模块的 `implement({ imports })` 里重复声明。
- Q: React 的 `useImportedModule/host.imports.get` 是否需要支持 `{ mode: "global" }`？ → A: 不需要；这两个 API 只做 strict（从 host 实例的 imports-scope 解析子模块）。root/global 单例语义统一使用 `useModule(ModuleTag)`（当前运行环境）或 `runtime.runSync(Root.resolve(Tag))`（固定 root provider）。
