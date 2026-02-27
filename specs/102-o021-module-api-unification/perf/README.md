# O-021 Perf & Diagnostics Evidence Checklist

## 本次落地证据

- `before.local.darwin-arm64.node22.quick.json`
- `after.local.darwin-arm64.node22.quick.json`
- `diff.before__after.node22.quick.json`

## 已执行命令（可复现）

```bash
pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/before.local.darwin-arm64.node22.quick.json --allow-partial
pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/after.local.darwin-arm64.node22.quick.json --allow-partial
pnpm perf diff -- --before specs/102-o021-module-api-unification/perf/before.local.darwin-arm64.node22.quick.json --after specs/102-o021-module-api-unification/perf/after.local.darwin-arm64.node22.quick.json --out specs/102-o021-module-api-unification/perf/diff.before__after.node22.quick.json
```

## 结果摘要

- `diff.meta.comparability.comparable = true`
- `summary.regressions = 0`
- `summary.budgetViolations = 0`
- `before.meta.git.branch = after.meta.git.branch = pr/o021-module-api-unification`
- `before.meta.git.commit = after.meta.git.commit`（同 commit 双采样）
- 环境警告：`git.dirty.before=true` / `git.dirty.after=true`（不影响 comparability）
- 稳定性告警：`diff.suites[0].notes` 含 `stabilityWarning`（当前为正向改善但波动超阈值）
- 说明：本次为 `quick` 子集采样，`validate --allow-partial` 会提示缺失矩阵中的其他 suite；该结果用于当前阶段可执行证据，不作为跨提交预算结论。

## 阶段化判定口径

- `writeback` 阶段：
  - 允许保留一次 `stabilityWarning`，但必须在本文件记录告警内容、风险说明与复测命令。
  - 当前结论仅用于“无明显回归 + 证据链可执行”。
- `done` 阶段：
  - 必须补齐跨提交 before/after（不同 commit）采样。
  - `diff` 中不得存在 `stabilityWarning/timeout`。

## `done` 门禁复测命令

```bash
pnpm perf collect -- --profile quick --out specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json
pnpm perf collect -- --profile quick --out specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json
pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json --allow-partial
pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json --allow-partial
pnpm perf diff -- --before specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json --after specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json --out specs/102-o021-module-api-unification/perf/diff.before__after.node22.quick.json
```

## Diagnostics Checkpoints

- 迁移告警事件：`module_instantiation::legacy_entry`
- 必查字段：`moduleId`、`instanceId`、`code`、`message`、`hint`、`source`
- 回归用例：`packages/logix-core/test/Module/Module.api-unification.test.ts`
- 可执行采样命令：

```bash
pnpm --filter @logixjs/core test -- test/Module/Module.api-unification.test.ts
```
