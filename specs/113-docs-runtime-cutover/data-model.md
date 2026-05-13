# Data Model: Docs Runtime Cutover

## 1. `DocRootSection`

描述 docs 根入口或子树入口的导航节点。

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | README 所在路径 |
| `role` | enum | `root-nav` / `subtree-nav` / `governance` / `promotion-lane` |
| `ownedBy` | string | 该节点负责的主要职责 |
| `mustLinkTo` | string[] | 必须直达的相邻事实源 |

## 2. `RuntimePageResponsibility`

描述 runtime / platform 页面在新 docs 树中的唯一职责。

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | 页面路径 |
| `cluster` | enum | `runtime-core` / `runtime-boundary` / `platform` |
| `responsibility` | string | 该页承接的唯一主职责 |
| `adjacentPages` | string[] | 需要互相引用的相邻页面 |
| `promotionSink` | string | 若仍有 followup，未来回写目标 |

## 3. `PromotionLaneItem`

描述从 `proposal` / `next` 到事实源的承接项。

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | followup 标题 |
| `status` | enum | `open` / `blocked` / `promoted` |
| `target` | string | 未来升格到的页面 |
| `owner` | string | 当前 owner |
| `lastUpdated` | string | 最近更新时间 |
| `blocker` | string | 未升格原因 |

## 4. `GovernanceRule`

描述 docs 路由和升格协议中的强规则。

| Field | Type | Description |
| --- | --- | --- |
| `ruleId` | string | 规则编号 |
| `scope` | string | 作用范围 |
| `requiredAction` | string | 必须执行的动作 |
| `forbiddenAction` | string | 明确禁止的动作 |

## Relationship Notes

- `DocRootSection` 负责把人导向 `RuntimePageResponsibility`
- `GovernanceRule` 约束 `DocRootSection` 与 `PromotionLaneItem`
- `PromotionLaneItem` 最终回写到某个 `RuntimePageResponsibility`
