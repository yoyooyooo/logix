# Group Checklist: Runtime Package Cutover（112 总控）

> 本清单只承接总控调度、门禁和成员跳转，不复制成员实现任务。

## Group Gates

- [x] Gate A: `113` 与 `114` 已具备 `spec / plan / research / data-model / contracts / quickstart / tasks / requirements checklist`
- [x] Gate B: `115` 已具备 kernel boundary、support matrix、reuse ledger 相关 planning artifacts
- [x] Gate C: `116`、`117`、`118` 都已具备完整 planning artifacts
- [x] Gate D: `119` 已具备 examples / verification planning artifacts

当前判断：

- Gate A 与 Gate B 已完成
- Gate C 已完成
- Gate D 已完成
- 当前这一轮 cutover 总控成员已全部收口

## Member Entry Points

| Member | Goal | Depends On | Tasks | Quickstart |
| --- | --- | --- | --- | --- |
| `113` | docs 根路由、治理、runtime / platform facts 收口 | - | [tasks.md](../113-docs-runtime-cutover/tasks.md) | [quickstart.md](../113-docs-runtime-cutover/quickstart.md) |
| `114` | package policy、处置矩阵、复用资产与 family template | - | [tasks.md](../114-package-reset-policy/tasks.md) | [quickstart.md](../114-package-reset-policy/quickstart.md) |
| `115` | kernel 边界、support matrix、core-ng 去向 | `113`, `114` | [tasks.md](../115-core-kernel-extraction/tasks.md) | [quickstart.md](../115-core-kernel-extraction/quickstart.md) |
| `116` | host family role matrix、control plane contract、package template | `114`, `115` | [tasks.md](../116-host-runtime-rebootstrap/tasks.md) | [quickstart.md](../116-host-runtime-rebootstrap/quickstart.md) |
| `117` | domain family role matrix、输出形态、package template | `114`, `115` | [tasks.md](../117-domain-package-rebootstrap/tasks.md) | [quickstart.md](../117-domain-package-rebootstrap/quickstart.md) |
| `118` | CLI 新命令面、legacy route、reuse ledger | `113`, `114`, `115` | [tasks.md](../118-cli-rebootstrap/tasks.md) | [quickstart.md](../118-cli-rebootstrap/quickstart.md) |
| `119` | examples inventory、anchor map、verification template | `113`, `115`, `116`, `117`, `118` | [tasks.md](../119-examples-verification-alignment/tasks.md) | [quickstart.md](../119-examples-verification-alignment/quickstart.md) |

## Suggested Execution Order

- [x] 先推进 `113`
- [x] 并行推进 `114`
- [x] 在 `113` 和 `114` 完成 planning gate 后推进 `115`
- [x] 在 `115` 完成后并行推进 `116`、`117`、`118`
- [x] 最后推进 `119`

## Reuse-First Gate

- [x] `115` 已登记可复用热链路与覆盖测试
- [x] `116` 已登记可复用宿主切片与 fixtures / tests
- [x] `117` 已登记可复用领域协议、helper、fixtures 与 tests
- [x] `118` 已登记可复用 CLI helper、artifact 处理与 tests
- [x] `119` 已登记可复用 scenarios、patterns、fixtures 与 tests

## Status Sync

- [x] `spec-registry.json` 中的 member 状态与各 member `spec.md` 顶部状态一致
- [x] 若 member planning artifacts 更新，回刷本清单与 `spec-registry.md`
