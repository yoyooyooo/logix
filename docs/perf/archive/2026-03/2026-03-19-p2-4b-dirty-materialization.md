# 2026-03-19 · P2-4B dirty evidence 单一物化管线

## 范围

- 只做 dirty evidence 的单一物化管线，目标是让 live/import 走同一口径。
- 前置假设：`P2-4A projection budget` 已合入母线。
- 本轮不触及 React/process/runtime 其它路线，不扩到 devtools UI 重构。
- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - `packages/logix-core/src/Debug.ts`

## 实现摘要

### 1) 在 core 收敛 dirty evidence 物化逻辑

`DevtoolsHub` 新增 `materializeDirtyEvidenceEventRef(...)`，统一处理两类事件：

1. `state:update`：基于 `staticIrDigest + pathIds/rootIds + fieldPaths` 物化 `dirtySet.rootPaths`
2. `trait:converge`：基于 `staticIrDigest + dirty.rootIds + fieldPaths` 物化 `dirty.rootPaths`

同时统一做 legacy 字段裁剪：先去掉 `rootPaths`，再按同一规则重建，避免双口径。

### 2) 物化迁到 snapshot/export 读取路径

为避免给 record 热路径增加预算开销，Hub ring 内仍保留 slim id-first 事件。  
`getDevtoolsSnapshot*` 与 `exportDevtoolsEvidencePackage` 在读取阶段统一调用 `materializeDirtyEvidenceEventRef`，让 live/import 共享同一物化函数，同时不放大 ingest 开销。

### 3) 静态 IR 变更会刷新快照 token

`registerConvergeStaticIr` 在 digest 首次注册或更新时触发 token 刷新。  
这样已有 ring 事件在下一次 snapshot/export 读取时会按最新 `fieldPaths` 物化，保持口径一致。

### 4) evidence summary 增加 dirtyEvidence 证据块

`exportDevtoolsEvidencePackage` 的 `summary` 新增：

- `summary.dirtyEvidence.pipeline = "single-materialization-v1"`
- `summary.dirtyEvidence.stateUpdate`
- `summary.dirtyEvidence.traitConverge`

用于离线核对“总事件数 vs 已物化 rootPaths 事件数”。

### 5) Debug 对外类型补齐

`Debug.ts` 增加导出：

- `DirtyEvidenceMaterializationSliceSummary`
- `DirtyEvidenceMaterializationSummary`
- `materializeDirtyEvidenceEventRef`

## 贴边证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4b-dirty-materialization.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4b-dirty-materialization.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-4b-dirty-materialization.diff.json`

关键结论：

1. `state:update` live 事件已直接携带 `dirtySet.rootPaths`（由 `pathIds` 物化）。
2. `trait:converge` live 事件已直接携带 `dirty.rootPaths`（由 `rootIds` 物化）。
3. evidence summary 可直接给出 dirty 物化覆盖度，不再只靠导入侧推断。
4. live 与 import 口径可通过同一字段集合核对，不再依赖前端额外分支逻辑才能看见 rootPaths。

## 最小验证

已执行：

1. `pnpm -C packages/logix-core typecheck:test`
2. `pnpm -C packages/logix-core exec vitest run test/Debug/DevtoolsHub.test.ts test/Debug/Debug.DiagnosticsLevels.test.ts`
3. `pnpm exec tsx <p2-4b synthetic dirty materialization probe>`
4. `python3 fabfile.py probe_next_blocker --json`

结果：

- `logix-core` 类型检查通过。
- devtools/dirty-evidence 贴边测试通过（14/14）。
- synthetic 探针确认 `state:update` 与 `trait:converge` 均已物化 `rootPaths`，`summary.dirtyEvidence` 可用。
- `probe_next_blocker` 为 `clear`，current probe 队列未打红。
