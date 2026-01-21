# Contract: Public API（Kit）

## Scope

本合同只定义 **Kit 的公共 API 形状与语义边界**；不定义新的运行时协议。

## 1) Public Submodule

- `@logixjs/core/Kit`
- `@logixjs/core/KitWorkflow`（Workflow sugar；与 `Kit` 分层以尽量 tree-shake）
- `@logixjs/core` 的 `index.ts` 以子模块形式导出：
  - `export * as Kit from './Kit.js'`
  - `export * as KitWorkflow from './KitWorkflow.js'`

## 2) API（v1）

### 2.1 `Kit.forService(tag)`

输入：一个稳定 `Context.Tag`（作为端口唯一身份锚点）。

输出：`ServiceKit`（见 `data-model.md`），至少包含：

- `tag`
- `layer(service)`：`Layer.succeed(tag, service)`
- `use($)`：等价于 `$.use(tag)`
- `input(pick)`：等价于 `ExternalStore.fromService(tag, pick)` 再包装为 `InputKit`

语义约束：

- `forService` 与 `input(pick)` **不得**在创建阶段调用 `pick` 或触发订阅。
- `layer` 的环境必须闭合（R=never），避免把未满足依赖塞进 React 组件树。

### 2.2 `Kit.forModule(module, readQuery)`

输入：

- `module`：ModuleTag/Module/ModuleImpl/ModuleRuntime（必须能解析 moduleId；禁止只读 ModuleHandle）
- `readQuery`：`ReadQueryInput<S, V>`（必须稳定：禁止 `unstableSelectorId`）

输出：`InputKit<V>`（`store = ExternalStore.fromModule(...)`）。

语义约束：

- `unstableSelectorId` 必须 fail-fast（复用 `ExternalStore.fromModule` 的错误语义）。

### 2.3 `InputKit.externalTrait(opts?)`

输出等价于：

- `StateTrait.externalStore({ store: inputKit.store, ...opts })`

并继承 external-owned 写入纪律。

关于 `opts.meta`：

- `meta` 只承诺“可被裁剪为 Slim JSON 并进入 Root IR”，不承诺原样保留；
- Static IR 导出会按 `packages/logix-core/src/internal/state-trait/meta.ts` 的 `sanitize` 白名单裁剪：
  - 支持：`label/description/tags/group/docsUrl/cacheGroup/canonical`
- `annotations` 仅保留 `x-*` keys，且 value 必须是 JsonValue（函数/闭包会被裁剪掉）

### 2.4 `Kit.validateMeta(meta)`（开发期工具）

输入：任意 `meta`（建议传入你准备交给 `externalTrait({ meta })` 的对象）。

输出：用于“导出到 Root IR 的 meta 视图”与“被裁剪掉的字段提示”，至少包含：

- `exportMeta`：等价于 `TraitMeta.sanitize(meta)` 的结果（可为 `undefined`）
- `droppedKeys`：被裁剪掉的 top-level keys（以及 `annotations` 内非 `x-*` keys）的稳定列表（用于 warn/lint）

语义约束：

- 必须纯函数、无副作用（仅用于开发期反馈）。
- 不改变 `externalTrait({ meta })` 的运行时语义：meta 仍允许包含不可导出字段，只是不会进入 Root IR。

### 2.5 `Kit.makeStepKey(prefix, literal)`

输出：一个稳定、确定性的 workflow stepKey（用于 `Workflow.call({ key })` / `KitWorkflow.call({ key })`）。

约束：

- 必须确定性（不得依赖随机/时间/地址）。
- 仅做最小拼装（例如 `${prefix}.${literal}`）；不做隐式自动补全。

### 2.6 `KitWorkflow.forService(tag)`

输入：一个稳定 `Context.Tag`（端口契约唯一真相源）。

输出：Workflow-side 的薄封装（纯数据构造），至少包含：

- `call(args)`：等价于 `Workflow.call({ service: tag, ...args })`（**必须**委托 `Workflow.call/callById`，不得复制 Tag→serviceId 规则）

## 3) Non-goals（v1 明确不做）

- 不自动补 `Workflow.stepKey`（避免隐式规则与漂移；但允许提供 `makeStepKey` 之类的确定性 helper）。
- 不引入新的运行时服务/调度/订阅系统（Kit 不 fork、不 subscribe）。
- 不复制 `Tag→ServiceId` 规则（避免并行真相源）；Workflow 相关 sugar（`KitWorkflow`）**必须**委托 `Workflow.*`。
