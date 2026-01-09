# Data Model: 078 Module↔Service 关系纳入 Manifest IR（平台可诊断/可回放）

## Entities

### ServiceId

服务的稳定字符串标识，用于：

- Manifest IR 的跨模块聚合（同一 ServiceId 的 consumers 集合）。
- Trial Run/回放对齐（声明 vs 环境）。
- 诊断与 Devtools 展示（稳定、可 diff 的锚点）。

约束：

- MUST 是可序列化字符串（JSON）。
- MUST 稳定（同一服务跨进程/跨运行一致）。
- 生成规则见 `contracts/service-id.md`（权威）。

### ServicePort

模块声明的一项“输入依赖端口”。

```ts
type ServicePort = {
  readonly port: string
  readonly serviceId: ServiceId
  readonly optional?: boolean
}
```

约束：

- `port` MUST 是非空字符串，且在同一模块内唯一。
- `serviceId` MUST 满足 ServiceId 约束。
- `optional` 仅当显式为 `true` 时表示可选依赖；默认省略表示 required。
- 对外展示与 diff MUST 使用稳定排序（例如按 `port` 排序）。

### ModuleManifest（扩展）

在现有 `ModuleManifest` 上新增：

```ts
type ModuleManifest = {
  readonly manifestVersion: string
  readonly moduleId: string
  // ...existing fields...
  readonly servicePorts?: ReadonlyArray<ServicePort>
}
```

语义：

- `servicePorts` 是模块的输入依赖端口声明（来自 `ModuleDef.services`）。
- `servicePorts` 是 Static IR 的一部分，必须纳入 digest（避免漂移）。

### ServicePortsAlignmentResult（Trial Run 输出）

试运行/对齐检查的可序列化结果（示意）：

```ts
type ServicePortsAlignmentResult = {
  readonly moduleId: string
  readonly declared: ReadonlyArray<ServicePort>
  readonly missingRequired: ReadonlyArray<ServicePort>
  readonly missingOptional?: ReadonlyArray<ServicePort>
  readonly conflicts?: ReadonlyArray<{
    readonly serviceId: ServiceId
    readonly candidates: ReadonlyArray<{
      readonly ownerModuleId: string
      readonly source: 'module' | 'service'
    }>
  }>
}
```

约束：

- 所有字段 MUST JSON 可序列化（Slim）。
- `missingRequired` 必须能定位到端口（`port`）与稳定服务标识（`serviceId`），且应作为试跑 hard-fail 的依据。
- `missingOptional` 若存在：只用于解释与提示，不作为 hard-fail 依据。
- `conflicts` 仅在系统掌握候选来源信息时输出；否则省略（不猜测）。

## Invariants（稳定性与可 diff）

- 排序：所有数组输出必须稳定排序（端口按 `port`，候选按 `ownerModuleId` 等）。
- 去重：对齐结果与 diff 结果必须去重（避免重复候选造成噪声）。
- 版本：Manifest schema 变更必须 bump `manifestVersion`，并纳入 digest 前缀（避免“同版不同义”）。

## Budgets（体积与裁剪）

默认 budgets 原则：

- `servicePorts` 属于平台诊断关键字段，应尽量保留。
- 若 `maxBytes` 触发裁剪，应优先裁剪低价值字段（如 meta/source/staticIr/logicUnits 等），最后才裁剪 `actions` 列表。
