---
title: Observability
description: Evidence package 协议与工具函数，用于导出/导入可序列化证据包与 trial-run artifacts。
---

Observability 提供 **evidence package**（可序列化证据包）的协议类型与工具函数，用于跨环境携带 trace 与 artifacts。

典型用途：

- 从运行中的应用导出 debug/evidence 数据，
- 在其它环境导入并做分析/回放类处理，
- 注册/导出 trial-run 产物（artifacts）。

## 常用入口

- `Observability.protocolVersion`：协议版本号。
- `Observability.exportEvidencePackage(...)` / `Observability.importEvidencePackage(...)`
- Trial-run artifacts：
  - `registerTrialRunArtifactExporter(...)`

## 延伸阅读

- [Guide: 调试与 DevTools](../../guide/advanced/debugging-and-devtools)
- [/api-reference](/api-reference)
