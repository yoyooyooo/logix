# Quickstart: Core Spine Aggressive Cutover

## 1. 阅读入口

```bash
sed -n '1,220p' specs/133-core-spine-aggressive-cutover/spec.md
sed -n '1,260p' specs/133-core-spine-aggressive-cutover/plan.md
sed -n '1,260p' specs/133-core-spine-aggressive-cutover/tasks.md
```

## 2. 关键残留扫描

```bash
rg -n "Module\\.implement|ChildProgram\\.impl|TrialRun|\\.logic(?:<[^>]+>)?\\(\\s*\\(" \
  packages/logix-core \
  packages/logix-react \
  examples/logix \
  docs/adr \
  docs/ssot \
  docs/standards \
  -g '!**/dist/**'
```

## 3. dts 合同

```bash
pnpm -C packages/logix-core exec tsc -p test-dts/canonical-authoring.tsconfig.json --noEmit
```

## 4. 定向测试

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/LogicSurface.id-required.test.ts \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts
```

## 5. 最终 gate

```bash
pnpm check:effect-v4-matrix
pnpm typecheck
pnpm lint
pnpm test:turbo
```
