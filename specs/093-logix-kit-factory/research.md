# Research: Logix Kit Factory（语法糖机器）

## 0. 现状证据（Repo Reality）

### 0.1 ExternalStore 与 externalStore trait 已具备“外部输入 → 事务写回”的内核能力

- `packages/logix-core/src/ExternalStore.ts`
  - `ExternalStore.fromService(tag, map)`：install/runtime 期解析 service（descriptor.kind=`service`）
  - `ExternalStore.fromModule(module, selector)`：Module-as-Source（descriptor.kind=`module`），并对 `unstableSelectorId` fail-fast
- `packages/logix-core/src/StateTrait.ts`：`StateTrait.externalStore({ store, select, ... })`
- `packages/logix-core/src/internal/state-trait/external-store.ts`：install 逻辑（写回进入事务窗口；Module-as-Source 走 declarative link runtime）

结论：Kit 不需要新增“外部输入接入语义”，只需把这些原语的组合方式标准化并去样板。

### 0.2 Workflow 已具备“call(Tag)→serviceId”的统一入口，且支持 success/failure 分支

- `packages/logix-core/src/Workflow.ts`：
  - `Workflow.call({ service: Tag, ... })` 通过 Tag 推导稳定 `serviceId`（内部遵守 `specs/078` 口径）
  - `Workflow.callById({ serviceId: string, ... })` 作为 Platform-Grade/LLM 出码的规范形
- `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`：按 `serviceId` 从 Env 解析 port 并执行

结论：Kit 的 Workflow 侧 sugar 应该是“薄封装”，不复制 serviceId 规则，避免并行真相源。

### 0.3 ReadQuery/selectorId 的稳定性已经有门禁与错误语义

- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`：
  - `ReadQuery.compile` 的 lane 与 `fallbackReason` 明确区分 static/dynamic/unstableSelectorId
- `packages/logix-core/src/ExternalStore.ts`：`fromModule` 对 `unstableSelectorId` fail-fast

结论：`Kit.forModule` 必须直接复用 `ExternalStore.fromModule`，不要再包装一层“自定义 selectorId 推导”。

## 1. 核心裁决（Decisions）

### D1：v1 公共子模块命名 = `Kit`

**Decision**：v1 使用 `@logixjs/core/Kit`（并由 `@logixjs/core` 的 `index.ts` 以子模块形式导出）。

**Rationale**：

- 与本次需求（Kit Factory）一致，语义更泛化（不绑定 Router、也不绑定 ServicePort）。
- 便于未来按能力拆分（Input/Workflow/Command），而不让“Port”语义先入为主。

**Alternatives considered**：

- `PortKit`：更贴近“服务端口/桥接”，但不涵盖 Module-as-Source 等更一般的输入 kit。
- `BridgeKit`：容易与平台/宿主 bridge 混淆（可能引来“运行时桥接系统”的误读）。

### D2：Kit 必须是“纯组合器”（macro-like），零副作用

**Decision**：Kit 只返回“描述对象/组合函数”，不注册 watcher/process、不 fork fiber、不创建 Scope，不调用外部 subscribe。

**Rationale**：避免 Kit 变成新运行时子系统，破坏“单一真相源”与性能/诊断预算。

### D3：Identity 只允许两类来源：稳定派生 / 显式传入

**Decision**：

- `serviceId`：必须由 `Workflow.call({ service: Tag })` 或 `Workflow.callById({ serviceId })` 生成（遵守 `specs/078`），Kit 不复制该规则。
- `selectorId`：必须由 `ReadQuery.make`（manual/static）或 `ReadQuery.compile` 的 static/jit 产生；禁止落入 `unstableSelectorId`。
- `stepKey`：Workflow stepKey 必须显式传入，或由调用方在 domain kit 中以确定性规则生成（Kit v1 不做“隐式自动补全”）。

**Rationale**：避免新糖层引入随机 id、隐式规则与双真相源。

### D4：为 tree-shake 与边界清晰，Kit v1 允许“分层导入”

**Decision**：实现上优先做到“只用 Input/Logic sugar 时，不必引入 Workflow 相关路径”：

- 方案 A（优先）：`Kit.ts` 仅提供 `forService/forModule + input/trait/use/layer`；另增 `KitWorkflow.ts`（或同级子模块）提供 `wfCall` 等 Workflow sugar。
- 方案 B（退路）：单文件 `Kit.ts` 同时提供 Workflow sugar，但在文档中声明“namespace import 可能影响 tree-shaking”，并建议按子模块导入。

**Rationale**：减少“万能大对象”带来的 bundler 引入压力；同时保持语义不漂移（Workflow 规则仍以 `Workflow.ts` 为准）。

### D5：externalTrait.meta 只承诺“可被裁剪为 Slim JSON”，并以 `TraitMeta.sanitize` 为单点事实源

**Decision**：

- `InputKit.externalTrait({ meta })` 的 `meta` 语义以 `packages/logix-core/src/internal/state-trait/meta.ts` 的 `TraitMeta + sanitize` 为单点事实源：
  - Root IR/Static IR 只承认白名单字段（其余字段会被裁剪掉，不进入工件）。
  - `annotations` 只保留 `x-*` keys，且 value 必须是 JsonValue（函数/闭包不可导出）。

**Rationale**：平台侧 Root IR MUST JSON 可序列化（见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`），但运行时 DSL 的 meta 允许包含闭包；因此必须明确“可导出 meta 的白名单”与裁剪口径，避免静默漂移。

