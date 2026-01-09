# Contract: Trial Run 的 servicePorts 对齐报告（声明 ↔ 环境）

## 目标

在试运行/回放对齐时，把“缺服务/冲突服务”的诊断提升到 **端口级**：

- 能定位到 `moduleId + port + serviceId`
- 报告结构 Slim 且可序列化（JSON）
- 输出稳定可 diff（排序/去重）

## 输出形态（示意）

建议在 TrialRunReport 中新增对齐片段（具体落点以实现为准）：

```ts
type ServicePort = { readonly port: string; readonly serviceId: string; readonly optional?: boolean }

type ServicePortsAlignmentResult = {
  readonly moduleId: string
  readonly declared: ReadonlyArray<ServicePort>
  readonly missingRequired: ReadonlyArray<ServicePort>
  readonly missingOptional?: ReadonlyArray<ServicePort>
  readonly conflicts?: ReadonlyArray<{
    readonly serviceId: string
    readonly candidates: ReadonlyArray<{
      readonly ownerModuleId: string
      readonly source: 'module' | 'service'
    }>
  }>
}
```

## 生成规则

### declared

- 直接来自 `ModuleManifest.servicePorts`（稳定排序）。

### missing

- 不依赖“业务代码是否访问到该服务”：
  - 在试运行装配完成后，对每个 declared port 执行一次 root-level resolve 检查。
  - 无法 resolve 的端口：
    - `optional !== true` → 进入 `missingRequired`
    - `optional === true` → 进入 `missingOptional`（不作为 hard-fail 依据，但保留用于解释）

### conflicts（可选）

- 仅当系统掌握“候选来源信息”时输出（例如 app 组合显式声明哪些模块提供了哪些 serviceTags）。
- 否则省略该字段（禁止猜测/静默误报）。

## 稳定性约束

- `missingRequired` 按 `port` 排序；`missingOptional` 按 `port` 排序。
- `conflicts` 按 `serviceId` 排序；每个 candidates 按 `ownerModuleId` 排序。
- 所有输出必须去重（避免重复候选造成噪声）。
