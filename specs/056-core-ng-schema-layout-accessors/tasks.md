# Tasks: 056 Schema Layout Accessors（offset/typed view）

**Input**: `specs/056-core-ng-schema-layout-accessors/*`（`spec.md`/`plan.md`/`quickstart.md`）

## Phase 1: Setup（shared）

- [x] T001 [P] 补齐 spec-kit 最小产物（plan/tasks/quickstart）
- [x] T002 [P] 回写 046 registry：`056` 状态从 `idea` → `draft`
- [x] T003 创建证据落点目录（before/after/diff）`specs/056-core-ng-schema-layout-accessors/perf/`

---

## Phase 2: Implementation（schema-aware accessors）

> 目标：在 txn 内消灭 dirtyPaths 的 split/alloc 热点，并把 prefix canonicalize 下沉到 id 级算法。

- [x] T010 在 `FieldPathIdRegistry` 增加 `pathStringToId`（stringPath → pathId 快路径）
- [x] T011 重构 `dirtyPathsToRootIds`：优先使用 `pathStringToId`，并在 `pathId` 上完成 prefix canonicalize
- [x] T012 [P] 补齐测试：direct lookup + prefix canonicalize + reason precedence（invalid > missing）

---

## Phase 3: Evidence（Node + Browser）

- [x] T020 [P] 采集 before/after/diff（Node + Browser；P1 suites）并满足 `comparable=true && regressions==0`
- [x] T021 [P] 回写结论到 `specs/056-core-ng-schema-layout-accessors/quickstart.md`

---

## Phase 4: Closeout（registry）

- [x] T030 [P] 证据达标后回写 046 registry：`056` 状态更新为 `done` 并补齐证据链接
