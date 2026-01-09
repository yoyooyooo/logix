# Acceptance: 057 · ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

**Feature**: `specs/057-core-ng-static-deps-without-proxy/spec.md`  
**Date**: 2025-12-30  
**Result**: PASS

## Checklist Gate

- N/A：本特性目录未定义 `checklists/`

## Quality Gates（minimal）

- PASS：`pnpm -C packages/logix-core typecheck:test`
- PASS：`pnpm -C packages/logix-core test`
- PASS：`pnpm -C packages/logix-react test -- test/Hooks/useSelector.laneSubscription.test.tsx test/Hooks/useSelector.structMemo.test.tsx`

## Coded Points Inventory

- 12 个编码点（definitions）：6×FR、3×NFR、3×SC
- 无重复定义、无孤儿引用

## Acceptance Matrix（按 spec.md 编码点逐条对照）

### Functional Requirements

- **FR-001** PASS  
  Evidence：`packages/logix-core/src/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`、`packages/logix-react/src/internal/hooks/useSelector.ts`
- **FR-002** PASS  
  Evidence：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
- **FR-003** PASS  
  Evidence：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`、`packages/logix-react/src/internal/hooks/useSelector.ts`、`packages/logix-react/test/Hooks/useSelector.structMemo.test.tsx`
- **FR-004** PASS  
  Evidence：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`、`packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`、`packages/logix-react/test/Hooks/useSelector.laneSubscription.test.tsx`
- **FR-005** PASS  
  Evidence：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-react/src/internal/hooks/useSelector.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- **FR-006** PASS  
  Evidence：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`

### Non-Functional Requirements

- **NFR-001** PASS（guardrail）  
  Evidence：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`（`diagnostics=light/sampled/full` 才采集 eval cost）、`packages/logix-react/src/internal/hooks/useSelector.ts`（仅 dev/test 或 devtools enabled 才 emit trace）
- **NFR-002** PASS（guardrail）  
  Evidence：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`（编译/静态化发生在装配期；commit 内只执行已编译 select）、`specs/057-core-ng-static-deps-without-proxy/spec.md`
- **NFR-003** PASS  
  Evidence：`specs/057-core-ng-static-deps-without-proxy/perf/README.md`、`specs/057-core-ng-static-deps-without-proxy/perf/diff.browser.legacy__selectorGraph.darwin-arm64.default.json`、`specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.darwin-arm64.default.worktree.gc.json`、`specs/057-core-ng-static-deps-without-proxy/contracts/devtools-selector-lane-evidence.md`

### Success Criteria

- **SC-001** PASS  
  Evidence：`packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`、`packages/logix-react/test/Hooks/useSelector.structMemo.test.tsx`
- **SC-002** PASS  
  Evidence：`packages/logix-react/src/internal/hooks/useSelector.ts`（lane/fallbackReason/readsDigest 等）、`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`（`trace:selector:eval` + `evalMs`）、`packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- **SC-003** PASS  
  Evidence：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
