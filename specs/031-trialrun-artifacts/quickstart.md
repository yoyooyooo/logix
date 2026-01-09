# Quickstart: TrialRun Artifacts（031：统一 artifacts 槽位）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/plan.md`

> 本 quickstart 只描述“你会得到什么，以及最小消费者怎么用”。  
> IR/trial-run 的实现链路与字段语义外链到：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`

## 0) 你会得到什么

`TrialRunReport` 新增一个可选槽位：

- `artifacts?: Record<ArtifactKey, ArtifactEnvelope>`

其中：

- `ArtifactKey` 形如 `@scope/name@vN`（概念域命名，非实现包名）
- `ArtifactEnvelope` 用统一形态表达：`ok/error/truncated/budget`（让消费者不用猜）
- payload **必须**是 `JsonValue`（可序列化、可 diff）

## 1) 最小消费者（Workbench）怎么用

当前最小消费者是 `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`：

- 页面把用户 moduleCode 包成 wrapper，在 sandbox 里调用 `Logix.Observability.trialRunModule(...)`；
- 从 `TrialRunReport.artifacts` 读取版本化工件，用通用 JSON viewer 展示/复制/下载；
- 不关心具体 kit 的实现细节，只按 `artifactKey@vN` 做分组与验收入口。

小提示：`IrPage` 已内置 `P6 Form Rules (Artifacts)` 预设，可直接看到 `@logixjs/form.rulesManifest@v1` 的输出。

## 2) Feature Kit 如何扩展导出（OCP）

kit 想新增补充静态 IR（Supplemental Static IR）时：

- 定义一个版本化的 `artifactKey`（概念域命名，建议与 kit 域一致，例如 `@logixjs/form.*`）
- 保证输出是 slim 的 `JsonValue`，并遵守确定性与预算/截断语义
- 通过 031 的模块级扩展点注册导出者（避免修改 core 业务逻辑；注册点在模块 tag 上，随 module graph 一起被 trial-run 读取）

注册方式（kit 侧，示意）：

- 在 kit 的 `make(...)`/factory 内拿到 `module.tag` 后调用：`Logix.Observability.registerTrialRunArtifactExporter(module.tag, exporter)`
- exporter 约束：
  - `artifactKey`: `@scope/name@vN`
  - `exporterId`: 用于冲突/失败时可行动定位
  - `export(ctx)`: 返回 `JsonValue | undefined`（返回 `undefined` 表示不输出该 artifact）

首个内置用例（Form rules）：

- key：`@logixjs/form.rulesManifest@v1`
- payload：`{ manifest, warnings }`（manifest schema 复用 028）

## 3) 与 036（Contract Suite）/Agent 的关系

031 只负责“统一承载 + 可解释状态”，并不做最终判定；统一判定口径在 036：

- 036 以 artifacts 为客观事实源计算 PASS/WARN/FAIL，并可生成给 Agent 的 Context Pack（IR-first 闭环）。

## References

- IR 全链路（IrPage→Sandbox→TrialRun）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`
- 025 IR schemas（Manifest/StaticIR/TrialRunReport/Diff）：`specs/025-ir-reflection-loader/contracts/schemas/*`
- RulesManifest schema（Form 事实源）：`specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`
- JsonValue / SerializableErrorSummary：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`、`specs/016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json`
