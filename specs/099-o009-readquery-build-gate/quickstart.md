# Quickstart: O-009 ReadQuery Build Gate

## 1. 生成与检查规划产物

```bash
bash .codex/skills/speckit/scripts/bash/check-prerequisites.sh --json --feature 099
```

确认以下文件存在：

- `specs/099-o009-readquery-build-gate/spec.md`
- `specs/099-o009-readquery-build-gate/plan.md`
- `specs/099-o009-readquery-build-gate/research.md`
- `specs/099-o009-readquery-build-gate/data-model.md`
- `specs/099-o009-readquery-build-gate/contracts/*`

## 2. 运行关键回归测试（ReadQuery + ModuleRuntime）

```bash
pnpm --filter @logixjs/core vitest run test/ReadQuery/ReadQuery.compile.test.ts
pnpm --filter @logixjs/core vitest run test/ReadQuery/ReadQuery.strictGate.test.ts
pnpm --filter @logixjs/core vitest run test/ReadQuery/ReadQuery.buildGate.test.ts
pnpm --filter @logixjs/core vitest run test/ReadQuery/ReadQuery.runtimeConsumption.test.ts
```

## 3. 运行 workspace 质量门

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## 4. 采集性能证据（default profile）

```bash
pnpm perf collect -- --profile default --out specs/099-o009-readquery-build-gate/perf/before.<sha>.darwin-arm64.m-series.default.json
# 应用 O-009 改动后
pnpm perf collect -- --profile default --out specs/099-o009-readquery-build-gate/perf/after.<sha>.darwin-arm64.m-series.default.json
pnpm perf diff -- \
  --before specs/099-o009-readquery-build-gate/perf/before.<sha>.darwin-arm64.m-series.default.json \
  --after specs/099-o009-readquery-build-gate/perf/after.<sha>.darwin-arm64.m-series.default.json \
  --out specs/099-o009-readquery-build-gate/perf/diff.before__after.default.json
```

## 5. 验收检查点

- 构建期能产出 selector 质量报告（并可在 strict gate=error 下阻断）。
- 运行时“已定级 selector”路径不再重复 strict gate 判定。
- 未定级 selector 不会静默退化，能输出稳定 `fallbackReason`。
- 全量质量门通过且性能 diff 无回归硬告警。
