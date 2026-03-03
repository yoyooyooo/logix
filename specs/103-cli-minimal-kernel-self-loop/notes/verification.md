# 103 Governance Checks Verification

日期：2026-02-28  
环境：本地 worktree `spec__103-cli-minimal-kernel-self-loop`

## 执行命令

```bash
pnpm test -- scripts/checks/governance-checks.test.ts scripts/checks/governance-checks-negative.test.ts
pnpm run verify:governance

# 对比基线（PR/分支治理）
pnpm run check:forward-evolution -- --base origin/main
pnpm run check:ssot-alignment -- --base origin/main
pnpm run check:perf-evidence -- --base origin/main
pnpm run check:protocol-antipatterns -- --base origin/main

# 工作树口径（包含未提交变更）
pnpm run check:forward-evolution
pnpm run check:ssot-alignment
pnpm run check:perf-evidence
pnpm run check:protocol-antipatterns
```

## 结果摘要

1. `gate:migration-forward-only`：PASS  
2. `gate:ssot-drift`：PASS  
3. `gate:perf-hard`：PASS  
4. `check:protocol-antipatterns`：PASS  

补充输出：

- `check:forward-evolution`：`changedFileCount=22`（非空 diff 校验）。
- `check:perf-evidence`：检测到 trigger changes + perf evidence 同次更新，且 diff 判据通过。
- `verify:governance`：一键顺序执行 4 项治理检查（3 gate + 1 guard），全部 PASS。
- `scripts/checks/governance-checks*.test.ts`：`2 files / 9 tests` 全部通过，覆盖 no-copy/ssot/perf/migration 的通过与失败判定。

## perf-hard 输入证据

- before: `specs/103-cli-minimal-kernel-self-loop/perf/before.local.quick.json`
- after: `specs/103-cli-minimal-kernel-self-loop/perf/after.local.quick.json`
- diff: `specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json`

关键字段（来自 `diff.latest.json`）：

```json
{
  "meta.comparability.comparable": true,
  "summary.regressions": 0,
  "summary.budgetViolations": 0
}
```

## 备注

- diff 中包含 `git.dirty.before/after` warning，不影响 hard 判据（`comparable=true && regressions=0 && budgetViolations=0`）。
- CI 场景建议使用 `--base <baseRef>`（PR: `origin/<base_branch>`，push: `${{ github.event.before }}`）确保以真实基线对比。
- `--base <ref>` 是“提交区间”对比口径；本地未提交改动验证请优先使用 worktree 口径（不传 `--base`）。
- 术语约束：`gateScope=governance`（verify-loop）仅包含 3 个 gate（migration/ssot/perf）；`protocol-antipatterns` 为并行 guard。

---

## Phase 17 补充验证（2026-03-03）

### 执行命令（实现收口后）

```bash
# 定向回归（Phase 17 相关）
pnpm -C packages/logix-cli exec vitest run \
  test/Integration/cli.next-actions.exec.test.ts \
  test/Integration/cli.verify-loop.emit-next-actions.test.ts \
  test/Integration/cli.verify-loop.transient-retryable.test.ts \
  test/Integration/cli.verify-loop.target-alias.test.ts \
  test/Integration/cli.verify-loop.resume-identity-monotonic.test.ts \
  test/Integration/cli.verify-loop.resume-trace.test.ts \
  test/Integration/cli.autonomous-loop.examples.e2e.test.ts \
  test/Contracts/Contracts.103.VerifyLoopInput.test.ts \
  test/Contracts/Contracts.103.DescribeSchema.test.ts

# 全量质量门
pnpm typecheck
pnpm test:turbo
pnpm build

# 治理门
pnpm run verify:governance
```

### 结果摘要

1. 定向回归：`9 files / 38 tests` 全部通过（覆盖 next-actions canonical 动作、resume 链路、trajectory 保真、schema/runtime 等价）。
2. `pnpm typecheck`：通过。
3. `pnpm test:turbo`：通过（`@logixjs/cli` `70 files / 157 tests` 通过）。
4. `pnpm build`：通过（包含 workspace build + docs prebuild）。
5. `pnpm run verify:governance`：通过（`forward-evolution` / `ssot-alignment` / `perf-evidence` / `protocol-antipatterns` 全部 PASS）。

### 关键证据

- `specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json` 重新生成并纳入本次变更；硬判据保持：

```json
{
  "meta.comparability.comparable": true,
  "summary.regressions": 0,
  "summary.budgetViolations": 0
}
```
