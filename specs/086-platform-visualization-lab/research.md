# Research: Platform Visualization Lab（086：IR / Evidence 消费者可视化 POC）

**Date**: 2026-01-12  
**Spec**: `specs/086-platform-visualization-lab/spec.md`  
**Plan**: `specs/086-platform-visualization-lab/plan.md`

> 本文件只固化“关键裁决/权衡”，用于把 086 的可视化 PoC 变成可复用的消费者回归面，避免 UI 侧形成并行真相源。

## Decisions

### D001：落点选择：`examples/logix-react` 的独立路由组 `/platform-viz/*`

**Decision**：本特性只在 `examples/logix-react` 落地独立路由组；不在 `packages/logix-devtools-react` 内新增正式 Devtools 面板。  
**Rationale**：先验证“单项能力块”的解释粒度与信息架构；同时把它作为 IR 变更的 UI 回归面，避免过早绑定正式 Devtools 组织形态。  
**Alternatives considered**：
1) 直接扩展 `packages/logix-devtools-react`：会把 PoC 体验与正式面板耦合，迭代成本更高。  
2) 复用 `examples/logix-sandbox-mvp` 的 `/ir`：信息量更大但目标不同（它偏“全套工作台雏形”，不符合“独立颗粒度”验证）。

### D002：数据事实源：只消费 `@logixjs/core` 的 Reflection/TrialRun 输出

**Decision**：Manifest/Diff 的所有展示以 `Logix.Reflection.extractManifest` 与 `Logix.Reflection.diffManifest` 的输出为唯一事实源；页面不自定义并行字段模型。  
**Rationale**：086 的价值在于做“消费者回归面”；若 UI 自己再造一份模型，会掩盖真实漂移。  
**Alternatives considered**：UI 侧做二次归一化/派生 IR（会产生并行真相源，违背目标）。

### D003：Diff 的输入形态：模块选择 + JSON 粘贴（最小校验）

**Decision**：Diff Viewer 支持两类输入：选择预置模块（内部 `extractManifest`）或粘贴 `ModuleManifest` JSON；粘贴输入仅做最小字段校验，失败必须可解释并阻止计算。  
**Rationale**：同时覆盖“本地模块对照”与“从外部工件复制过来快速定位”的真实使用方式；最小校验能防止 silent bad input。  
**Alternatives considered**：只支持模块选择（不利于跨会话/跨分支对比与粘贴工件调试）。

### D004：可解释裁剪：暴露 `includeStaticIr` / `budgets.maxBytes`（默认关闭）

**Decision**：Manifest Inspector 与 Diff Viewer 都暴露 `includeStaticIr` 与 `maxBytes`；默认都关闭，裁剪时展示 `meta.__logix` 标记提示。  
**Rationale**：086 需要验证“预算/裁剪”在 UI 层是否可解释；但默认路径保持轻量，避免大对象渲染影响体验。  
**Alternatives considered**：默认开启 `includeStaticIr`（会把多数页面拉到重模式，且与“独立颗粒度”演示目标冲突）。

### D005：未来字段提示：固定 pending 清单（对齐 080）

**Decision**：页面固定展示 pending spec 清单：`078 servicePorts`、`031 artifacts`、`035 portSpec/typeIr`、`081/082/085` 工件。  
**Rationale**：当前 `ModuleManifest.manifestVersion=067` 还不包含上述字段；固定清单能避免用户把“尚未实现”误判为 bug。  
**Alternatives considered**：只在字段出现时展示（现阶段无法表达“缺失但预期将来存在”的信息）。

