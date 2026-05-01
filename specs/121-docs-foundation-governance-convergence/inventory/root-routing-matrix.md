# Root Routing Matrix

## Snapshot

- Date: 2026-04-06
- Scope: `docs/README.md`, `docs/ssot/README.md`, `docs/ssot/runtime/README.md`, `docs/ssot/platform/README.md`, `docs/adr/README.md`, `docs/standards/README.md`, `docs/next/README.md`, `docs/proposals/README.md`, `docs/standards/docs-governance.md`
- Goal: 固定 foundation 页的角色、最短跳转和 owner 路由

## Matrix

| Page | Primary Role | Short Answer | Directs To | Owner Scope | Writeback Trigger |
| --- | --- | --- | --- | --- | --- |
| `docs/README.md` | docs root navigation | 先判断内容属于 proposal、next、ssot、adr、standards 还是 archive | `docs/proposals/`、`docs/next/`、`docs/ssot/`、`docs/adr/`、`docs/standards/`、`docs/archive/` | root lane 与 active next topic | root lane 变化、active next topic 变化 |
| `docs/ssot/README.md` | stable facts root | 稳定事实继续进 `runtime/` 还是 `platform/` | `docs/ssot/runtime/README.md`、`docs/ssot/platform/README.md` | runtime / platform 子树 | 新增或删除子树、子树 owner 路由变化 |
| `docs/ssot/runtime/README.md` | runtime subtree navigation | runtime 事实该落哪一页 | runtime `01` 到 `09` | `122`、`123`、`124`、`125`、`126`、`127` | 新增、删除、重排 runtime leaf pages |
| `docs/ssot/platform/README.md` | platform subtree navigation | platform 结构事实该落哪一页 | platform `01` 到 `02` | `128`、`129` | 新增、删除、重排 platform leaf pages |
| `docs/adr/README.md` | accepted ADR root | 当前重大裁决看哪一页 | accepted ADR pages | accepted ADR index | 新增 ADR 或根裁决入口变化 |
| `docs/standards/README.md` | standards root | 当前统一规则与护栏看哪一页 | governance / baseline / guardrails / naming bucket | cross-cutting standards | 新增标准页或标准页重命名 |
| `docs/proposals/README.md` | proposal lane navigation | 主方向未定时写哪里 | active proposals、promotion targets | active proposals | 新增、消费或清空 proposal |
| `docs/next/README.md` | next topic navigation | 主方向已定、待升格专题看哪里 | active next topics | active next topics | 新增、完成或重排 next topics |
| `docs/standards/docs-governance.md` | single execution protocol | 升格门槛、元数据、回写动作看哪里 | all foundation pages | route / promotion / writeback rules | 路由规则、元数据规则、回写协议变化 |

## Findings

- foundation 页面继续只承接路由、治理和 owner 路由，不承接 leaf 业务事实
- runtime / platform 子树 README 已纳入 `121`，owner 路由不再悬空
- `docs/standards/docs-governance.md` 保持唯一执行协议，根 README 不回流执行细则