### D6：`Kit.forModule` 不覆盖“动态实例选择”，只覆盖 imports 可解析的 Module-as-Source

**Decision**：

- `Kit.forModule(module, readQuery)` 语义与 `ExternalStore.fromModule` 对齐：当传入 ModuleTag 时，源模块实例由 imports 唯一解析；不支持“运行时动态选择某个 instance”。
- 若业务需要动态选择，应通过数据建模（显式 instanceKey/rowId）+ `ReadQuery/Logic` 侧解析完成，而不是把动态选择伪装成静态 ExternalStore trait。

**Rationale**：动态实例选择无法稳定进入 Root IR（不可判定/不可 diff），会引入锚点语义漂移与双真相源风险。

### D7：降低 TraitMeta 白名单裁剪的心智负担：提供开发期反馈（不改语义）

**Decision**：

- 提供 `Kit.validateMeta(meta)`（纯函数）：返回可导出的 `exportMeta`（等价于 `TraitMeta.sanitize(meta)`）与裁剪提示（dropped keys），用于 lint/warn。
- 允许在 dev 环境对 `externalTrait({ meta })` 的 meta 做一次提示（warn），避免“写了但没进 Root IR”的困惑。

**Rationale**：Root IR 必须 Slim+可序列化；裁剪不可避免，但必须让开发者在开发期可见、可解释。

### D8：降低 stepKey 手工管理负担：提供确定性 helper（仍保持显式）

**Decision**：

- 提供 `Kit.makeStepKey(prefix, literal)`（纯函数）：用于 domain kit 统一生成稳定 stepKey。
- 仍不做隐式自动补 stepKey，避免规则漂移。

**Rationale**：stepKey 是 IR 稳定锚点；提供 helper 可以减少手写错误，同时不引入隐式规则。

### D9：Domain kit 先在 examples 侧落地，但必须给出单一口径锚点

**Decision**：

- 新增 `specs/093-logix-kit-factory/domain-kit-guide.md` 固化写法口径（meta/stepKey/边界）。
- 在 `examples/logix/src/patterns/router-kit.ts` 提供一个 Router 参考实现，用于验证 API 可用性并作为后续 domain kit 的对照样本。

**Rationale**：避免 domain kit 分散后出现重复实现与口径不一致；先用 examples 验证，再决定是否抽出独立 package。

## 2. 交付物与验证策略（对齐 spec 的可独立验收）

- `data-model.md`：用“最小结构”定义 `ServiceKit/InputKit/ModuleInputKit` 的形状与边界。
- `contracts/*`：固化 public API、稳定身份规则、错误/诊断策略。
- `quickstart.md`：提供两类最小用法（Service 输入+命令；Module-as-Source）。
- 单测（实现阶段）：验证“等价展开 + 稳定 identity + 零副作用”。
