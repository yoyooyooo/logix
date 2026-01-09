# Contract: ModuleManifest.servicePorts（模块输入依赖端口）

## 目标

把模块的“输入服务依赖”变成平台可消费的 Static IR：

- 可枚举（平台/Devtools 可构建关系图谱）
- 可序列化（JSON）
- 可 diff（稳定排序 + 版本化 digest）
- 可门禁化（CI/试运行可对齐检查）

## 字段定义

在 `ModuleManifest` 中新增可选字段：

```ts
type ServicePort = {
  readonly port: string
  readonly serviceId: string
  readonly optional?: boolean
}

type ModuleManifest = {
  // ...
  readonly servicePorts?: ReadonlyArray<ServicePort>
}
```

语义：

- `servicePorts` 表示 **模块输入依赖**（消费者视角），不是“本模块提供哪些服务”。
- `port` 是模块内的端口名（定位/解释锚点）。
- `serviceId` 是稳定服务标识（聚合/对齐锚点），规范见 `contracts/service-id.md`。
- `optional` 表示“可选依赖”（缺失时不应导致试跑/对齐 hard-fail）；默认省略表示 required。

## 命名约定（推荐）

- 默认约定：`port = serviceId`，仅在需要更强解释/语义区分时，再使用更短的业务别名（例如 `archiver` / `backupSvc`）。
- 端口名的选择属于“解释层”资产：应保证稳定可 diff；变更端口名必须能在 diff 中被解释为“端口名变更”（而非依赖漂移）。

## 来源与一致性

来源：

- `servicePorts` 从模块定义对象的 `services` 反射字段导出：
  - `services: Record<port, Context.Tag>`（默认 required）
  - `services: Record<port, { tag: Context.Tag; optional?: true }>`（显式可选依赖）

一致性约束：

- `servicePorts` 必须稳定排序（按 `port` 字典序）。
- 端口名必须非空；否则视为无效声明（dev 环境应报错或诊断）。
- 导出的 Manifest 必须 JSON 可序列化；不得包含 Tag 对象引用。

## 版本与 digest

- Manifest schema 变更必须 bump `manifestVersion`。
- `servicePorts` 必须进入 digestBase（否则 servicePorts 变化无法被 digest/diff 门禁捕获）。

## Budgets（裁剪策略）

- `servicePorts` 属于平台诊断关键字段，裁剪优先级应低于 `meta/source/staticIr/logicUnits/...`。
- 若 `maxBytes` 触发裁剪，优先裁剪低价值字段与大对象（例如 `staticIr`、`effects`、`actions` 尾部），避免让 `servicePorts` 变成不可用。
