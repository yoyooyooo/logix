# Acceptance: 037 · 限定 scope 的全局（Host(imports) + ModuleScope）

**Feature**: `specs/037-route-scope-eviction/spec.md`  
**Date**: 2025-12-26  
**Result**: PASS

## Checklist Gate

- `specs/037-route-scope-eviction/checklists/requirements.md`：PASS（16/16）

## Quality Gates

- PASS：`pnpm typecheck`
- PASS：`pnpm lint`
- PASS：`pnpm test`

## Coded Points Inventory

- 13 个编码点（definitions）：5×FR、4×NFR、4×SC
- 无重复定义、无孤儿引用

## Acceptance Matrix（按 spec.md 编码点逐条对照）

### Functional Requirements

- **FR-001** PASS  
  Evidence：`packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`、`packages/logix-core/src/internal/InternalContracts.ts`、`apps/docs/content/docs/guide/recipes/route-scope-modals.md`、`specs/037-route-scope-eviction/quickstart.md`
- **FR-002** PASS（通过 `gcTime: 0` 支持“无默认窗口”的立即释放；scope close 负责终止后台 fiber）  
  Evidence：`packages/logix-react/src/internal/store/ModuleCache.ts`、`packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.importsScope.cleanup.test.ts`、`packages/logix-react/test/internal/importedModuleContext.cleanup.test.tsx`、`apps/docs/content/docs/guide/recipes/route-scope-modals.md`
- **FR-003** PASS  
  Evidence：`packages/logix-react/src/ModuleScope.ts`、`packages/logix-react/test/Hooks/moduleScope.test.tsx`、`apps/docs/content/docs/api/react/module-scope.md`
- **FR-004** PASS  
  Evidence：`apps/docs/content/docs/guide/recipes/route-scope-modals.md`、`apps/docs/content/docs/api/react/use-imported-module.md`、`.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`
- **FR-005** PASS  
  Evidence：`specs/037-route-scope-eviction/quickstart.md`、`apps/docs/content/docs/guide/recipes/route-scope-modals.md`

### Non-Functional Requirements

- **NFR-001** PASS（guardrail）  
  Evidence：`specs/037-route-scope-eviction/perf.md`、`packages/logix-react/src/ModuleScope.ts`（注册在 effect 阶段，不进入 render 热路径）
- **NFR-002** PASS  
  Evidence：`packages/logix-core/src/ScopeRegistry.ts`、`packages/logix-core/src/Runtime.ts`、`packages/logix-core/test/ScopeRegistry.test.ts`
- **NFR-003** PASS  
  Evidence：`specs/037-route-scope-eviction/spec.md`（scopeId 由业务提供、禁止随机/时间默认）
- **NFR-004** PASS（not in scope）  
  Evidence：`specs/037-route-scope-eviction/plan.md`（仅生命周期/使用方式与文档，不引入事务窗口内 IO）

### Success Criteria

- **SC-001** PASS  
  Evidence：`specs/037-route-scope-eviction/quickstart.md`、`apps/docs/content/docs/guide/recipes/route-scope-modals.md`
- **SC-002** PASS  
  Evidence：`packages/logix-react/test/Hooks/moduleScope.test.tsx`、`apps/docs/content/docs/api/react/module-scope.md`
- **SC-003** PASS  
  Evidence：`apps/docs/content/docs/guide/recipes/route-scope-modals.md`、`apps/docs/content/docs/api/react/module-scope.md`
- **SC-004** PASS  
  Evidence：`packages/logix-react/test/Hooks/moduleScope.test.tsx`（scopeId isolation）

## Notes

- 显式 eviction/clear API 仍保持 DEFERRED：`specs/037-route-scope-eviction/contracts/react-modulecache-eviction.md`
