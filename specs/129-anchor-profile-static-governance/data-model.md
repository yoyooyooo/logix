# Data Model: Anchor Profile Static Governance

## 1. `StaticRoleRecord`

| Field | Type | Description |
| --- | --- | --- |
| `role` | string | 静态角色 |
| `benefit` | string | 保留收益 |
| `status` | string | keep / postpone / drop |
| `owner` | string | structure owner page |

## 2. `NamingReopenRecord`

| Field | Type | Description |
| --- | --- | --- |
| `term` | string | 命名条目 |
| `currentNarrative` | string | 当前口径 |
| `reopenCondition` | string | 重开条件 |
| `owner` | string | owner page |
