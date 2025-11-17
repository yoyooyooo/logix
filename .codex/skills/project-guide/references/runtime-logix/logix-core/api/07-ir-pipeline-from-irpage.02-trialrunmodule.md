# 2. `trialRunModule`：为什么它是 IR 全链路的核心

入口：`packages/logix-core/src/internal/observability/trialRunModule.ts`

`Observability.trialRunModule(module, options?)` 的设计目标是：

- **不执行业务 main**：只覆盖 module boot + scope close（避免把业务逻辑跑一遍才能拿到结构/依赖信息）。
- **失败也能解释**：MissingDependency / Timeout / DisposeTimeout / Oversized 都要分类并给出可行动 hint。
- **统一最小 IR**：尽可能携带 `manifest/staticIr/evidence/environment`，让 UI/CI 不用再造第二套真相源。
- **稳定锚点贯穿**：`runId/instanceId/txnSeq/opSeq/eventSeq` 必须能对齐，不能依赖 `Math.random()` 作为默认唯一性来源。

简化执行模型（实现细节见代码）：

1. 创建 `RunSession`（runId/source/startedAt + per-session 的 seq/once 本地状态）。
2. 安装 `EvidenceCollector` 为 DebugSink（把 runtime 的 Debug 事件变成可导出的 Evidence）。
3. 组装 Trial Layer（BuildEnv + sinks + diagnostics + converge collectors + 你的 options.layer）。
4. 复用 ProgramRunner 内核做一次 boot，并在窗口结束后 close scope。
5. 导出 `EvidencePackage`（可裁剪 maxEvents）、以及 `TrialRunReport`（可裁剪 maxBytes）。
