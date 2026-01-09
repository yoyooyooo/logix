# Research: TrialRun Artifacts（031：artifacts 槽位 + RulesManifest）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/plan.md`

> 本文件只固化“关键裁决/权衡”，详细实现链路外链到 runtime SSoT：  
> `.codex/skills/project-guide/references/runtime-logix/logix-core/api/06-reflection-and-trial-run.md`  
> `.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`

## Decision 1：artifacts 必须是“概念域命名”，不绑定实现包

**Decision**：`artifactKey` 是协议命名空间（契约域），不得使用实现包名前缀（如 `core/sandbox/react`）。  
**Rationale**：避免“实现迁移导致 key 漂移”，让 Workbench/CI/Agent 只认稳定契约。  
**Example**：`@logixjs/form.rulesManifest@v1`、`@logixjs/module.portSpec@v1`。

## Decision 2：artifacts 采用 Envelope，显式表达 ok/error/truncation

**Decision**：`TrialRunReport.artifacts` 采用 `Record<ArtifactKey, ArtifactEnvelope>`，而不是裸 `JsonValue`。  
**Rationale**：

- 031 的核心约束之一是“单项失败不阻塞”与“预算/截断可解释”；裸值很难表达这些状态。
- 统一 Envelope 让平台/CI 的消费者无需读日志/猜测即可判定 `PRESENT/TRUNCATED/FAILED`。

## Decision 3：RulesManifest 的 schema 复用 028（单一事实源）

**Decision**：`@logixjs/form.rulesManifest@v1` 的 `manifest` 字段直接 `$ref` 到 028 的 RulesManifest schema。  
**Rationale**：避免在 031 重复定义 rules 的静态 IR 口径，保持 rules-first 体系单一事实源。

**Link**：`specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`

## Decision 4：key 冲突/不可序列化/导出异常以“单项失败”呈现

**Decision**：当某个导出者冲突或失败时：

- `TrialRunReport` 仍应尽可能产出（保留 Manifest/StaticIR/Evidence 等），
- 失败的 artifact 以 `ArtifactEnvelope.ok=false + errorSummary` 呈现，
- 由上层（036 Contract Suite/CI gate）决定是否将其升级为整体 FAIL。

**Rationale**：031 的目标是统一承载与可解释性；“全报告失败”会把其它 IR 一并丢掉，降低诊断价值。

## Open Questions（后续 tasks 阶段收敛）

1. artifacts 导出者的注册模型：按模块实例安装（Layer）还是按 module/kit 静态注册？（优先可测试、可替换）
2. per-artifact budget 的默认值与超限裁剪策略：只截断大数组/深层，还是允许只保留摘要？
3. artifacts 与 diagnosticsLevel 的关系：diagnostics=off 是否仍允许导出 artifacts（建议允许，但默认不录制动态 trace）。
