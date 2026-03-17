# 2026-03-21 · Identify: runtime-shell post-ledger nextwide（dispatch/operation/snapshot 广域识别线）

## 结论

Top2：

- `N-0 runtime-shell.ledger.attribution-nextcut`：以现有 `runtime-shell.ledger v1` 为证据锚点，补齐“可复现归因闭环”，把 nextwide 从概念提案收敛到单一最小切口候选
- `N-0 runtime-shell.noSnapshot.shrink`：在不引入新指标体系的前提下，把 `resolve-shell noSnapshot` 从常规路径进一步压缩到显式 fallback 边界，争取把 `noSnapshot.avg.ms` 拉回到与 `snapshot.avg.ms` 同数量级

唯一建议下一线：

- `N-0 runtime-shell.ledger.attribution-nextcut`

## 背景基线（P0-1/P0-2 已吸收后的现状）

- dispatch shell（`P0-2+` 贴边）：`dispatch.p95.ms=0.132`，`residual.avg.ms=0.060`。证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.after.json`
- operation resolve-shell（`P0-2 operation-shell-next`）：`noSnapshot.avg=0.633ms`，`snapshot.avg=0.258ms`，`speedup=2.458x`，operationRunner：`batch=256 speedup=1.544x`，`batch=1024 speedup=1.642x`。证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.evidence.json`
- 复核结论（`P0-2 operation-empty-default-next`）：未发现更小的最小切口，按 docs/evidence-only 关闭。证据：`docs/perf/archive/2026-03/2026-03-21-p0-2-operation-empty-default-next.md`

## N-1 已解决与已关闭（freeze 试探回写）

`N-1 runtime-shell.freeze nextwide` 已完成同机对照并触发失败门，实施已回滚：

- 试探实现 run（已回滚）：`resolve-shell noSnapshot.avg=0.784ms snapshot.avg=0.280ms`，`dispatch.p95=0.277ms residual.avg=0.079ms`，`operationRunner batch256 speedup=1.623x`
- 基线 run（同机同命令）：`resolve-shell noSnapshot.avg=0.634ms snapshot.avg=0.259ms`，`dispatch.p95=0.193ms residual.avg=0.073ms`，`operationRunner batch256 speedup=1.855x`
- 裁决：`accepted_with_evidence=false`，代码改动为空（已回滚）。证据：`docs/perf/archive/2026-03/2026-03-21-n-1-runtime-shell-freeze-nextwide.md`

这条线已具备“方向已验证过且不值”的结论作用，后续不再作为默认下一线触发器。

## N-2 ledger 已解决了什么，还剩什么没解决

已解决：

- 已落 `runtime-shell.ledger v1` 的 schema 与最小实现切口，能在 Node microbench 场景落盘 raw 样本（NDJSON）与 summary，并与既有 suite 工件对齐校验。
- ledger summary 复用既有聚合指标名，满足“防并行真相源”约束。证据：`docs/perf/2026-03-21-n-2-runtime-shell-ledger-design-package.md`、`docs/perf/2026-03-21-n-2-runtime-shell-ledger-impl.md`
- 已有完整验证链路与证据锚点：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-2-runtime-shell-ledger.validation.json`

未解决：

- ledger 解决的是归因盲区与工件落盘，不会自动导出“下一刀切口”。没有一份统一的“nextcut 选择规则”，导致 nextwide 仍容易回到主观猜测。
- 当前 ledger 覆盖点聚焦 3 条 Node microbench，用于解释 `dispatch/resolveShell/operationRunner` 的 sub-ms；它未覆盖 browser perf 边界门与 `externalStore.ingest.tickNotify` 的 edge gate noise。
- 本 worktree 当前环境无法作为回归证据来源：`python3 fabfile.py probe_next_blocker --json` 首个阻塞为 `failure_kind=environment`（node_modules 缺失，vitest 不可用），本轮仅作为“环境阻塞记录”，不作为性能结论依据。

## 为什么 nextwide 需要改路由

- `dispatchShell.fixedCost` 的残余区间落在 sub-ms，browser trace 对该区间的解释力不足，继续在同一类局部点位挖洞，收益边际很低。
- `freeze` 已完成试探并回滚，说明“迁出 resolver 壳税”这条概念线在当前实现形态下没有自动优势。
- ledger 已落地，下一步收益更大的动作是把它变成“可复用的 nextcut 选择协议”，先缩小不确定性，再开代码线。

## Top2 方向细化

## `N-0 runtime-shell.ledger.attribution-nextcut`（唯一建议下一线）

目标：

- 在不新增指标体系的约束下，把 nextwide 从“候选方向”收敛到“单一最小切口候选”，并提供可执行的 before/after 证据闭环。

切口定义：

- 以 ledger v1 为证据底座，新增一份固定格式的“归因结论单”，它只允许引用既有 suite 的指标名与 ledger summary 的同名指标。
- 归因结论单需要输出一个 nextcut 候选，格式为 `cutId + 主落点 + 成功门 + 失败门 + 回滚条件`。

最小证据与验收门（下一线必须满足）：

- `specs/103-effect-v4-forward-cutover/perf/.local/runtime-shell-ledger/*.ledger.v1.ndjson` 与 `*.ledger.summary.v1.json` 可稳定生成。
- ledger summary 与既有 suite 工件在同数量级，drift 可用参数差异解释。
- 归因结论单能把 `dispatchShell.phases.light` 的 `residual.avg.ms` 分解到至少一个可行动点位集合，输出单一 nextcut 候选。
- `python3 fabfile.py probe_next_blocker --json` 需要可执行，且在 focused 复核后达到 `status=clear` 或仅命中 `edge_gate_noise` 分类。

下一线任务包（implementation-ready）：

- 先完成 env-ready：保证 `pnpm -C packages/logix-core exec vitest run <node-ledger-suite>` 可运行，且 ledger 工件能落到 `.local/runtime-shell-ledger/`。
- 固化“归因结论单”模板与裁决门，落到 `docs/perf/**` 并引用 `specs/103-effect-v4-forward-cutover/perf/**` 的证据锚点。
- 在 nextcut 未收敛前，禁止启动新的 runtime-shell 结构性重构线，避免再一次出现“改完不知道省在哪”的不可解释回归。

## `N-0 runtime-shell.noSnapshot.shrink`（次选）

切口定义：

- 针对 `ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off` 的 `noSnapshot.avg.ms`，继续把 `noSnapshot` 压缩到显式 fallback，并用 ledger 或既有 suite 工件提供可解释的 before/after。

为什么仍值得保留：

- 现有基线里 `noSnapshot.avg.ms` 与 `snapshot.avg.ms` 存在显著差距，这个差距仍是可预期收益面。

主要风险：

- 语义边界容易被做扁，必须以“显式 fallback 条件”形式固化，并配套守门测试，避免跨事务泄漏与 stale 引用复用。
