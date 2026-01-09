# TL;DR（全双工前置：078–085）

更新时间：2026-01-09

目标：打穿 “源码锚点=单一真相源” 的全双工前置链路（M2：081/082/079/085 + 补齐 078；M3：084/083 仅在 M2 达标后推进）。

本次已做（落盘到 `specs/*` SSoT）：

- 修复 078 `ServiceId` contract 文档里误写的字面 `\\n`（已改成真实换行）。
- 083/084/085 已回灌 plan-from-questions 的 Q022–Q033（plan/spec/tasks/contracts 对齐）。
- 079 `tasks.md` 补充“已显式声明但不完整”只做 deviation 输出（写到 `reason.details`，不写回）。

下一步（最短路径）：先实现 078（servicePorts）→ 081 Parser → 082 Rewriter → 079 Autofill → 085 CLI；M2 打穿后再做 084 Spy / 083 Slots。

