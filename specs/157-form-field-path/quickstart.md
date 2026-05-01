# Quickstart: Form Companion Formalization

## 1. 先读 authority

按这个顺序读：

1. `specs/157-form-field-path/spec.md`
2. `specs/155-form-api-shape/candidate-ac3.3.md`
3. `specs/155-form-api-shape/signoff-brief.md`
4. `docs/ssot/form/13-exact-surface-contract.md`
5. `docs/ssot/form/05-public-api-families.md`
6. `docs/ssot/runtime/06-form-field-kernel-boundary.md`
7. `docs/ssot/runtime/10-react-host-projection-boundary.md`
8. `docs/ssot/runtime/09-verification-control-plane.md`

## 2. 默认实现顺序

1. `FormDefineApi` 接回 `field(path).companion(...)`
2. companion lowering / evidence / row-heavy internal closure
3. recipe-only selector proof：`useModule + useSelector(handle, selectorFn)`
4. `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario)` control-plane proof
5. authority freeze
6. post-freeze companion example alignment

## 3. 最小验证

- `runtime.check`
- `runtime.trial(mode="startup")`
- `pnpm -C packages/logix-form exec vitest run test/Form/Form.Companion.Authoring.test.ts test/Form/Form.Companion.RowScope.Authoring.test.ts test/Form/Form.Companion.Scenario.trial.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts`
- `pnpm -C packages/logix-form typecheck`
- `pnpm -C packages/logix-react typecheck`

只有当 scenario 差异或 hot-path 回归需要解释时，才升级：

- `runtime.compare`

只有当 companion read path 或 diagnostics path 真触及 React host / observability hot path 时，才补：

- `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser`
- `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser`

authority freeze 完成后，再补：

- `pnpm -C examples/logix-react exec vitest run test/form-demo-matrix.contract.test.ts`
- `pnpm -C examples/logix-react build`

## 4. 明确禁止

- 不重开 `list().companion`、`root().companion`
- 不新增第二 host family
- 不新增 public helper noun 或 new selector primitive
- 不把 companion type-only contract 推成 runtime value、read helper 或 selector primitive
- 不把 companion 写成 render policy lane
- 不让用户代码依赖 raw internal landing path
