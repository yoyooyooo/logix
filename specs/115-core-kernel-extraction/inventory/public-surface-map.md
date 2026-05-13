# Inventory: Public Surface Map

## Goal

把稳定公开面映射回目标 zone，提前说明哪些入口继续保留，哪些只保留 expert 身份。

## Map

| Public Entry | Backing Zone | Status | Notes |
| --- | --- | --- | --- |
| `Module.ts` | `runtime-shell` | `keep` | 继续作为 canonical 主链入口 |
| `Logic.ts` | `runtime-shell` | `keep` | 继续作为 canonical 主链入口 |
| `Runtime.ts` | `runtime-shell` | `keep` | 继续承接公开运行时与装配语义 |
| `Kernel.ts` | `kernel` | `keep` | 显式暴露最小内核入口 |
| `Observability.ts` | `observability` | `keep` | 对外暴露标准观测/验证入口 |
| `Reflection.ts` | `reflection` | `keep` | 对外暴露 manifest/static IR/control surface 相关入口 |
| `Process.ts` | `process` | `keep` | 保留公开 process 入口 |
| `FieldKernel.ts` | `kernel` | `expert-only` | field-kernel expert 入口，不回 canonical 主链 |
| `Workflow.ts` | `reflection` | `shrink` | 当前只保留历史/局部原型语境，继续收缩 |
| `ReadQuery.ts` | `kernel` | `keep` | 热链路相关，继续保留为主线配套入口 |

## Reading

- canonical 主链继续围绕 `Module / Logic / Program / Runtime`
- `Kernel.ts` 是新增显式内核入口
- expert 家族继续存在，但不回到默认作者面
