# 078 · TL;DR（Module↔Service Manifest：servicePorts）

目标：把 `ModuleDef.services` 的显式声明导出为 Manifest IR 的 `servicePorts`（portName + `ServiceId` + `optional?`），用于平台诊断/回放/门禁。

当前状态：`spec/plan/tasks/contracts` 已齐；`specs/078-module-service-manifest/contracts/service-id.md` 已修正换行瑕疵；代码尚未实现。

下一步：按 `specs/078-module-service-manifest/tasks.md` Phase 2 从 **T005–T012** 开始（统一 `serviceIdOf` → 导出 `servicePorts` → bump version/digest → 单测）。

