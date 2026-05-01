# Data Model: Platform Layered Map Convergence

## 1. `LayerRecord`

| Field | Type | Description |
| --- | --- | --- |
| `layer` | string | 分层名 |
| `codeRoots` | string[] | 主要代码落点 |
| `ownerSpec` | string | owner spec |
| `chain` | string | implementation / governance / host projection |

## 2. `UpliftGate`

| Field | Type | Description |
| --- | --- | --- |
| `proposal` | string | 层级提议 |
| `benefit` | string | 直接收益 |
| `accepted` | boolean | 是否通过 |
| `rejectionRule` | string | 拒绝条件 |
