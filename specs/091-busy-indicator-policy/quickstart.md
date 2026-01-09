# Quickstart: 091 Busy Indicator Policy

本 quickstart 用于实现后的验收与回归；实现任务见 `specs/091-busy-indicator-policy/tasks.md`。

## 1) 行为验收（delay/minDuration）

- 示例路径：`examples/logix/src/scenarios/busy-indicator/*`（按 tasks 落地路径为准）
- 覆盖路径：
  - 快操作：delay 内完成，busy 不出现
  - 慢操作：delay 后出现，且至少持续 minDuration

## 2) 并发/嵌套验收

- 并发 pending：busy 聚合且不产生多个指示（默认避免 over-feedback）
- 嵌套 BusyBoundary：内外裁决稳定可预测

## 3) 可访问性验收

- 默认 BusyBoundary 输出最小 aria 语义（例如 `aria-busy`），不破坏输入/焦点
