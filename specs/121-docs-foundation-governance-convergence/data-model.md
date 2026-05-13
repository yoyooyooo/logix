# Data Model: Docs Foundation Governance Convergence

## 1. `RootRouteRecord`

| Field | Type | Description |
| --- | --- | --- |
| `page` | string | foundation 页面 |
| `role` | string | 导航、治理或 promotion lane 角色 |
| `linksTo` | string[] | 最短跳转目标 |
| `ownerScope` | string[] | 该页承接的子树 owner 范围 |
| `writebackTrigger` | string[] | 需要回写该页的变更类型 |

## 2. `PromotionLaneRule`

| Field | Type | Description |
| --- | --- | --- |
| `source` | string | proposal / next 等来源层 |
| `target` | string | 目标目录 |
| `gate` | string | 升格条件 |
| `metadata` | string[] | 源文档必须具备的元数据 |
| `writeback` | string[] | 必须回写的入口 |
| `exitNote` | string | 源文档消费后的去向要求 |

## 3. `NextTopicRecord`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | next topic 路径 |
| `target` | string[] | 目标页 |
| `owner` | string | owner spec 或 owner page |
| `status` | string | 活跃状态 |
| `lastUpdated` | string | 最近回写日期 |
| `nextBatch` | string[] | 下一批推进 spec |

## 4. `ProposalRecord`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | proposal 路径 |
| `targetCandidates` | string[] | 候选目标目录或页面 |
| `owner` | string | owner spec 或 owner page |
| `status` | string | 当前状态 |
| `lastUpdated` | string | 最近回写日期 |
| `destination` | string[] | 被消费后的去向 |

## 5. `WritebackRuleRecord`

| Field | Type | Description |
| --- | --- | --- |
| `changeType` | string | 新增 root lane、leaf page、active topic 等 |
| `docsWriteback` | string[] | 必须回写的 docs 页面 |
| `registryWriteback` | string[] | 需要同步的 spec registry / checklist |
