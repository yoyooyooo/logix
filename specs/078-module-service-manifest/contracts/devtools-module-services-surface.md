# Contract: Devtools 的 Module↔Service 视图（servicePorts）

## 目标

让 Devtools 能解释：

- 某个模块声明依赖哪些服务（端口名 → ServiceId）
- 某个 ServiceId 被哪些模块依赖（反向索引）
- 缺失/冲突时如何定位到端口级锚点

## 最小数据面

- `moduleId: string`
- `servicePorts: Array<{ port: string; serviceId: string }>`

数据来源（权威顺序）：

1. 平台侧/CI：直接消费 `Reflection.extractManifest` 的输出（Manifest IR）。
2. 运行期 Devtools：使用“dev-only registry”从 `moduleId` 查到 `servicePorts`（仅用于 UI 解释；不能替代 Manifest/TrialRunReport 的导出事实源）。

## API 形态（建议）

- `Logix.Debug.getModuleServicePortsById(moduleId): { servicePorts?: ... } | undefined`
- 或 `Logix.Debug.getModuleManifestById(moduleId): ModuleManifest | undefined`（若成本可控）

## 展示建议（UI）

- 模块详情页：以表格展示 `port` 与 `serviceId`（可复制、可筛选）。
- ServiceId 聚合视图：点击 `serviceId` 展示所有 consumers（`moduleId:port` 列表）。
- 对齐/诊断视图：若 Trial Run 报告包含 missing/conflicts，按 `moduleId+port` 高亮并提供跳转。
