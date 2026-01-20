# Contract: KernelPorts（内核端口作为 Service Surface）

## 目标

把“内核能力端口（KernelPorts）”收敛为 **普通 service ports**，确保它们：

- 可被稳定标识（`serviceId`）；
- 可进入 `ModuleManifest.servicePorts` 与 TrialRun 对齐链路；
- 可被 Workflow/Π 的 `call(serviceId)` 引用并在 Trace/Tape 中回链到 Root IR；
- 不形成“手写特权路径”（避免绕开 `servicePorts` 导致不可诊断/不可回放）。

## 命名空间（v1，裁决）

- `serviceId` 命名空间：`logix/kernel/*`
- 示例（v1 最小集）：
  - `logix/kernel/sourceRefresh`

> 说明：KernelPorts 的命名属于平台协议面；变更必须通过版本化与迁移说明推进（forward-only）。

## 表达方式（对外）

- Workflow（075）中通过 `callById('logix/kernel/sourceRefresh')` 或 `call(KernelPorts.SourceRefresh)`（TS sugar）表达；
- 静态导出/对齐/回放时一律以 `serviceId: string` 为唯一真相源（对齐 `contracts/service-id.md`）。

## 与 `servicePorts` 的关系

- KernelPorts 依赖必须像普通服务一样进入 `ModuleDef.services`（可手写声明或由 079 保守补全回写）。
- TrialRun 对齐（缺失/冲突）必须能定位到 `moduleId + port + serviceId`（`serviceId` 可能是 `logix/kernel/*`）。

## 关联裁决

- ServiceId 单点算法：`specs/078-module-service-manifest/contracts/service-id.md`
- Workflow/Π 的 call 语义与锚点：`specs/075-workflow-codegen-ir/contracts/public-api.md`
- Root IR 回链与锚点去随机化：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
