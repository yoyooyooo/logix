---
title: intent-flow · 目录地图与落点
status: draft
version: 1
---

> 本 reference 给出比 `project-guide/SKILL.md` 更细的“目录地图”，用于在出现分歧时快速裁决：该改 specs 还是改代码、该落在哪个包。

## 1. 这仓库在做什么（一句话）

把「Intent（What）」落到「Logix Runtime（Effect-native）」与「可对齐/可回放的工程化链路」上：概念与协议在 `docs/ssot` 收敛，运行时实现落在 `packages/logix-*`，可运行的场景验证落在 `examples/*`，面向最终用户的文档落在 `apps/docs`。

## 2. SSoT 裁决（冲突时用这个）

1. 概念与术语：`docs/ssot/platform/*`（尤其 `docs/ssot/platform/foundation/02-glossary.md`）
2. Runtime 编程模型：`docs/ssot/runtime/logix-core/*`
3. 真实类型与实现：`packages/logix-core/src/*`（公共出口：`packages/logix-core/src/index.ts`）
4. 场景与模式验证：`examples/logix/*`

## 3. 目录速查（按“要改什么”索引）

- Runtime 核心（Module/Logic/Bound/Flow/Runtime）：`packages/logix-core/`
- React 适配（Provider/hooks）：`packages/logix-react/`
- Devtools UI：`packages/logix-devtools-react/`
- Sandbox / Alignment Lab：`packages/logix-sandbox/`
- 运行时规范（核心文档）：`docs/ssot/runtime/`
- Intent/平台规范（概念层/平台层）：`docs/ssot/platform/`
- 平台闭环与交互草案（Workbench）：`docs/specs/sdd-platform/workbench/`
- 场景与 Pattern（可运行示例）：`examples/logix/`
- 用户文档（产品视角）：`apps/docs/`

## 4. 推荐自检问题（用于快速收敛落点）

1. 这次改动改变的是“术语/边界/契约”还是“实现细节”？
2. 受影响的用户是谁：业务作者（Bound API `$`）、库作者（Runtime/Layer）、平台侧（IntentRule/IR）？
3. 变更的最终裁决点在哪：`docs/ssot/runtime/logix-core/*` 还是 `packages/logix-core/src/*`？
4. 有没有一个 `examples/logix/src/scenarios/*` 可以作为回归样板或新增样板？

## 5. 最短入口（新会话）

- `docs/specs/sdd-platform/README.md`：平台侧总入口（含 Workbench + SSoT）
