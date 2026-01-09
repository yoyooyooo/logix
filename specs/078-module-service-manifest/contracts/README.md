# 078 Contracts（Module↔Service Manifest / ServiceId）

本目录固化 078 的对外可消费口径（平台/CI/Devtools）：

- 单一真相源：源码锚点（`Module.make({ services })`）→ `Reflection.extractManifest` → `ModuleManifest.servicePorts`
- `TrialRun` / `Spy` 仅作为 evidence（证据）与校验输入，不得形成并行权威

## 文档（人读）

- `contracts/service-id.md`：`Context.Tag` → `ServiceId` 的权威规则（必须单点实现）
- `contracts/module-manifest-service-ports.md`：`ModuleManifest.servicePorts` 的语义与约束
- `contracts/trial-run-service-ports-alignment.md`：试运行对齐报告的端口级缺失定位
- `contracts/devtools-module-services-surface.md`：Devtools 展示/查询建议（dev-only 辅助解释）

## Schemas（机器读）

- `contracts/schemas/module-manifest-service-port.schema.json`：`ServicePort`
- `contracts/schemas/module-manifest.schema.json`：`ModuleManifest@078`（包含 `servicePorts`）

## 不变量（MUST）

- 所有字段必须 JSON-safe、稳定排序、可 diff
- `ServiceId` 生成规则禁止在多处复制粘贴（必须复用单点 helper）
