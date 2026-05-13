# Quickstart: Form Implementation First

## 1. 先读 authority

按这个顺序读：

1. `specs/156-form-implementation-first/spec.md`
2. `specs/156-form-implementation-first/plan.md`
3. `specs/156-form-implementation-first/implement-plan.md`
4. `specs/155-form-api-shape/spec.md`
5. `specs/155-form-api-shape/challenge-c007-form-api-kernel-descent.md`
6. `docs/ssot/runtime/06-form-field-kernel-boundary.md`
7. `docs/ssot/form/13-exact-surface-contract.md`

## 2. 判断工作项是否合法

每个候选实现项先问三件事：

1. 它是 core internal-enabler，还是 post-closure examples/docs alignment
2. 它属于 `already frozen / needed enabler / reopen-gated` 哪一类
3. 它会不会碰 semantic owner、declaration authority、public noun

若第 3 个问题答案是“会”，当前先停。

若第 1 个问题答案是 core internal-enabler，它必须继续映射到 `G1 / G2 / G3 / G4`。
若第 1 个问题答案是 examples/docs alignment，它必须回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 或 canonical docs route。

## 3. 默认第一波实现顺序

1. source scheduling / task substrate
2. source receipt -> reason/evidence/bundle patch ownership
3. row-heavy remap / cleanup / stale hooks
4. trial / compare evidence closure
5. `examples/logix-react` form demo alignment
6. 如有必要，再做 `apps/docs/content/docs/form/*` 的最小 writeback

## 4. 最小验证

至少准备：

- `packages/logix-form/test/Form/*` 的 targeted tests
- `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- diagnostics / compare 所需的 evidence hook
- `pnpm -C examples/logix-react typecheck`
- `pnpm -C examples/logix-react build`
- 如果 docs 页面被改动，再跑 `pnpm -C apps/docs types:check` 与 `pnpm -C apps/docs build`

推荐最小顺序：

1. `pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts`
2. `pnpm -C packages/logix-form exec vitest run test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts`
3. `pnpm -C packages/logix-form exec vitest run test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts`
4. `pnpm -C packages/logix-core typecheck && pnpm -C packages/logix-form typecheck`
5. `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/form-list-scope-check.test.tsx --project browser`
6. `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser`
7. `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser`
8. `pnpm -C packages/logix-react typecheck`
9. `pnpm -C examples/logix-react exec vitest run test/form-demo-matrix.contract.test.ts`
10. `pnpm -C examples/logix-react typecheck && pnpm -C examples/logix-react build`
11. 如果 docs 被改，再跑 `pnpm -C apps/docs types:check` 与 `pnpm -C apps/docs build`

当前 core closure 实跑结果：

- boundary suite 通过
- source suite 通过
- reason / cleanup / row identity suite 通过
- browser perf-boundary witnesses 通过
- `packages/logix-core`、`packages/logix-form`、`packages/logix-react` typecheck 通过

examples/docs 对齐后的默认顺序：

1. `/form-quick-start`
2. `/form-source-query`
3. `/form-field-arrays`
4. `/form-advanced-field-behavior`

用户文档当前不直接暴露这些 route。
若后续需要可预览入口，再单独评估是否接入 CodeSandbox 或其他承载方式。

## 5. 明确禁止

- 不改 public surface
- 不改 `companion / lower / availability / candidates`
- 不改 `rule / submit / decode / blocking verdict`
- 不下沉 declaration authority
- 不让历史 form demo 或 docs 页面反向定义 canonical route
- 不让 implementation 闭环依赖第二 evidence truth 或第二 diagnostics truth
