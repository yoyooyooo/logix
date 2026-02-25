# Implementation Plan: PR94 triggerStreams dedupe 性能证据回填

## Summary

补录 PR #94（2026-02-25）的规格与任务闭环，确保“PR 一条线、spec 一条线”可追溯。

## Technical Context

- 证据测试文件：`packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`
- 证据产物：`.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/module-statechange-dedupe.perf-evidence.off.json`
- 说明文档：
  - `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/summary.md`
  - `.context/prs/refactor-logix-core-triggerstreams-dedupe-evidence-20260225.md`
- 验证命令：
  - `pnpm -C packages/logix-core exec vitest run test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`

## Constitution Check

- 性能预算：本 PR 仅新增性能证据测试与产物，不改热路径语义。
- 诊断代价：证据基于 diagnostics=off 测试，不增加线上默认开销。
- IR/锚点漂移：无新增 IR 契约。
- 稳定标识：无新增标识生成规则变更。
- 迁移说明：无破坏性变更，无迁移要求。

## Deliverables

1. `specs/101-pr94-triggerstreams-dedupe-perf-evidence/spec.md`
2. `specs/101-pr94-triggerstreams-dedupe-perf-evidence/plan.md`
3. `specs/101-pr94-triggerstreams-dedupe-perf-evidence/tasks.md`
4. `specs/101-pr94-triggerstreams-dedupe-perf-evidence/quickstart.md`
5. `specs/101-pr94-triggerstreams-dedupe-perf-evidence/research.md`
