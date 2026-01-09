# Quickstart: 组件 + Chrome 插件（目标用法）

> 说明：本文描述“实现完成后的预期接入体验”，用于指导后续实现对齐与验收。

## 1) 组件形态（应用内嵌面板）

- 应用运行时启用 Devtools/观测（示例语义）：
  - 创建 Runtime 时打开 devtools（例如启用 DebugObserver + DevtoolsHub/观测桥接）。
  - 在页面中挂载 `@logixjs/devtools-react` 的面板组件。
- 验收要点：
  - 面板可展示时间线/概览/错误诊断；
  - 导出证据包后可在插件形态导入得到一致结论（见 `spec.md` 的 SC-002）。

## 2) 插件形态（Chrome Devtools 面板）

- 在 Chrome 中加载未打包扩展（unpacked extension）后：
  - 打开目标页面；
  - 打开扩展 Devtools 面板；
  - **P1（离线）**：在面板中导入由组件形态导出的 EvidencePackage，并展示一致视图。
  - **P2（实时，Deferred）**：面板连接到当前页面并展示实时观测（需要 transport + 背压 + 命令回路）。
- 验收要点：
  - P1：导入由组件形态导出的证据包后，关键计数与顺序可复现（见 `spec.md` 的 SC-002）。
  - P2：面板对被测页面的干扰明显低于内嵌面板（见 `spec.md` 的 SC-001 / FR-012）。

## 3) 可选：业务 Worker/Sandbox 验证

> 注：这里的“业务 Worker”指被测运行时在 Worker 中执行的入口；与 Devtools 的“聚合 Worker（FR-012，Worker-first）”是两件事。

- 在业务 Worker 运行入口中产出同样的观测 Envelope（含 `runId/seq`），并可被同一聚合引擎消费。
