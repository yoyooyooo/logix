# Acceptance (God View) — 067 Action Surface Manifest

> 目标：逐条覆盖 `spec.md` 内所有编码点（FR/NFR/SC），给出证据与漂移/缺口矩阵，并产出 Next Actions。

## Preconditions

- `specs/067-action-surface-manifest/tasks.md`：30/30 ✅
- `specs/067-action-surface-manifest/checklists/requirements.md`：16/16 ✅

## Acceptance Matrix (067)

| Code | Type | Status | Evidence | Verification | Notes |
| ---- | ---- | ------ | -------- | ------------ | ----- |
| FR-001 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts`、`specs/067-action-surface-manifest/contracts/schemas/action-ref.schema.json` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | ActionRef 统一为 `moduleId + actionTag`，事件/manifest 以相同锚点 join。 |
| FR-002 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | actions[] 提取 + payload kind（void/nonVoid/unknown）。 |
| FR-003 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | primaryReducer（declared）标注。 |
| FR-004 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/internal/action.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | ActionToken/source 与 module dev.source 均可作为 best-effort 锚点；消费侧可 deep-link。 |
| FR-005 | FR | PASS | `packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/Debug.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | action:dispatch 事件可被投影为 RuntimeDebugEventRef，包含 moduleId/label 等锚点信息。 |
| FR-006 | FR | PASS | `packages/logix-core/src/internal/runtime/core/DebugSink.ts` | `packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts` | 未声明 action 稳定降级为 unknown/opaque，且不污染已声明 actions 的 join/统计。 |
| FR-007 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/Reflection.extractManifest.deterministic.test.ts`、`packages/logix-core/test/internal/Reflection/Manifest.Truncation.test.ts` | JSON 可序列化、稳定排序、digest deterministic、支持 maxBytes 裁剪。 |
| FR-008 | FR | PASS | `packages/logix-core/src/Action.ts`、`packages/logix-core/src/internal/action.ts`、`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` | `packages/logix-core/test/types/ActionSurface.d.ts.test.ts` | token-first：ActionToken 作为值级符号可被 dispatch/onAction 引用。 |
| FR-009 | FR | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts` | `packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts` | 字符串 tag / action object 仍可派发与诊断（增量能力）。 |
| FR-010 | FR | PASS | `specs/067-action-surface-manifest/contracts/schemas/module-manifest.schema.json`、`specs/067-action-surface-manifest/quickstart.md` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts` | schema/quickstart 固化字段语义，事件与 manifest 对齐。 |
| FR-011 | FR | PASS | `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | `$.effect` 注册面（1→N handlers）。 |
| FR-012 | FR | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | 事务外执行、失败隔离、结构化诊断。 |
| FR-013 | FR | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | 去重（no-op）+ duplicate/dynamic/late 诊断。 |
| FR-014 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | effects 摘要含 `(actionTag, sourceKey, source?)`；sourceKey 自动派生且可序列化。 |
| FR-015 | FR | PASS | `packages/logix-core/src/internal/action.ts` | `packages/logix-core/test/types/ActionSurface.d.ts.test.ts` | `actionTag = key`；token.tag 必须等于 key，rename 视为 forward-only 协议变更。 |
| FR-016 | FR | PASS | `packages/logix-core/src/ModuleTag.ts`、`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` | `packages/logix-core/test/internal/Bound/Bound.test.ts` | payload-first：Reducer.mutate 与 token onAction 均以 payload 为主；predicate/string 仍可拿到完整 action。 |
| FR-017 | FR | PASS | `packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | manifest 至少包含 declared effects；run 动态注册对未来派发生效并可诊断。 |
| NFR-001 | NFR | PASS | `specs/067-action-surface-manifest/plan.md`、`specs/067-action-surface-manifest/perf/*.json` | `specs/067-action-surface-manifest/perf/README.md` | 已定义 budget + perf baseline，并落盘 diff。 |
| NFR-002 | NFR | PASS | `packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` | `specs/067-action-surface-manifest/perf/README.md` | diagnostics 分档 + perf matrix 覆盖 overhead 曲线。 |
| NFR-003 | NFR | PASS | `packages/logix-core/src/Debug.ts` | `packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts` | 诊断/回放链路使用稳定 instanceId/txnSeq/txnId。 |
| NFR-004 | NFR | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts` | `packages/logix-core/test/internal/Module/Module.NoAsyncGuard.test.ts` | 事务窗口纯同步（无 IO/async）。 |
| NFR-005 | NFR | PASS | `specs/067-action-surface-manifest/quickstart.md`、`apps/docs/content/docs/api/core/bound-api.md`、`apps/docs/content/docs/api/react/use-module.md`、`apps/docs/content/docs/guide/advanced/performance-and-optimization.md` | `specs/067-action-surface-manifest/perf/README.md` | 已固化术语/心智模型与证据字段口径（含优化梯子与 perf 证据）。 |
| NFR-006 | NFR | PASS | `packages/logix-core/src/internal/observability/trialRunModule.ts` | `packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts` | 可导出 slim evidence/IR；依赖以 Layer/Service 注入（非 process-global）。 |
| NFR-007 | NFR | PASS | `specs/067-action-surface-manifest/plan.md` | `specs/067-action-surface-manifest/quickstart.md` | forward-only：无兼容层/无弃用期，迁移口径固化在文档与 plan。 |
| SC-001 | SC | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/Reflection.extractManifest.deterministic.test.ts` | 同输入同环境下字节级一致。 |
| SC-002 | SC | PASS | `packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/Debug.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts`、`packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts` | declared actions 100% join；undeclared 稳定 unknown。 |
| SC-003 | SC | PARTIAL | `specs/067-action-surface-manifest/quickstart.md`、`packages/logix-core/test/types/ActionSurface.d.ts.test.ts` | `packages/logix-core/test/types/ActionSurface.d.ts.test.ts` | 类型回归已覆盖；IDE 跳转/找引用/重命名仍需按 quickstart 人工验收。 |
| SC-004 | SC | PASS | `specs/067-action-surface-manifest/perf/diff.before.local__after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json` | `specs/067-action-surface-manifest/perf/README.md` | `comparable=true` 且 `budgetViolations=0`。 |
| SC-005 | SC | PASS | `packages/logix-core/src/Debug.ts` | `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` | 事件/manifest 使用稳定 id/seq（无随机/时间默认）。 |
| SC-006 | SC | PASS | `packages/logix-core/src/internal/reflection/manifest.ts` | `packages/logix-core/test/internal/Reflection/Manifest.Truncation.test.ts` | maxBytes=64KB 上界 + deterministic 裁剪证据。 |
| SC-007 | SC | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | 同 tag 多 handler：每次派发触发 K 次，且失败隔离。 |
| SC-008 | SC | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | 重复注册不导致翻倍，并可被诊断识别。 |
| SC-009 | SC | PASS | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts` | `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts` | setup 注册对首次派发生效；run 动态注册仅对后续生效且可解释。 |

## Drift / Gap Matrix

| Code | Status | Gap | Next Action |
| ---- | ------ | --- | ---------- |
| SC-003 | PARTIAL | IDE 人工验收未执行（agent 无法自动完成） | 按 `specs/067-action-surface-manifest/quickstart.md` 完成 IDE 三步验收，并在 PR/记录中注明结果。 |

## Next Actions (priority)

1. （P0）完成 SC-003 的 IDE 人工验收并记录结果（作为发布/交付门禁）。
2. （P1，可选）若需要把 action-level source 自动化（免手写 source），再评估是否引入 dev-only stacktrace best-effort（需额外 deterministic/体积预算与测试覆盖）。
