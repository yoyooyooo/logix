# Quickstart: React Runtime Scope Unification

## 1. 阅读入口

```bash
sed -n '1,240p' specs/134-react-runtime-scope-unification/spec.md
sed -n '1,260p' specs/134-react-runtime-scope-unification/plan.md
sed -n '1,320p' specs/134-react-runtime-scope-unification/tasks.md
```

## 2. 关键文件定位

```bash
rg --files \
  packages/logix-core/src \
  packages/logix-react/src \
  packages/logix-react/test \
  docs/ssot/runtime \
  packages/logix-react \
| rg 'Module\\.ts|Program\\.ts|programImports|ModuleRuntime\\.impl|RuntimeProvider|useModule|useImportedModule|ModuleScope|01-public-api-spine|03-canonical-authoring|07-standardized-scenario-patterns|README\\.md$'
```

## 3. 定向合同测试

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx
```

## 4. dts surface

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

## 5. 最终 gate

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```
