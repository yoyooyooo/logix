# Quickstart: 078 Module↔Service 关系纳入 Manifest IR（怎么用/怎么验收）

## 1) 业务侧怎么声明模块输入服务？

在 `Logix.Module.make` 中声明 `services`（端口名 → Tag）：

- 端口名用于平台/Devtools 定位与解释（例如 `archiver` / `backupSvc`）。
- 若不需要额外解释，推荐默认约定 `port = serviceId`，仅在需要更强语义时再改为短别名（见 `contracts/module-manifest-service-ports.md`）。
- Tag 的稳定标识将成为 `ServiceId`（见 `contracts/service-id.md`）。
- 若某服务为可选依赖，可显式声明为 `{ tag: ServiceTag, optional: true }`：缺失不会导致试跑 hard-fail，但仍会进入对齐报告用于解释。
- `KernelPorts`（运行时内置端口）同样必须具备稳定 `ServiceId`，并进入 `servicePorts`/TrialRun 对齐链路（见 `contracts/kernel-ports.md`）。

## 2) 平台侧怎么导出 Manifest（含 servicePorts）？

使用 `Logix.Reflection.extractManifest(module)` 导出 Manifest IR，并读取 `servicePorts`：

- `moduleId`：模块标识
- `servicePorts`：端口名 + ServiceId（稳定排序，可 JSON 序列化/可 diff）

## 3) 怎么做 diff（门禁）？

使用 `Logix.Reflection.diffManifest(before, after)`：

- 若 `servicePorts` 发生新增/删除/变更，diff 必须稳定捕获（见 `contracts/module-manifest-service-ports.md`）。

## 4) 怎么做试运行对齐（缺失/冲突诊断）？

使用 `Logix.Observability.trialRunModule(rootImpl, { layer, diagnosticsLevel, ... })`：

- 试运行报告应包含 `servicePorts` 的对齐结果（至少 missing 端口清单）。
- 缺失项必须能定位到 `moduleId + port + serviceId`（见 `contracts/trial-run-service-ports-alignment.md`）。

## 5) Devtools 怎么看？

Devtools 需要展示：

- 模块维度：`port → serviceId`
- 服务维度：`serviceId → [moduleId:port]`

约束与建议见：`contracts/devtools-module-services-surface.md`。
