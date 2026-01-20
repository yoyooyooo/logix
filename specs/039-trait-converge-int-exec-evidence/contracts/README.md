# Contracts: Trait Derived Converge Evidence

本特性 **不新增** 对外协议，也不在本目录复制/分叉 converge 的 schema。

## Source of Truth

- `trait:converge` 事件的 schema 与 off/light/sampled/full 分档约束：`specs/013-auto-converge-planner/contracts/`
- Devtools/可导出事件的协议语义与分档规则（含 `trait:converge`）：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- trace 事件的运行时投影与 light/sampled 裁剪：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- 性能证据（PerfReport/PerfDiff）schema：`.codex/skills/logix-perf-evidence/assets/schemas/`（039 仅通过 `$ref` 复用，不复制）

## Contract Rules (for this feature)

- 若需要调整 `trait:converge` 的字段语义或 schema：
  1. 必须先更新 `specs/013-auto-converge-planner/contracts/` 的 schema；
  2. 再同步更新 runtime 的证据产出与投影裁剪；
  3. 最后同步更新 `docs/ssot/runtime/logix-core/observability/09-debugging.md` 与基线口径（避免并行真相源漂移）。

- 本特性的优化目标是“在不改变 contract 的前提下降低产出成本”，例如：
  - diagnostics=off 时避免构造重字段；
  - diagnostics=light/sampled/full 时继续保持 Slim；
  - 发生降级时提供最小可解释字段，不把大型对象图塞进 meta。
