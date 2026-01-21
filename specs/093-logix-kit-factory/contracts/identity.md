# Contract: Identity（稳定标识）

## 0) 目标

Kit 只能“组合既有规则”，不得引入新的 id 规则或默认值来源；所有稳定标识必须：

- 可确定重建（deterministic）
- 无随机/时间默认
- 可用于 IR/诊断/回放对齐

## 1) ServiceId（Tag → serviceId）

来源：`specs/078-module-service-manifest`（Tag→ServiceId 合同）。

规则摘要：

- serviceId 从 `Context.Tag` 的稳定 id 推导（优先 `tag.key`，再 `tag.id`，再 `tag._id`）
- 禁止用 `tag.toString()` 作为 identity 来源（仅诊断用途）

实现入口（事实源）：`packages/logix-core/src/internal/serviceId.ts`

Kit 约束：

- Kit 不复制该推导规则；
- Workflow sugar 必须调用 `Workflow.call({ service: Tag, ... })` 或 `Workflow.callById({ serviceId })`。

## 2) ExternalStore storeId

storeId 由 `ExternalStore` sugar 的 descriptor 确定性生成（例如 service kind 的 tagId、module kind 的 moduleId+selectorId）。

实现入口（事实源）：`packages/logix-core/src/ExternalStore.ts`

Kit 约束：

- `Kit.forService(...).input(...)` 必须直接复用 `ExternalStore.fromService`；
- `Kit.forModule(...)` 必须直接复用 `ExternalStore.fromModule`。

补充：Module-as-Source 的 instanceId 边界

- `ExternalStore.fromModule` 的 storeId 目前只由 `{ moduleId, selectorId }` 生成；`instanceId`（如存在）是 **额外锚点**，用于 install/runtime 期校验与解析，而不是 storeId 组成部分。
- 因此 `Kit.forModule` 只适合“imports 可解析到唯一源模块实例”的场景；不应把“动态选择某个 instance”塞进 `forModule`（那会导致锚点语义漂移/不可判定）。
- 反模式：试图用“运行时条件分支”去选择源模块实例（或用同一个 ModuleTag 表达多个实例）。正确做法是把 `instanceKey/rowId` 等显式建模为数据，用 `ReadQuery/Logic` 侧选择。

## 3) selectorId（ReadQuery）

selectorId 必须稳定：

- 优先由 `ReadQuery.make({ selectorId, reads, ... })` 显式提供（manual/static）
- 允许 `ReadQuery.compile` 的 static/jit lane（但禁止落入 `unstableSelectorId`）

实现入口（事实源）：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`

Kit 约束：

- `Kit.forModule` 必须继承 `ExternalStore.fromModule` 的 `unstableSelectorId` fail-fast。

## 4) Workflow stepKey

stepKey 是 Workflow Static IR 与回写/诊断的稳定锚点（见 `specs/075-workflow-codegen-ir`）。

Kit v1 约束：

- Kit 不自动补 stepKey；
- Domain kit（Router/Session/Flags…）如需批量生成 stepKey，必须用确定性规则（例如固定前缀 + 业务字面量）。
- 推荐 helper：`Kit.makeStepKey(prefix, literal)`（prefix=端口/领域名；literal=操作名），用于统一口径并减少手写错误。
