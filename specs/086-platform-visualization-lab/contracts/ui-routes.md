# Contracts: UI Routes & Inputs（086 · Platform Visualization Lab）

本文件固化 086 的“路由/输入契约”，用于保证 PoC 可重复演示与最小回归面稳定。

## Routes

- `/platform-viz`：入口页（能力块导航 + pending 清单 + 直达 TrialRun Evidence）
- `/platform-viz/manifest`：Manifest Inspector（模块选择 → `Reflection.extractManifest`）
- `/platform-viz/manifest-diff`：Manifest Diff Viewer（模块选择/JSON 粘贴 → `Reflection.diffManifest`）
- `/trial-run-evidence`：复用既有页面（本特性只提供直达入口）

## Inputs

### Manifest Inspector

- 输入：`ModuleCandidate`（仅模块选择模式）
- 可调参数：
  - `includeStaticIr`（default off）
  - `maxBytes`（default off）

### Manifest Diff Viewer

- before/after 输入：二选一或混用
  1) 模块选择：`ModuleCandidate`
  2) JSON 粘贴：`ModuleManifest` JSON（文本输入）
- 可调参数（仅在“模块选择模式”生效）：before/after 共用同一组选项
  - `includeStaticIr`（default off）
  - `maxBytes`（default off）

## JSON Paste Validation（最小字段校验）

对粘贴的 JSON 只做最小字段校验（避免引入额外 schema validator 依赖）：

- MUST 是对象
- MUST 包含：
  - `moduleId: string`
  - `digest: string`
  - `manifestVersion: string`
- SHOULD（缺失不阻止，但会影响 diff 信号）：
  - `actionKeys: string[]`
  - `actions: unknown[]`

解析/校验失败时：

- MUST 展示可解释错误信息
- MUST 阻止 diff 计算（不得崩溃/空白）

