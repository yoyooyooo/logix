# Quickstart: 组件 + Chrome 插件（目标用法）

> 说明：本文描述“实现完成后的预期接入体验”，用于指导后续实现对齐与验收。

## 1) 组件形态（应用内嵌面板）

- 应用运行时启用 Devtools/观测（示例语义）：
  - 创建 Runtime 时打开 devtools（例如启用 DebugObserver + DevtoolsHub/观测桥接）。
  - 在页面中挂载 `@logix/devtools-react` 的面板组件。
- 验收要点：
  - 面板可展示时间线/概览/错误诊断；
  - 导出证据包后可在插件形态导入得到一致结论（见 `spec.md` 的 SC-002）。

## 2) 插件形态（Chrome Devtools 面板）

- 在 Chrome 中加载未打包扩展（unpacked extension）后：
  - 打开目标页面；
  - 打开扩展 Devtools 面板；
  - 面板连接到当前页面并展示实时观测。
- 验收要点：
  - 面板对被测页面的干扰明显低于内嵌面板；
  - 导入由组件形态导出的证据包后，关键计数与顺序可复现。

## 3) 可选：Worker/Sandbox 验证

- 在 Worker 运行入口中产出同样的观测 Envelope（含 `runId/seq`），并可被同一聚合引擎消费。

