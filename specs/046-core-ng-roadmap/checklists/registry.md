# Checklist: spec-registry 可用性（人工验收）

**Purpose**: 防止 registry 退化为“手工列表无人维护”。本清单只做“可用性验收”，不复制实现细节。

## 1) 结构与口径

- [x] 关系 SSoT：`specs/046-core-ng-roadmap/spec-registry.json` 存在（至少包含 entries/id/dir/status/dependsOn）。
- [x] 人读阐述：`specs/046-core-ng-roadmap/spec-registry.md` 存在，且包含：状态枚举、证据门禁口径、kernel support matrix 约束。
- [x] kernel 口径统一：`spec-registry.md` 明确区分 runtime kernel（045/047/048）与 Sandbox/Playground kernel（058），并写清 `defaultKernelId/availableKernelIds` 的归属与 M4 后生命周期。
- [x] `spec-registry.json` 的 `status` 仅使用约定枚举：`idea|planned|draft|implementing|done|frozen`（无私货状态）。
- [x] 明确区分：`ReadQuery/SelectorSpec`（读状态依赖与投影）≠ `@logix/query`（服务/缓存/请求）。

## 2) 条目完整性（逐行扫表）

- [x] `spec-registry.json` 每个条目都写清：依赖（dependsOn）、Status（以及在 md 中阐述类型/证据门禁/kernel matrix 预期）。
- [x] `status=draft|implementing|done|frozen` 的条目：对应 `specs/<id>/` 目录存在，且 `spec.md/plan.md/tasks.md` 至少齐全。
- [x] `status=idea|planned` 的条目：允许目录不存在，但必须在 md 中写清触发条件/依赖/证据门禁（避免“空占位”）。

## 3) 与路线图一致性（046 内部一致）

- [x] `specs/046-core-ng-roadmap/roadmap.md` 的每个里程碑，都能在 registry 里找到对应条目（或明确写成 “registry: <id> (idea|frozen)”）。
- [x] M5/M6 这类“未来可选路线”必须在 registry 登记：未创建 spec 时用 `idea|planned`；已创建但暂不启动用 `frozen`（避免 roadmap 与 registry 分叉）。

## 4) 变更纪律

- [x] 新增/调整条目时，同步更新 `specs/046-core-ng-roadmap/tasks.md` 中的维护任务（T001/T002/T003/T004）。
- [x] 若某条 spec 从 `draft` 升级为 `implementing/done/frozen`：必须能指向可落盘证据入口（perf/contract/迁移说明），否则不升。
