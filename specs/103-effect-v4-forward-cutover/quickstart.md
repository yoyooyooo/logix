# Quickstart: Effect v4 前向式迁移执行手册

## 1. 前置要求

- 在 `effect-v4` worktree 执行。
- `feat/perf-dynamic-capacity-maxlevel` 未合入时可并行推进实现任务，但不得宣称性能 gate 通过。
- 仅使用一次性命令，不使用 watch 模式。
- 阶段完成必须落盘证据，不可只口头结论。

## 2. 阶段入口

1. 并行推进 P-1（Perf 前置收口，GP-1）与实施轨道（S0~S5）。
2. GP-1 未通过时，实施轨道可继续，但性能结论仅能标记为 provisional。
3. 实施收敛后执行 S6.5（rebase main + 单提交增量性能基准）。
4. 按顺序完成 S6 发布门收口。

P-1 最小核验命令：

```bash
git rev-parse --short origin/feat/perf-dynamic-capacity-maxlevel
git rev-parse --short origin/main
git merge-base origin/feat/perf-dynamic-capacity-maxlevel origin/main
git log --oneline origin/main -- .github/workflows/logix-perf-sweep.yml | head
git log --oneline origin/main -- .github/workflows/logix-perf-quick.yml | head
rg -n "diff_mode|PERF_DIFF_MODE|pnpm perf diff|pnpm perf diff:triage|concurrency:|timeout-minutes|Pin perf matrix|Normalize reports" .github/workflows/logix-perf-quick.yml .github/workflows/logix-perf-sweep.yml
ls .github/scripts
ls .codex/skills/logix-perf-evidence/scripts
```

若核验结果不满足，则暂停性能 gate 推进并将状态记录到 `inventory/perf-prerequisite.md`。
若仅 `main_contains_prereq_commit` 未满足，可继续实现任务，但禁止宣称 G1/G2/G5 性能 gate 通过。

判据映射：

- `main_contains_prereq_commit` -> `rev-parse/merge-base`
- `workflow_strict_diff_and_guards` -> `rg` workflow 关键字段
- `github_scripts_present` / `perf_evidence_scripts_present` -> `ls` 脚本目录

## 3. 必跑门禁命令

```bash
pnpm typecheck
pnpm typecheck:test
pnpm lint
pnpm test:turbo
```

包级门禁（阶段中间态）：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core test
pnpm -C packages/logix-react typecheck:test
pnpm -C packages/logix-react test
```

## 4. 性能证据采集模板

```bash
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.before.<envId>.default.json
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.after.<envId>.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.<envId>.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.<envId>.default.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.<envId>.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.<envId>.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.<envId>.default.json
```

规则：

- `comparable=false` 时必须复测。
- before/after 必须同 envId、同 profile。
- gate 口径禁止用 `pnpm perf diff:triage` 宣称通过。
- gate 口径禁止使用 `--allow-partial`。

探索态（仅定位问题，不能用于 gate 通过）：

```bash
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.<envId>.default.json --allow-partial
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.<envId>.default.json --allow-partial
```

Node 通道（core 热路径，建议与 Browser 通道并行保留）：

```bash
pnpm perf bench:traitConverge:node -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.node.before.<envId>.default.json
pnpm perf bench:traitConverge:node -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.node.after.<envId>.default.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.node.before.<envId>.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.node.after.<envId>.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.node.diff.<envId>.default.json
```

## 5. STM go/no-go 检查

- MUST 全部通过：正确性、性能预算、诊断可解释性、禁区未触碰。
- SHOULD 至少通过 2 项：复杂度下降、覆盖率提升、排障步骤减少。
- 输出：`diagnostics/s3.stm-decision.md` + `inventory/gate-g2.md`。

```bash
pnpm -C packages/logix-core test
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s3.after.<envId>.default.json
pnpm perf diff -- --before <before.json> --after specs/103-effect-v4-forward-cutover/perf/s3.after.<envId>.default.json --out specs/103-effect-v4-forward-cutover/perf/s3.diff.<envId>.default.json
```

## 5.5 单提交增量性能口径（发布前强制）

```bash
git fetch origin
git rebase origin/main
git rev-list --count origin/main..HEAD
# 约束：上述计数必须为 1（即仅保留一个 v4 增量提交 V4_DELTA）
V4_DELTA=$(git rev-parse --short HEAD)
V4_BASE=$(git rev-parse --short HEAD^)
gh workflow run ".github/workflows/logix-perf-sweep.yml" -f base_ref="$V4_BASE" -f head_ref="$V4_DELTA" -f perf_profile=soak -f diff_mode=strict
```

产物要求：

- 归档 sweep 的 before/after/diff 到 `specs/103-effect-v4-forward-cutover/perf/`。
- G5 仅接受 `V4_DELTA^ -> V4_DELTA` 的 `soak+strict` 证据。

## 6. Schema 专项检查（新增）

```bash
rg -n "Schema\\.partial\\(|Schema\\.Record\\(\\{\\s*key:|Schema\\.pattern\\(" packages apps examples
rg -n "Schema\\.Union\\(|Schema\\.Literal\\(" packages apps examples
rg -n "ParseResult\\.TreeFormatter" packages apps examples
```

要求：

- 迁移目标模块中旧语法命中持续下降。
- `ParseResult.TreeFormatter` 在生产路径清零（至少 `logix-form`）。

## 7. 收口要求

- 同步更新 `docs/ssot/runtime/*` 与 `docs/ssot/platform/*`。
- 更新 `apps/docs/*` 与相关 README（中文）。
- 完成 `1.0` 迁移说明（breaking changes + 新心智模型）。

## 8. 检查点决策日志（强制）

- 每个 gate 判定后必须更新 `inventory/checkpoint-decision-log.md`。
- 记录格式：`checkpoint` / `checkpointResult` / `relatedGates` / `evidenceRefs` / `nextAction` / `checkpointCommit` / `lastPassCheckpointCommit` / `timestamp`。
- 没有证据路径的 checkpoint 一律视为无效，不得宣告阶段完成。

## 9. 失败回滚（执行入口）

1. 冻结当前 gate（写入 `NOT_PASS` 并附证据路径）。
2. 归档当前失败证据（`inventory/*.md`、`perf/*.json`、`diagnostics/*.md`）。
3. 锁定 last PASS checkpoint 对应提交。
4. 仅回退受影响代码对象（runtime/core/react/sandbox、workflow/scripts、配置）。
5. 重跑 gate 清单并回写 checkpoint 决策日志。
