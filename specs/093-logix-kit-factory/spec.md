# Feature Specification: Logix Kit Factory（语法糖机器：用既有原语拼装可复用 Sugar）

**Feature Branch**: `093-logix-kit-factory`  
**Created**: 2026-01-21  
**Status**: Draft  
**Input**: 现有 `traits/external/module/logic/workflow` 等原语已稳定，但在“端口型能力（Router/Session/Flags/WebSocket…）”接入时仍存在大量重复胶水；需要一个统一的 Kit 工厂，保证语义不漂移、真相源唯一、稳定身份、零副作用。

## Context（问题与动机）

我们已经有了足够强的基础原语：

- 读侧：`ExternalStore.fromService/fromModule` + `StateTrait.externalStore`（install/runtime 期解析 + 写回事务）
- 写侧：`$.use(Tag)`（Logic 内事务外 IO + 事务内回写）与 `Workflow.call({ service: Tag })`（075 的可导出控制流）

但实践中会反复遇到三类“重复且高风险”的胶水：

1. **端口契约重复表达**：同一个外部能力往往在 Trait/Logic/Workflow 三处重复写“如何接入”，容易造成概念重叠与口径漂移。
2. **身份与可导出性易漂移**：`serviceId/selectorId/stepKey/storeId` 若靠手写字符串或隐式推导，容易出现不稳定与双真相源。
3. **DX 与性能/诊断门禁难以同时保证**：为了“方便”，很容易写出事务窗口内 IO、模块写外部 owned 字段、或在 React 层引入第二订阅源等违规写法。

本 spec 的目标是提供一个**统一的“造糖机器”**：它只做“等价组合”，不引入新语义；让 Router 之类的 domain kit 成为它的一个实例，而不是另起一套协议。

## Positioning（裁决：Kit 的边界）

- **Kit 是 build-time/composition 层**：只产出 “描述对象/组合函数”（ExternalStore、StateTraitEntry、WorkflowStep、`$.use` 的取服务糖）。
- **Kit 不是运行时子系统**：不得注册 watcher/process，不得创建/持有 Scope，不得订阅外部源，不得隐藏 IO。
- **Kit 不制造新真相源**：读侧真相源仍属于宿主（router/session/flags）；模块只通过 `externalStore` 把快照写回状态图，写侧通过显式 command/service port 触发。
- **Kit.forModule 只解决“可解析的 Module-as-Source”**：目标模块必须可通过 imports 解析到唯一源模块实例；不解决“运行时动态选择某个 instance”问题（避免把动态选择伪装成静态 IR）。

## User Scenarios & Testing（可独立验收）

### User Story 1 - 端口型能力的统一接入（Priority: P1）

作为业务/平台开发者，我希望只声明一次 `Context.Tag` 端口契约，就能同时得到：

- Trait 的 `externalStore` 写回糖；
- Logic 的 `$.use(Tag)` 取服务糖；
- Workflow 的 `call({ service: Tag })` 生成糖（含 success/failure 分支）。

**Independent Test**：

- 在最小模块中用 Kit 生成：
  - `StateTrait.externalStore`（读侧）
  - Logic 内 `yield* kit.use($)` 后触发 `svc.call(...)`（写侧）
  - 075 Workflow 内 `KitWorkflow.forService(Tag).call(...)` 生成 step（委托 `Workflow.call/callById`，不复制 Tag→serviceId）
- 断言：行为与手写原语完全一致；且 Kit 创建阶段无任何副作用（不订阅/不启动 fiber）。

### User Story 2 - Module-as-Source 的标准化（Priority: P2）

作为运行时开发者，我希望把“跨模块输入”（ReadQuery）以同一套路由变成 external input：

- `ExternalStore.fromModule(module, readQuery)` 的稳定入口；
- 目标模块只需声明 `StateTrait.externalStore({ store })`，并确保 imports。

**Independent Test**：

- 用 Kit 生成 Module-as-Source store，并写回到目标模块 state；
- 断言：满足 073 的强一致边界（可识别依赖时走 selector-topic；否则显式诊断降级）。

### User Story 3 - 不引入额外运行时负担（Priority: P3）

作为应用作者，我希望 Kit 不会让 tick 热路径变慢，也不会强行拖大 bundle：

- Kit 本身不在 tick 内执行；
- 仅导入 input kit 时不强制引入 workflow 相关代码路径（尽量 tree-shakable）。

## Requirements

### Functional Requirements

- **FR-001**：提供 `Kit.forService(tag)`：以一个稳定 `Context.Tag` 作为端口唯一身份锚点，生成端口相关的组合糖（见 API 方案）。
- **FR-002**：提供 `Kit.forModule(module, readQuery)`：把 Module-as-Source 标准化为可复用 InputKit（依赖 073/ReadQuery 的稳定 lane）。
- **FR-003**：Kit 生成的所有 identity 必须稳定且确定性：
  - `serviceId` 必须遵守 `specs/078` 的 Tag→ServiceId 合同；
  - `selectorId` 必须为 stable（不得落入 `unstableSelectorId`）；
  - `stepKey` 必须显式传入或以确定性规则生成（禁止随机/时间/地址）。
- **FR-004**：Kit 创建阶段必须为 **零副作用**（不订阅/不 fork/不创建 runtime 资源）。
- **FR-005**：Kit 只允许“等价展开”到既有原语；不得引入第二套 DSL/语义，不得新增“写外部 owned 字段”的逃逸口。

### Non-Functional Requirements（Performance & Diagnosability）

- **NFR-001**：Kit 相关实现不得进入 tick 热路径（仅冷路径/装配期）；如出现热路径变化，必须给出 perf 证据与回归门禁（见 `plan.md#Perf Evidence Plan`）。
- **NFR-002**：Kit 必须保持“单一真相源”心智模型：读=ExternalStore；写=显式 command/service port；禁止通过模块 reducer/computed/link/source 写 external-owned 字段。
- **NFR-003**：所有产物必须可诊断：当 selector/service 缺失或不稳定时，必须 fail-fast 或发出 Slim diagnostic（复用既有诊断机制，不新增并行协议）。
  - 当 “Module-as-Source 不可解析到唯一源模块实例” 时，错误信息必须明确指出 `Kit.forModule` 不支持“运行时动态选择某个 instance”，并给出正确建模建议。
  - 当 `TraitMeta.sanitize(meta)` 裁剪了字段时，必须提供开发期可解释反馈（warn 或显式 validate 工具），避免“写了但没进 Root IR”的静默漂移。
- **NFR-004**：对外 API 必须可分层导入（避免 kit 变成“万能大对象”导致 bundler 无法 tree-shake）。
- **NFR-005**：Kit 相关的可导出 meta 必须可被裁剪为 Slim JSON：只承认 `TraitMeta` 白名单字段（见 `packages/logix-core/src/internal/state-trait/meta.ts` 的 `sanitize`），其余字段允许存在但不会进入 Root IR。

## Success Criteria（可量化）

- **SC-001**：Router/Session/Flags 任一端口能力，可用同一 Kit 模板完成 Trait+Logic+Workflow 三面接入（每面 ≤ 5 行胶水）。
- **SC-002**：提供最小自动化测试：验证 Kit 输出的 ExternalStore descriptor/ReadQuery lane/Workflow call 形态与手写一致。
- **SC-003**：Kit 引入后不需要恢复任何 “Router 单独真相源 spec”（保持 071 删除后的口径不回摆）。
- **SC-004**：`quickstart.md` 对每个 Kit API 同时给出 “Kit 写法” 与 “等价展开（de-sugared）” 视图，保证透明性，避免糖化导致的心智断层。
