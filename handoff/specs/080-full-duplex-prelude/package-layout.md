# 080 · Package Layout（包拆分与形态裁决草案）

> 目标：把“构建期能力”从 runtime 包里隔离出去，避免把重型 AST/Node-only 依赖带入浏览器/运行时热路径。

## 哪些能力是“构建期（build-time）依赖”

- **Platform-Grade Parser（081）**：仓库扫描、受限子集识别、AnchorIndex 输出 → 必须 Node-only（依赖 `ts-morph`）。
- **Platform-Grade Rewriter（082）**：PatchPlan 生成与写回 → 必须 Node-only（依赖 `ts-morph`，必要时 `swc` 辅助）。
- **Autofill write-back（079）**：把缺失的锚点声明写回源码 → 依赖 081/082 的解析与回写能力 → Node-only。

其余（Manifest/TrialRun/Artifacts/PortSpec/ActionSurface/ServicePorts/Spy evidence）属于：

- “检查/导出工件链路”（可在构建或 CI 执行，但不要求 AST），应尽量留在 runtime 包（`@logixjs/core`）与其消费者（devtools/sandbox）侧。

## 建议新增的 Node-only 包

### 1) `@logixjs/anchor-engine`（Node-only Engine）

- 职责：承载 `081/082` 的 AST 解析/回写、AnchorIndex/PatchPlan 的 schema 与 reason codes。
- 技术：`effect` + `ts-morph`（必要时 `swc`）。
- 原则：不依赖浏览器环境；输出永远是 JSON-safe 工件。

### 2) `@logixjs/cli`（Node-only CLI）

- 职责：把 core 的 IR/试跑导出 + anchor-engine 的索引/回写串起来，提供子命令作为“验证入口 + 集成测试跑道”。
- 技术：尽可能 `effect`（命令/参数/Layer 组合同构）。
- 子命令建议：
  - `logix ir export`（Manifest/StaticIR/Artifacts）
  - `logix trialrun`（TrialRunReport）
  - `logix anchor index`（AnchorIndex@v1）
  - `logix anchor autofill --report|--write`（AutofillReport@v1 + 写回）

## 已有包的归属建议

- `@logixjs/core`：保留运行时与“可反射/可试跑/可序列化导出”的能力（不引入 `ts-morph/swc`）。
- `@logixjs/sandbox`：继续承载浏览器 Worker / Vite 相关能力；未来若有编辑器集成可在此消费 IR，但不承载 Node-only AST 引擎。
- `@logixjs/devtools-react`：消费 IR/证据用于展示，不承载 AST 引擎。

## 待在 plan 阶段固化的细节

- `@logixjs/anchor-engine` 的 API 表面（导出哪些 command/service Tag）
- 输出工件的文件命名与落盘位置（CI 需要稳定路径）
- `swc` 在链路中的具体职责（仅 parse/print？还是仅用于某类降级？）
