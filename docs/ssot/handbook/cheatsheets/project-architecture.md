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

## 6. 项目与编码规范（入口，不新增真相源）

> 本仓的“规范”主要以可执行门禁与 Agent 协议形态存在；这里仅做导航，避免重复写一份第二口径。

- 质量门与验证（一次性、可在 CI 复现）：`quality-gates.md`
- Public Submodules 与导入约定（避免深层 internal 漂移）：`public-submodules.md`
- Agent 协议与并行开发安全约束：仓库根 `AGENTS.md`

## 7. 架构指导（边界 / 依赖方向 / 演进）

> 遇到“这能力属于哪个层/该落在哪个包/依赖方向是否允许”的问题，优先从这些入口下钻：

- 长链路总索引（A–K，按 plane 分解）：`long-chain-index.md`
- 子包用法速查（用户视角，帮助确定“该用哪个包”）：`packages-user-view.md`
